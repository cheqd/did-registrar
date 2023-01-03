import { AlternativeUri, MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2'
import { Request, Response } from 'express'
import { CheqdRegistrar, NetworkType } from '../service/cheqd'
import { v4 as uuid } from 'uuid'
import { check, param, query, validationResult } from 'express-validator'
import { IKeyPair, ISignInputs } from '@cheqd/sdk/build/types'
import { toString, fromString } from 'uint8arrays'
import { IResourceCreateRequest } from '../types/types'

export class ResourceController {

    public static createValidator = [
        check('name').exists().isString().withMessage('Resource name is required'),
        check('type').exists().isString().withMessage('Resource type is required'),
        check('secret').exists().isObject().withMessage('Secret is required'),
        param('did').exists().isString().contains('did:cheqd').withMessage('DID is required'),
    ]

    public async create(request: Request, response: Response) {
        console.log(request.query)
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json({
                message: result.array()[0].msg
            })
        }
        const { did } = request.params
        console.log(did, "DID")
        let { data, name, type, mimeType, alsoKnownAs, version, secret } = request.body as IResourceCreateRequest
        if(mimeType == 'json') {
            data = JSON.stringify(data)
        }

        const resourcePayload: MsgCreateResourcePayload = {
            collectionId: did.split(':').pop()!,
            id: uuid(),
            name,
            resourceType: type,
            data: Buffer.from(data),
            version,
            alsoKnownAs: alsoKnownAs || []
        }
        let signInputs: ISignInputs[] = []
        secret.keys.map((key: IKeyPair, i: any)=>{
            signInputs.push({
                verificationMethodId: did+`#key-1`,
                keyType: 'Ed25519',
                privateKeyHex: toString(fromString(key.privateKey, 'base64'), 'hex')
            })
        })
        await CheqdRegistrar.instance.connect(NetworkType.Testnet)
        const resp = await CheqdRegistrar.instance.createResource(signInputs, resourcePayload)
        return response.json({
            status: resp
        })
    }
}