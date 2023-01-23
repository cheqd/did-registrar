import { Request, Response } from 'express'
import { validationResult, check } from 'express-validator'

import { ISignInputs } from '@cheqd/sdk/build/types'
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'

import { v4 } from 'uuid'

import { convertToSignInfo } from '../helpers/helpers'
import { Responses } from '../helpers/response'
import { CheqdRegistrar, CheqdResolver } from '../service/cheqd'
import { Messages } from '../types/constants'
import { DidDocumentOperation, IDIDCreateRequest, IDIDUpdateRequest, IState } from '../types/types'
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
        }).withMessage(Messages.SecretValidation)
    ]

    public static updateValidator = [
        check('didDocument').isArray().withMessage('didDocument is required'),
        check('did').isString().contains('did:cheqd:').withMessage('cheqd DID is required'),
        check('didDocumentOperation').optional().isArray().custom((value) => value[0] === DidDocumentOperation.Set && value.length == 1 ).withMessage('Set operation can\'t be used with Add/Remove')
    ]

    public async create(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(Responses.GetInvalidResponse(request.body.didDocument, request.body.secret, result.array()[0].msg))
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
        } else if (!didDocument) {
            return response.status(400).json(Responses.GetInvalidResponse({}, secret, Messages.DidDocument))
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

        await CheqdRegistrar.instance.connect(options?.network)

        try {
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

        let { jobId, secret, options, didDocument, didDocumentOperation=[DidDocumentOperation.Set], did } = request.body as IDIDUpdateRequest 
        await CheqdRegistrar.instance.connect(options?.network)
        
        // check if did is registered on the ledger
        let resolvedDocument = await CheqdResolver(did)
        
        if(!resolvedDocument?.didDocument) {
            return response.status(400).send(Responses.GetInvalidResponse(
                {id: did}, 
                secret, 
                Messages.DidNotFound
            ))
        }

        let updatedDocument: any
        if (!jobId) {
            updatedDocument= resolvedDocument.didDocument
            updatedDocument.context = []

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
        }

        let signInputs: ISignInputs[] | SignInfo[]
        if (secret.signingResponse ||  secret.keys) {
            signInputs = secret.signingResponse ? convertToSignInfo(secret.signingResponse) : secret.keys!
        } else {
            LocalStore.instance.setItem(jobId, {didDocument: updatedDocument, state: IState.Action})
            return response.status(200).json(Responses.GetDIDActionSignatureResponse(jobId, updatedDocument))
        }

        try {
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
        let { jobId, secret, options, did } = request.body as IDIDUpdateRequest
        await CheqdRegistrar.instance.connect(options?.network)
        // check if did is registered on the ledger
        let resolvedDocument = await CheqdResolver(did)
        if(!resolvedDocument?.didDocument) {
            return response.status(400).send(Responses.GetInvalidResponse(
                {id: did}, 
                secret, 
                Messages.DidNotFound
            ))
        }

        if(jobId) {
            const storeData = LocalStore.instance.getItem(jobId)
            if(!storeData) {
                return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
            } else if (storeData.state == IState.Finished) {
                return response.status(201).json(Responses.GetSuccessResponse(jobId, storeData.didDocument, secret))
            }

            resolvedDocument = storeData.didDocument
        } else {
            jobId = v4()
        }

        let signInputs: ISignInputs[] | SignInfo[]
        if (secret.signingResponse ||  secret.keys) {
            signInputs = secret.signingResponse ? convertToSignInfo(secret.signingResponse) : secret.keys!
        } else {
            LocalStore.instance.setItem(jobId, {didDocument: resolvedDocument, state: IState.Action})
            return response.status(200).json(Responses.GetDIDActionSignatureResponse(jobId, resolvedDocument))
        }

        try {
            const result = await CheqdRegistrar.instance.deactivate(signInputs, {
                verificationMethod: resolvedDocument.didDocument.verificationMethod,
                versionId: v4(),
                id: did
            })
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