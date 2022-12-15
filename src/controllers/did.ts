import { IKeyPair, ISignInputs } from '@cheqd/sdk/build/types'
import { createDidPayloadWithSignInputs, createSignInputsFromKeyPair } from '@cheqd/sdk/build/utils'
import { MsgCreateDidDocPayload } from '@cheqd/ts-proto/cheqd/did/v2'
import { Request, Response } from 'express'
import { validationResult, check } from 'express-validator'
import { jsonConcat, jsonSubtract, randomStr } from '../helpers/helpers'
import { CheqdRegistrar, CheqdResolver } from '../service/cheqd'
import { DidDocumentOperation, IDIDCreateRequest, IDIDUpdateRequest } from '../types/types'

export class DidController {

    public static createValidator = [
        check('secret').custom((value)=>{
            if (value) {
                if(value.seed && value.keys) return false
                else if(value.seed && value.seed.length != 32 ) return false
            }
            return true
        }).withMessage('Only one of seed or keys should be provided, Seed length should be 32')
    ]

    public static updateValidator = [
        check('didDocument').isArray().withMessage('didDocument is required'),
        check('secret').isObject().custom((value) => value.keys).withMessage('secret with keys is required'),
        check('did').isString().contains('did:cheqd:').withMessage('cheqd DID is required'),
        check('didDocumentOperation').optional().isArray().custom((value) => value.includes(DidDocumentOperation.Set) ? value.length==1 : value.length<=2 ).withMessage('Set operation can\'t be used with Add/Remove')
    ]

    public async create(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json({
                message: result.array()[0].msg
            })
        }
        
        let {secret, options, didDocument} = request.body as IDIDCreateRequest
        
        secret = secret || { seed: randomStr() }
        
        await CheqdRegistrar.instance.connect(options?.network)
        
        let didPayload: Partial<MsgCreateDidDocPayload>, signInputs: ISignInputs[], keys: IKeyPair[]
        if (didDocument && secret.keys) {
            didPayload = didDocument
            signInputs = createSignInputsFromKeyPair(didDocument, secret.keys)
            keys = secret.keys
        } else {
            const response = createDidPayloadWithSignInputs(secret.seed, secret.keys)
            didPayload = response.didPayload
            signInputs = response.signInputs
            keys = response.keys
        }

        try {
            const result = await CheqdRegistrar.instance.create(signInputs, didPayload)
            if ( result.code == 0 ) {
                return response.status(201).json({
                    jobId: null,
                    didState: {
                    did: didPayload.id,
                    state: "finished",
                    secret: { keys },
                    didDocument: didPayload
                    }
                })
            } else {
                return response.status(404).json({
                    message: `Invalid payload: ${JSON.stringify(result.rawLog)}`
                })
            }
        } catch (error) {
            return response.status(500).json({
                message: `Internal server error: ${error}`
            })
        }

    }

    public async update(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json({
                message: result.array()[0].msg
            })
        }

        const { secret, options, didDocument, didDocumentOperation=[DidDocumentOperation.Set], did } = request.body as IDIDUpdateRequest 
        await CheqdRegistrar.instance.connect(options?.network)
        // check if did is registered on the ledger
        let resolvedDocument = await CheqdResolver(did)
        if(!resolvedDocument?.didDocument) {
            return response.status(400).send({
                message: `${did} DID not found`
            })
        }
        console.log(didDocumentOperation)
        var i=0
        let updatedDocument = resolvedDocument.didDocument
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
        updatedDocument.versionId = resolvedDocument.didDocumentMetadata.versionId

        try {
            const signInputs = createSignInputsFromKeyPair(updatedDocument, secret.keys)
            await CheqdRegistrar.instance.update(signInputs, updatedDocument)
            return response.status(201).json({
                jobId: null,
                didState: {
                    did: updatedDocument.id,
                    state: "finished",
                    secret,
                    didDocument: updatedDocument
                }
            })
        } catch (error) {
            return response.status(500).json({
                message: `Internal server error: ${error}`
            })
        }
    }
}