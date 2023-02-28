import type { Request, Response } from 'express'
import type { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2'
import type { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'

import { check, param, validationResult } from 'express-validator'
import { v4 } from 'uuid'
import { fromString } from 'uint8arrays'

import { CheqdRegistrar, CheqdResolver, NetworkType } from '../service/cheqd'
import { IResourceCreateRequest, IState } from '../types/types'
import { Messages } from '../types/constants'
import { convertToSignInfo } from '../helpers/helpers'
import { Responses } from '../helpers/response'
import { LocalStore } from './store'

export class ResourceController {
  public static createValidator = [
    param('did').exists().isString().contains('did:cheqd').withMessage(Messages.InvalidDid),
    check('jobId').custom((value, {req})=>{
      if(!value && !(req.body.name && req.body.type && req.body.data)) return false
      return true
    }).withMessage('name, type and data are required'),
    check('name').optional().isString().withMessage(Messages.Invalid),
    check('type').optional().isString().withMessage(Messages.Invalid),
    check('data').optional().isString().withMessage(Messages.Invalid),
    check('alsoKnownAs').optional().isArray().withMessage(Messages.Invalid),
    check('alsoKnownAs.*.uri').isString().withMessage(Messages.Invalid),
    check('alsoKnownAs.*.description').isString().withMessage(Messages.Invalid)
  ]

  public async create(request: Request, response: Response) {

    const result = validationResult(request);
    if (!result.isEmpty()) {
      return response.status(400).json(Responses.GetInvalidResourceResponse({}, request.body.secret, result.array()[0].msg))
    }

    const { did } = request.params
    let { jobId, data, name, type, alsoKnownAs, version, secret={}, options={} } = request.body as IResourceCreateRequest
    
    let resourcePayload: Partial<MsgCreateResourcePayload> = {}
    try {
      // check if did is registered on the ledger
      let resolvedDocument = await CheqdResolver(did)
      if(!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
        return response.status(400).send(Responses.GetInvalidResponse(
          {id: did}, 
          secret, 
          Messages.DidNotFound
        ))
      } else {
        resolvedDocument = resolvedDocument.didDocument
      }
      
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
              state: IState.Finished,
              secret,
              resource: storeData.resource
            }
          })
        }

        resourcePayload = storeData.resource
        resourcePayload.data = new Uint8Array(Object.values(resourcePayload.data!))
      } else if (!data) {
        return response.status(400).json(Responses.GetInvalidResourceResponse({}, secret, Messages.InvalidResource))
      } else {
        jobId = v4()

        resourcePayload = {
          collectionId: did.split(':').pop()!,
          id: v4(),
          name,
          resourceType: type,
          data: fromString(data, 'base64'),
          version,
          alsoKnownAs
        }
      }
      
      let signInputs: SignInfo[]
      
      if (secret.signingResponse) {
        signInputs = convertToSignInfo(secret.signingResponse)
      } else {
        LocalStore.instance.setResource(jobId, {resource: resourcePayload, state: IState.Action})
        return response.status(200).json(Responses.GetResourceActionSignatureResponse(
          jobId, 
          resolvedDocument.verificationMethod, 
          resourcePayload
        ))
      }

      options.network = options.network || (did.split(':'))[2] as NetworkType
      await CheqdRegistrar.instance.connect(options)
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