import { createDidPayload, createDidVerificationMethod, createKeyPairBase64, createKeyPairHex, createVerificationKeys } from '@cheqd/sdk'
import { CheqdNetwork, IKeyPair, MethodSpecificIdAlgo, VerificationMethods } from '@cheqd/sdk/build/types'
import { convertKeyPairtoTImportableEd25519Key } from '@cheqd/sdk/build/utils'
import { Request, Response } from 'express'
import { validationResult, query } from 'express-validator'
import { NetworkType } from '../service/cheqd'

export class CheqdController {

    public static didDocValidator = [
        query('verificationMethod').isString().isIn([VerificationMethods.Ed255192020, VerificationMethods.Ed255192018, VerificationMethods.JWK]).withMessage('Invalid verificationMethod'),
        query('methodSpecificIdAlgo').isString().isIn([MethodSpecificIdAlgo.Base58, MethodSpecificIdAlgo.Uuid]).withMessage('Invalid methodSpecificIdAlgo'),
        query('methodSpecificIdLength').isNumeric().isIn([16, 32]).withMessage('Invalid methodSpecificIdLength length'),
        query('network').optional().isString().isIn([NetworkType.Mainnet, NetworkType.Testnet]).withMessage('Invalid network'),
        query('seed').optional().isString().isLength({min:32, max:32}).withMessage('Seed should be of length 32')
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

        const { verificationMethod, methodSpecificIdAlgo, methodSpecificIdLength, network, seed } = request.query
        const keyPair = createKeyPairBase64(seed)
        const verificationKeys = createVerificationKeys(keyPair, methodSpecificIdAlgo, 'key-1', methodSpecificIdLength, network)
        const verificationMethods = createDidVerificationMethod([verificationMethod], [verificationKeys])
        const keyPairHex = convertKeyPairtoTImportableEd25519Key(keyPair)

        return response.json({
            didDoc: createDidPayload(verificationMethods, [verificationKeys]),
            key: {
                verificationMethodId: (verificationMethods[0]).id,
                privateKeyHex: keyPairHex.privateKeyHex,
                publicKeyHex: keyPairHex.publicKeyHex
            }
        })
    }
}


export interface IDidDocRequest {
    verificationMethod: VerificationMethods
    methodSpecificIdAlgo: MethodSpecificIdAlgo
    methodSpecificIdLength: number
    network: CheqdNetwork
    seed?: string
}