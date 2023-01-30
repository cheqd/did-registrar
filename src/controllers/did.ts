import { Request, Response } from 'express'
import { validationResult, check } from 'express-validator'

import { DIDDocument } from '@cheqd/sdk/build/types'
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'

import { v4 } from 'uuid'

import { convertToSignInfo, validateSpecCompliantPayload } from '../helpers/helpers'
import { Responses } from '../helpers/response'
import { CheqdRegistrar, CheqdResolver, NetworkType } from '../service/cheqd'
import { Messages } from '../types/constants'
import { DidDocumentOperation, IDIDCreateRequest, IDIDUpdateRequest, IState } from '../types/types'
import { LocalStore } from './store'

export class DidController {

    public static didDocValidator = [
        check('didDocument').custom((value, {req})=>{
            if(!req.body.jobId && value) {
                const {valid} = validateSpecCompliantPayload(value)
                return valid
            }
            return true
        }).withMessage(Messages.InvalidDidDocument),
        check('options.versionId').optional().isString().withMessage(Messages.InvalidOptions),
        check('secret.signingResponse').optional().isArray().withMessage(Messages.InvalidSecret),
        check('secret.signingResponse.*.signature').isString().withMessage(Messages.InvalidSecret),
        check('secret.signingResponse.*.verificationMethodId').isString().withMessage(Messages.InvalidSecret)
    ]

    public static updateValidator = [
        check('jobId').custom((value, {req})=>value || (req.body.did && req.body.didDocument)).withMessage(Messages.Invalid),
        check('did').optional().isString().withMessage(Messages.InvalidDid).contains('did:cheqd:').withMessage(Messages.InvalidDid),
        check('didDocumentOperation').optional().isArray().custom((value) => value[0] === DidDocumentOperation.Set && value.length == 1 ).withMessage('Only Set operation is supported')
    ]

    public static deactivateValidator = [
        check('did').custom((value, {req})=>{
            if(!value && !req.body.jobId) return false
            return true
        }).withMessage(Messages.InvalidDid),
        check('did').optional().isString().withMessage(Messages.InvalidDid).contains('did:cheqd:').withMessage(Messages.InvalidDid)
    ]

    public async create(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(Responses.GetInvalidResponse(
                request.body.didDocument, 
                request.body.secret, 
                result.array()[0].msg
            ))
        }
        
        let {jobId, secret={}, options={}, didDocument} = request.body as IDIDCreateRequest
        let versionId: string
        // Validate and get store data if any
        if(jobId) {
            const storeData = LocalStore.instance.getItem(jobId)
            if(!storeData) {
                return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
            } else if (storeData.state == IState.Finished) {
                return response.status(201).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
            }

            didDocument = storeData.didDocument
            versionId = storeData.versionId
        } else {
            jobId = v4()
            versionId = options.versionId || v4()
        }
        
        let signInputs: SignInfo[]
        
        if (secret.signingResponse) {
            signInputs = convertToSignInfo(secret.signingResponse)
        } else {
            LocalStore.instance.setItem(jobId, {didDocument, state: IState.Action, versionId})
            return response.status(200).json(await Responses.GetDIDActionSignatureResponse(jobId, didDocument, versionId))
        }

        options.network = options?.network || ((didDocument.id!.split(':'))[2] as NetworkType)
        
