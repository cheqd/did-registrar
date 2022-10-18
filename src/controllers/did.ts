import { createDidPayloadWithSignInputs, createUpdateDidPayloadWithSignInputs } from '@cheqd/sdk/build/utils'
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
                else if(value.seed?.length != 32 ) return false
            }
            return true
        }).withMessage('Only one of seed or keys should be provided, Seed length should be 32')
    ]

    public static updateValidator = [
        check('didDocument').isArray().withMessage('didDocument is required'),
        check('secret').isObject().custom((value) => value.keys).withMessage('secret with keys is required'),
        check('did').isString().contains('did:cheqd:').withMessage('cheqd DID is required')
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
        let { didPayload, keys, signInputs } = createDidPayloadWithSignInputs(secret.seed, secret.keys)
        if (didDocument) didPayload = jsonConcat(didPayload, didDocument)
        await CheqdRegistrar.instance.create(signInputs, didPayload)

        return response.status(201).json({
            jobId: null,
            didState: {
              did: didPayload.id,
              state: "finished",
              secret: { keys },
              didDocument: didPayload
            }
        })
    }

    public async update(request: Request, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json({
                message: result.array()[0].msg
            })
        }

        const { secret, options, didDocument, didDocumentOperation, did } = request.body as IDIDUpdateRequest 
        await CheqdRegistrar.instance.connect(options?.network)
        // check if did is registered on the ledger
        let resolvedDocument = await CheqdResolver(did)
        if(!resolvedDocument?.didDocument) {
            return response.status(400).send({
                message: `${did} DID not found`
            })
        }
        var i=0
        for (var operation of didDocumentOperation) {
            switch (operation) {
                case DidDocumentOperation.Set:
                    didDocument[i].versionId = resolvedDocument.didDocumentMetadata.versionId
                    resolvedDocument = didDocument
                    break
                case DidDocumentOperation.Add:
                    resolvedDocument = jsonConcat(resolvedDocument.didDocument, didDocument)
                    break
                case DidDocumentOperation.Remove:
                    resolvedDocument = jsonSubtract(resolvedDocument.didDocument, didDocument)
                    break
            }
            i++
        }

        const {didDocument: didPayload, signInputs} = await createUpdateDidPayloadWithSignInputs(resolvedDocument, secret.keys)

        await CheqdRegistrar.instance.update(signInputs, didPayload)

        return response.status(201).json({
            jobId: null,
            didState: {
                did: didPayload.id,
                state: "finished",
                secret,
                didDocument: didPayload
            }
        })
    }
}