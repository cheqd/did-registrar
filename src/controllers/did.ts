import { Request, Response } from 'express'
import { validationResult, check } from 'express-validator'

import { ISignInputs, MsgCreateDidPayload, MsgDeactivateDidPayload } from '@cheqd/sdk/build/types'
import { MsgCreateDidDocPayload, SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'

import { v4 } from 'uuid'

import { convertToSignInfo } from '../helpers/helpers'
import { Responses } from '../helpers/response'
import { CheqdRegistrar, CheqdResolver, NetworkType } from '../service/cheqd'
import { Messages } from '../types/constants'
import { DidDocumentOperation, IdentifierPayload, IDIDCreateRequest, IDIDUpdateRequest, IState } from '../types/types'
import { LocalStore } from './store'

export class DidController {

    public static secretValidator = [
        check('secret').optional().custom((value)=>{
            if (value) {
                if(value.seed && value.keys) return false
                else if (value.seed && value.signingResponse) return false
                else if (value.keys && value.sigingResponse) return false
                else if(value.seed && value.seed.length != 32 ) return false
                else if(value.keys) {
                    return value.keys.every((key: any) => key.privateKeyHex.length == 128
                )} else {
                    return true
                }
            }

            return true
        }).withMessage(Messages.SecretValidation),
    ]

    public static createValidator = [
        check('didDocument').custom((value, {req})=>{
            if((!value || !value.verificationMethod?.length) && !req.body.jobId) return false
            return true
        }).withMessage(Messages.InvalidDidDocument)
    ]

    public static updateValidator = [
        check('didDocument').custom((value, {req})=>{
            if((!value || !value.length || !value[0].verificationMethod.length) && !req.body.jobId) return false
            return true
        }).withMessage(Messages.InvalidDidDocument),
        check('did').optional().isString().withMessage(Messages.InvalidDid).contains('did:cheqd:').withMessage(Messages.InvalidDid),
        check('didDocumentOperation').optional().isArray().custom((value) => value[0] === DidDocumentOperation.Set && value.length == 1 ).withMessage('Only Set operation is supported')
    ]

    public static deactivateValidator = [
        check('did').custom((value, {req})=>{
            if(!value && !req.body.jobId) return false
            return true
        }).withMessage(Messages.InvalidDid)
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
        
        let {jobId, secret={}, options, didDocument} = request.body as IDIDCreateRequest

        // Validate and get store data if any
        if(jobId) {
            const storeData = LocalStore.instance.getItem(jobId)
            if(!storeData) {
                return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
            } else if (storeData.state == IState.Finished) {
                return response.status(201).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
            }

            didDocument = storeData.didDocument
        } else {
            jobId = v4()
        }
        
        let signInputs: ISignInputs[] | SignInfo[]
        
        if (secret.signingResponse ||  secret.keys) {
            signInputs = secret.signingResponse ? convertToSignInfo(secret.signingResponse) : secret.keys!
        } else {
            LocalStore.instance.setItem(jobId, {didDocument, state: IState.Action})
            return response.status(200).json(Responses.GetDIDActionSignatureResponse(jobId, didDocument))
        }

        const networkType = options?.network || ((didDocument.id!.split(':'))[2] === NetworkType.Testnet ? NetworkType.Testnet : NetworkType.Mainnet)

        try {
            await CheqdRegistrar.instance.connect(networkType)
            const result = await CheqdRegistrar.instance.create(signInputs, didDocument)
            if ( result.code == 0 ) {
                LocalStore.instance.setItem(jobId, {didDocument, state: IState.Finished})
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

        let { jobId, secret={}, options, didDocument, did } = request.body as IDIDUpdateRequest 

        let updatedDocument: IdentifierPayload = {}
        try {
            if (!jobId) {
                // check if did is registered on the ledger
                let resolvedDocument = await CheqdResolver(did)
                
                if(!resolvedDocument?.didDocument) {
                    return response.status(400).send(Responses.GetInvalidResponse(
                        {id: did}, 
                        secret, 
                        Messages.DidNotFound
                    ))
                }

                updatedDocument = didDocument[0]
                updatedDocument.versionId = v4()
                jobId = v4()
            } else {
                const storeData = LocalStore.instance.getItem(jobId)
                if(!storeData) {
                    return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
                } else if (storeData.state == IState.Finished) {
                    return response.status(200).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
                }

                updatedDocument = storeData.didDocument
                did = updatedDocument.id!
            }

            let signInputs: ISignInputs[] | SignInfo[]
            if (secret.signingResponse ||  secret.keys) {
                signInputs = secret.signingResponse ? convertToSignInfo(secret.signingResponse) : secret.keys!
            } else {
                LocalStore.instance.setItem(jobId, {didDocument: updatedDocument, state: IState.Action})
                return response.status(200).json(Responses.GetDIDActionSignatureResponse(jobId, updatedDocument))
            }

            await CheqdRegistrar.instance.connect(options?.network || (did.split(':'))[2])
            const result = await CheqdRegistrar.instance.update(signInputs, updatedDocument)
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
                {}, 
                request.body.secret, 
                result.array()[0].msg
            ))
        }

        let { jobId, secret={}, options, did } = request.body as IDIDUpdateRequest

        let payload: MsgDeactivateDidPayload
        try {
            if(jobId) {
                const storeData = LocalStore.instance.getItem(jobId)
                if(!storeData) {
                    return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
                } else if (storeData.state == IState.Finished) {
                    return response.status(201).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
                }

                payload = storeData.didDocument as MsgDeactivateDidPayload
                did =  storeData.didDocument.id!
            } else {
                jobId = v4()
                
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
                    versionId: v4(),
                    id: resolvedDocument.didDocument.id
                }
            }

            let signInputs: ISignInputs[] | SignInfo[]
            if (secret.signingResponse ||  secret.keys) {
                signInputs = secret.signingResponse ? convertToSignInfo(secret.signingResponse) : secret.keys!
            } else {
                LocalStore.instance.setItem(jobId, {didDocument: payload, state: IState.Action})
                return response.status(200).json(Responses.GetDeactivateDidSignatureResponse(jobId, payload))
            }

            await CheqdRegistrar.instance.connect(options?.network || (did.split(':'))[2])
            const result = await CheqdRegistrar.instance.deactivate(signInputs, payload)
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