import { DIDDocument, SpecValidationResult, VerificationMethods } from "@cheqd/sdk/build/types";
import { Service, SignInfo, VerificationMethod } from "@cheqd/ts-proto/cheqd/did/v2";

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
    if (!didDocument?.id) return { valid: false, error: 'id is required' }

    // verificationMethod is required
    if (!didDocument?.verificationMethod) return { valid: false, error: 'verificationMethod is required' }

    // verificationMethod must be an array
    if (!Array.isArray(didDocument?.verificationMethod)) return { valid: false, error: 'verificationMethod must be an array' }

    // verificationMethod must be not be empty
    if (didDocument?.verificationMethod.length) return { valid: false, error: 'verificationMethod must be not be empty' }

    // verificationMethod types must be supported
    const protoVerificationMethod = didDocument.verificationMethod.map((vm) => {
        switch (vm?.type) {
            case VerificationMethods.Ed255192020:
                if (!vm?.publicKeyMultibase) throw new Error('publicKeyMultibase is required')

                return VerificationMethod.fromPartial({
                    id: vm.id,
                    controller: vm.controller,
                    verificationMethodType: VerificationMethods.Ed255192020,
                    verificationMaterial: vm.publicKeyMultibase,
                })
            case VerificationMethods.JWK:
                if (!vm?.publicKeyJwk) throw new Error('publicKeyJwk is required')

                return VerificationMethod.fromPartial({
                    id: vm.id,
                    controller: vm.controller,
                    verificationMethodType: VerificationMethods.JWK,
                    verificationMaterial: JSON.stringify(vm.publicKeyJwk),
                })
            case VerificationMethods.Ed255192018:
                if (!vm?.publicKeyBase58) throw new Error('publicKeyBase58 is required')

                return VerificationMethod.fromPartial({
                    id: vm.id,
                    controller: vm.controller,
                    verificationMethodType: VerificationMethods.Ed255192018,
                    verificationMaterial: vm.publicKeyBase58,
                })
            default:
                throw new Error('Unsupported verificationMethod type')
        }
    })

    const protoService = didDocument?.service?.map((s) => {
        return Service.fromPartial({
            id: s?.id,
            serviceType: s?.type,
            serviceEndpoint: <string[]>s?.serviceEndpoint,
        })
    })

    return { valid: true, protobufVerificationMethod: protoVerificationMethod, protobufService: protoService } as SpecValidationResult
}
