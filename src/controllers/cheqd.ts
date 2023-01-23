import { Request, Response } from 'express'
import { validationResult, query } from 'express-validator'

import { createDidPayload, createDidVerificationMethod, createKeyPairHex, createVerificationKeys } from '@cheqd/sdk'
import { CheqdNetwork, MethodSpecificIdAlgo, VerificationMethods } from '@cheqd/sdk/build/types'

import { NetworkType } from '../service/cheqd'

export class CheqdController {

    public static didDocValidator = [
        query('verificationMethod').isString().isIn([VerificationMethods.Ed255192020, VerificationMethods.Ed255192018, VerificationMethods.JWK]).withMessage('Invalid verificationMethod'),
        query('methodSpecificIdAlgo').isString().isIn([MethodSpecificIdAlgo.Base58, MethodSpecificIdAlgo.Uuid]).withMessage('Invalid methodSpecificIdAlgo'),
        query('network').optional().isString().isIn([NetworkType.Mainnet, NetworkType.Testnet]).withMessage('Invalid network'),
        query('publicKeyHex').optional().isString().isLength({min:64, max:64}).withMessage('PublicKeyHex should be of length 64')
    ]
    
    public generateKeys(request: Request<{},{},{},{seed?: string}>, response: Response) {
        const keyPair = createKeyPairHex(request.query?.seed)
        
        return response.json({
            verificationMethodId: 'key-1',
            privateKeyHex: keyPair.privateKey,
            publicKeyHex: keyPair.publicKey
        })
    }

    public generateDidDoc(request: Request<{},{},{},IDidDocRequest>, response: Response) {
        // validate body
        const result = validationResult(request);
        if (!result.isEmpty()) {
            return response.status(400).json({
                message: result.array()[0].msg
            })
        }

        const { verificationMethod, methodSpecificIdAlgo, network, publicKeyHex } = request.query
        const verificationKeys = createVerificationKeys(publicKeyHex, methodSpecificIdAlgo, 'key-1', network)
        const verificationMethods = createDidVerificationMethod([verificationMethod], [verificationKeys])

        return response.json({
            didDoc: createDidPayload(verificationMethods, [verificationKeys]),
            key: {
                verificationMethodId: (verificationMethods[0]).id,
                publicKeyHex
            }
        })
    }

}


export interface IDidDocRequest {
    verificationMethod: VerificationMethods
    methodSpecificIdAlgo: MethodSpecificIdAlgo
    network: CheqdNetwork
    publicKeyHex: string
}

export interface IVerificationMethodRequest {
    verificationMethod: VerificationMethods
    methodSpecificIdAlgo: MethodSpecificIdAlgo
    network: CheqdNetwork
    publicKey: string
}