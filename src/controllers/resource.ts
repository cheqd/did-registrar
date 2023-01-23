import { Request, Response } from 'express'
import { check, param, validationResult } from 'express-validator'

import { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2'
import { ISignInputs } from '@cheqd/sdk/build/types'
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'

import { v4 } from 'uuid'
import { toString } from 'uint8arrays'

import { CheqdRegistrar, CheqdResolver, NetworkType } from '../service/cheqd'
import { IResourceCreateRequest, IState } from '../types/types'
import { Messages } from '../types/constants'
import { convertToSignInfo } from '../helpers/helpers'
import { Responses } from '../helpers/response'
import { LocalStore } from './store'

export class ResourceController {

    public static createValidator = [
        check('name').exists().isString().withMessage('Resource name is required'),
        check('type').exists().isString().withMessage('Resource type is required'),
        param('did').exists().isString().contains('did:cheqd').withMessage('DID is required'),
    ]

    public async create(request: Request, response: Response) {

        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json(Responses.GetInvalidResourceResponse({}, request.body.secret, result.array()[0].msg))
        }

        const { did } = request.params
        
        let { jobId, data, name, type, mimeType, alsoKnownAs, version, secret } = request.body as IResourceCreateRequest

        // check if did is registered on the ledger
        let resolvedDocument = await CheqdResolver(did)

        if(!resolvedDocument?.didDocument) {
            return response.status(400).send(Responses.GetInvalidResponse(
                {id: did}, 
                secret, 
                Messages.DidNotFound
            ))
        }
        
        let resourcePayload: MsgCreateResourcePayload
        // Validate and get store data if any
        if(jobId) {
            const storeData = LocalStore.instance.getResource(jobId)
            if(!storeData) {
                return response.status(400).json(Responses.GetJobExpiredResponse(jobId))
            } else if (storeData.state == IState.Finished) {
                return response.status(201).json({
                    jobId,
                    resourceState: {
                        resourceId: storeData.resource.id,
                        state: "finished",
                        secret,
                        resource: storeData.resource
                    }
                })
            }

            resourcePayload = storeData.resource
        } else if (!data) {
            return response.status(400).json(Responses.GetInvalidResourceResponse({}, secret, Messages.InvalidResource))
        } else {
            jobId = v4()

            if(mimeType == 'json') {
                data = JSON.stringify(data)
            }

            resourcePayload = {
                collectionId: did.split(':').pop()!,
                id: v4(),
                name,
                resourceType: type,
                data: Buffer.from(data),
                version,
                alsoKnownAs: alsoKnownAs || []
            }
        }
        
        let signInputs: ISignInputs[] | SignInfo[]
        
        if (secret.signingResponse ||  secret.keys) {
            signInputs = secret.signingResponse ? convertToSignInfo(secret.signingResponse) : secret.keys!
        } else {
            LocalStore.instance.setResource(jobId, {resource: resourcePayload, state: IState.Action})
            return response.status(200).json(Responses.GetResourceActionSignatureResponse(
                jobId, 
                resolvedDocument.verificationMethod, 
                resourcePayload
            ))
        }

        await CheqdRegistrar.instance.connect(NetworkType.Testnet)

        try {
            const result = await CheqdRegistrar.instance.createResource(signInputs, resourcePayload)
            if ( result.code == 0 ) {
                return response.status(201).json(Responses.GetResourceSuccessResponse(jobId, secret, resourcePayload))
            } else {
                return response.status(400).json(Responses.GetInvalidResourceResponse(resourcePayload, secret, Messages.InvalidResource))
            }
        } catch (error) {
            return response.status(500).json({
                jobId,
                resourceState: {
                    state: IState.Failed,
                    reason: Messages.Internal,
                    description: Messages.TryAgain + error,
                    secret,
                    resourcePayload
                }
            })
        }
    }
}