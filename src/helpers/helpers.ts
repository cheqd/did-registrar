import { DIDDocument, SpecValidationResult, VerificationMethods } from "@cheqd/sdk/build/types";
import {  SignInfo } from "@cheqd/ts-proto/cheqd/did/v2";

import { base64ToBytes } from "did-jwt";

import { ISignInfo } from "../types/types";

export function convertToSignInfo(payload: ISignInfo[]): SignInfo[] {
    return payload.map((value)=>{
        return {
            verificationMethodId: value.verificationMethodId,
            signature: base64ToBytes(value.signature)
        }
    })
}

export function validateSpecCompliantPayload(didDocument: DIDDocument) : SpecValidationResult {
    // id is required, validated on both compile and runtime
    if (!didDocument.id) return { valid: false, error: 'id is required' }

    // verificationMethod is required
    if (!didDocument.verificationMethod) return { valid: false, error: 'verificationMethod is required' }

    // verificationMethod must be an array
    if (!Array.isArray(didDocument.verificationMethod)) return { valid: false, error: 'verificationMethod must be an array' }

    // verificationMethod must be not be empty
    if (!didDocument.verificationMethod.length) return { valid: false, error: 'verificationMethod must be not be empty' }

    // verificationMethod types must be supported
    const isValidVerificationMethod = didDocument.verificationMethod.every((vm) => {
        switch (vm.type) {
            case VerificationMethods.Ed255192020:
                return vm.publicKeyMultibase != null
            case VerificationMethods.JWK:
                return vm.publicKeyJwk != null
            case VerificationMethods.Ed255192018:
                return vm.publicKeyBase58 != null
            default:
                return false
        }
    })

    if(!isValidVerificationMethod) return { valid: false, error: 'verificationMethod publicKey is Invalid'}

    const isValidService = didDocument.service ? didDocument?.service?.every((s) => {
        return Array.isArray(s?.serviceEndpoint) && s?.id && s?.type
    }) : true

    if(!isValidService) return { valid: false, error: 'Service is Invalid'}

    return { valid: true } as SpecValidationResult
}
