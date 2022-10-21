import { createDidPayload, createDidVerificationMethod, createKeyPairBase64, createVerificationKeys } from '@cheqd/sdk'
import { CheqdNetwork, IKeyPair, MethodSpecificIdAlgo, VerificationMethods } from '@cheqd/sdk/build/types'
import { Request, Response } from 'express'
import { validationResult, query } from 'express-validator'
import { NetworkType } from '../service/cheqd'

export class CheqdController {

    public static didDocValidator = [
        query('verificationMethod').isString().isIn([VerificationMethods.Base58, VerificationMethods.JWK]).withMessage('Invalid verificationMethod'),
        query('methodSpecificIdAlgo').isString().isIn([MethodSpecificIdAlgo.Base58, MethodSpecificIdAlgo.Uuid]).withMessage('Invalid methodSpecificIdAlgo'),
        query('methodSpecificIdLength').isNumeric().isIn([16, 32]).withMessage('Invalid methodSpecificIdLength length'),
        query('network').optional().isString().isIn([NetworkType.Mainnet, NetworkType.Testnet]).withMessage('Invalid network')
    ]
    
    public generateKeys(request: Request<{},{},{},{seed?: string}>, response: Response) {
        return response.json(createKeyPairBase64(request.query?.seed))
    }

    public generateDidDoc(request: Request<{},{},{},IDidDocRequest>, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json({
                message: result.array()[0].msg
            })
        }

        const { verificationMethod, methodSpecificIdAlgo, methodSpecificIdLength, network, keyPair=createKeyPairBase64() } = request.query

        const verificationKeys = createVerificationKeys(keyPair, methodSpecificIdAlgo, 'key-1', methodSpecificIdLength, network)
        const verificationMethods = createDidVerificationMethod([verificationMethod], [verificationKeys])

        return response.json({
            didDoc: createDidPayload(verificationMethods, [verificationKeys]),
            key: keyPair
        })
    }
}


export interface IDidDocRequest {
    verificationMethod: VerificationMethods
    methodSpecificIdAlgo: MethodSpecificIdAlgo
    methodSpecificIdLength: number
    network: CheqdNetwork
    keyPair: IKeyPair
}