        try {
            await CheqdRegistrar.instance.connect(options)
            const result = await CheqdRegistrar.instance.create(signInputs, didDocument, versionId)
            if ( result.code == 0 ) {
                LocalStore.instance.setItem(jobId, {didDocument, state: IState.Finished, versionId})
                return response.status(201).json({
                    jobId,
                    didState: {
                        did: didDocument.id,
                        state: IState.Finished,
                        secret,
                        didDocument
                    }
                })
            } else {
                return response.status(400).json(Responses.GetInvalidResponse(didDocument, secret, JSON.stringify(result.rawLog)))
            }
        } catch (error) {
            return response.status(500).json(Responses.GetInternalErrorResponse(didDocument, secret, error as string))
        }
    }

    public async update(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(Responses.GetInvalidResponse(
                request.body.didDocument, 
                request.body.secret, 
                result.array()[0].msg
            ))
        }

        let { jobId, secret={}, options={}, didDocument, did } = request.body as IDIDUpdateRequest 

        let updatedDocument: DIDDocument | undefined
        let versionId: string
        try {
            if (!jobId) {
                // check if did is registered on the ledger
                let resolvedDocument = await CheqdResolver(did)
                
                if(!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
                    return response.status(400).send(Responses.GetInvalidResponse(
                        {id: did}, 
                        secret, 
                        Messages.DidNotFound
                    ))
                }

                updatedDocument = didDocument[0]
                jobId = v4()
                versionId = options.versionId || v4()
            } else {
                const storeData = LocalStore.instance.getItem(jobId)
                if(!storeData) {
                    return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
                } else if (storeData.state == IState.Finished) {
                    return response.status(200).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
                }

                updatedDocument = storeData.didDocument
                versionId = storeData.versionId
                did = updatedDocument.id!
            }

            let signInputs: SignInfo[]
            if (secret.signingResponse) {
                signInputs = convertToSignInfo(secret.signingResponse)
            } else {
                LocalStore.instance.setItem(jobId, {didDocument: updatedDocument, state: IState.Action, versionId})
                return response.status(200).json(await Responses.GetDIDActionSignatureResponse(jobId, updatedDocument, versionId))
            }

            options.network = options?.network || (did!.split(':'))[2] as NetworkType
            await CheqdRegistrar.instance.connect(options)
            const result = await CheqdRegistrar.instance.update(signInputs, updatedDocument, versionId)
            if ( result.code == 0 ) {
                return response.status(201).json(Responses.GetSuccessResponse(jobId, updatedDocument, secret))
            } else {
                return response.status(400).json(Responses.GetInvalidResponse(
                    updatedDocument, 
                    secret, 
                    JSON.stringify(result.rawLog)
                ))
            }
        } catch (error) {
            return response.status(500).json(Responses.GetInternalErrorResponse(updatedDocument, secret, error as string))
        }
    }

    public async deactivate (request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(Responses.GetInvalidResponse(
                undefined, 
                request.body.secret, 
                result.array()[0].msg
            ))
        }

        let { jobId, secret={}, options, did } = request.body as IDIDUpdateRequest

        let payload: DIDDocument
        let versionId: string
        try {
            if(jobId) {
                const storeData = LocalStore.instance.getItem(jobId)
                if(!storeData) {
                    return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
                } else if (storeData.state == IState.Finished) {
                    return response.status(201).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
                }

                payload = storeData.didDocument
                did =  storeData.didDocument.id!
                versionId = storeData.versionId
            } else {
                jobId = v4()
                versionId = options.versionId || v4()
                // check if did is registered on the ledger
                let resolvedDocument = await CheqdResolver(did)
                
                if(!resolvedDocument?.didDocument) {
                    return response.status(400).send(Responses.GetInvalidResponse(
                        {id: did}, 
                        secret, 
                        Messages.DidNotFound
                    ))
                }

                payload = {
                    verificationMethod: resolvedDocument.didDocument.verificationMethod,
                    id: resolvedDocument.didDocument.id
                }
            }

            let signInputs: SignInfo[]
            if (secret.signingResponse) {
                signInputs = convertToSignInfo(secret.signingResponse)
            } else {
                LocalStore.instance.setItem(jobId, {didDocument: payload, state: IState.Action, versionId})
                return response.status(200).json(Responses.GetDeactivateDidSignatureResponse(jobId, payload, versionId))
            }

            options.network = options?.network || ((did!.split(':'))[2] as NetworkType)
            await CheqdRegistrar.instance.connect(options)
            const result = await CheqdRegistrar.instance.deactivate(signInputs, payload, v4())
            if ( result.code == 0 ) {
                return response.status(201).json(Responses.GetSuccessResponse(
                    jobId,
                    {id: did},
                    secret
                ))
            } else {
                return response.status(400).json(Responses.GetInvalidResponse(
                    {id: did}, 
                    secret, 
                    JSON.stringify(result.rawLog)
                ))
            }
        } catch (error) {
            return response.status(500).json(Responses.GetInternalErrorResponse({id: did}, secret, error as string))
        }
    }
}