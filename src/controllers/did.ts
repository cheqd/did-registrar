import { ISignInputs } from '@cheqd/sdk/build/types'
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'
import { Request, Response } from 'express'
import { validationResult, check } from 'express-validator'
import { jsonConcat, jsonSubtract, randomStr } from '../helpers/helpers'
import { Responses } from '../helpers/response'
import { CheqdRegistrar, CheqdResolver } from '../service/cheqd'
import { Messages } from '../types/constants'
import { DidDocumentOperation, IDIDCreateRequest, IDIDUpdateRequest } from '../types/types'
import { v4 } from 'uuid'

export class DidController {

    public static createValidator = [
        check('secret').custom((value)=>{
            if (value) {
                if(value.seed && value.keys) return false
                else if (value.seed && value.signingResponse) return false
                else if (value.keys && value.sigingResponse) return false
                else if(value.seed && value.seed.length != 32 ) return false
                else {
                    return value.keys.every((key: any) => key.privateKeyHex.length == 128
                )}
            }
            return true
        }).withMessage('Only one of seed,keys and signingResponse should be provided, Seed length should be 32, Keypair should be valid')
    ]

    public static updateValidator = [
        check('didDocument').isArray().withMessage('didDocument is required'),
        check('secret').isObject().custom((value) => value.keys || value.signingResponse).withMessage('secret with keys or signingResponse is required'),
        check('did').isString().contains('did:cheqd:').withMessage('cheqd DID is required'),
        check('didDocumentOperation').optional().isArray().custom((value) => value.includes(DidDocumentOperation.Set) ? value.length==1 : value.length<=2 ).withMessage('Set operation can\'t be used with Add/Remove')
    ]

    public async create(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(Responses.GetInvalidResponse(request.body.didDocument, request.body.secret, result.array()[0].msg))
        }
        
        let {secret, options, didDocument} = request.body as IDIDCreateRequest
        
        await CheqdRegistrar.instance.connect(options?.network)
        
        let signInputs: ISignInputs[] | SignInfo[]
        
        if (secret.signingResponse ||  secret.keys) {
            signInputs = secret.signingResponse || secret.keys!
        } else {
            return response.status(400).json(Responses.GetDIDActionSignatureResponse(didDocument))
        }

        try {
            const result = await CheqdRegistrar.instance.create(signInputs, didDocument)
            if ( result.code == 0 ) {
                return response.status(201).json({
                    jobId: null,
                    didState: {
                        did: didDocument.id,
                        state: "finished",
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

        const { secret, options, didDocument, didDocumentOperation=[DidDocumentOperation.Set], did } = request.body as IDIDUpdateRequest 
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

        var i=0
        let updatedDocument = resolvedDocument.didDocument
        updatedDocument.context = []
        for (var operation of didDocumentOperation) {
            switch (operation) {
                case DidDocumentOperation.Set:
                    // TODO: validate didDocument schema
                    updatedDocument = didDocument[i]
                    break
                case DidDocumentOperation.Add:
                    updatedDocument = jsonConcat(updatedDocument, didDocument[i])
                    break
                case DidDocumentOperation.Remove:
                    updatedDocument = jsonSubtract(updatedDocument, didDocument[i])
                    break
            }
            i++
        }
        updatedDocument.versionId = v4()

        try {
            const result = await CheqdRegistrar.instance.update(secret.signingResponse || secret.keys!, updatedDocument)
            if ( result.code == 0 ) {
                return response.status(201).json(Responses.GetSuccessResponse(updatedDocument, secret))
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
        const { secret, options, did } = request.body as IDIDUpdateRequest
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

        try {
            const result = await CheqdRegistrar.instance.deactivate(secret.signingResponse || secret.keys!, {
                verificationMethod: resolvedDocument.didDocument.verificationMethod,
                versionId: v4(),
                id: did
            })
            if ( result.code == 0 ) {
                return response.status(201).json(Responses.GetSuccessResponse(
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