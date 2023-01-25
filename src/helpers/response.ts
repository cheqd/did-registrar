import { MsgCreateDidPayload, MsgDeactivateDidPayload, VerificationMethodPayload } from "@cheqd/sdk/build/types";
import { MsgCreateDidDocPayload, MsgDeactivateDidDocPayload } from "@cheqd/ts-proto/cheqd/did/v2";
import { MsgCreateResourcePayload } from "@cheqd/ts-proto/cheqd/resource/v2";

import { toString } from "uint8arrays"

import { Messages } from "../types/constants";
import { IAction, IdentifierPayload, IState } from "../types/types";

export class Responses {

    static GetSuccessResponse(jobId: string, didDocument: IdentifierPayload, secret: Record<string, any>) {
        return {
            jobId,
            didState: {
                did: didDocument.id,
                state: "finished",
                secret,
                didDocument
            }
        }
    }

    static GetDIDActionSignatureResponse(jobId: string, didDocument: IdentifierPayload) {
        const signingRequest =  didDocument.verificationMethod!.map((method)=> {
            return {
                kid: method.id,
                type: method.type,
                alg: 'EdDSA',
                serializedPayload: toString(
                    (
                        MsgCreateDidDocPayload.encode(
                        MsgCreateDidPayload.transformPayload(didDocument)).finish()
                    ),
                    'base64pad'
                )          
            }
        })

        return {
            jobId,
            didState: {
                did: didDocument.id,
                state: IState.Action,
                action: IAction.GetSignature,
                description: Messages.GetSignature,
                signingRequest,
                secret: {
                    signingResponse: [Messages.SigingResponse]
                }
            }
        }
    }

    static GetDeactivateDidSignatureResponse(jobId: string, payload: MsgDeactivateDidPayload) {
        const signingRequest =  payload.verificationMethod!.map((method)=> {
            return {
                kid: method.id,
                type: method.type,
                alg: 'EdDSA',
                serializedPayload: toString(
                    (
                        MsgDeactivateDidDocPayload.encode({
                            id: payload.id,
                            versionId: payload.versionId
                        } as MsgCreateDidDocPayload).finish()
                    ),
                    'base64pad'
                )          
            }
        })

        return {
            jobId,
            didState: {
                did: payload.id,
                state: IState.Action,
                action: IAction.GetSignature,
                description: Messages.GetSignature,
                signingRequest,
                secret: {
                    signingResponse: [Messages.SigingResponse]
                }
            }
        }       
    }

    static GetResourceActionSignatureResponse(jobId: string, verificationMethod: VerificationMethodPayload[], resource: Partial<MsgCreateResourcePayload>) {
        const signingRequest =  verificationMethod.map((method)=> {
            return {
                kid: method.id,
                type: method.type,
                alg: 'EdDSA',
                serializedPayload: toString(
                    (
                        MsgCreateResourcePayload.encode(MsgCreateResourcePayload.fromPartial(resource)).finish()
                    ),
                    'base64pad'
                )          
            }
        })

        return {
            jobId,
            resourceState: {
                did: resource.collectionId,
                state: IState.Action,
                action: IAction.GetSignature,
                description: Messages.GetSignature,
                signingRequest,
                secret: {
                    signingResponse: [Messages.SigingResponse]
                }
            }
        }
    }

    static GetInvalidResponse(didDocument: IdentifierPayload = {}, secret: Record<string, any> = {}, error: string) {
        return {
            jobId: null,
            didState: {
                did: didDocument.id || '',
                state: IState.Failed,
                reason: Messages.Invalid,
                description: Messages.Invalid + ": " + error,
                secret,
                didDocument
            }
        }
    }

    static GetInternalErrorResponse(didDocument: IdentifierPayload, secret: Record<string, any>, error?: string) {
        return {
            jobId: null,
            didState: {
                state: IState.Failed,
                reason: Messages.Internal,
                description: Messages.TryAgain + ": " + error,
                secret,
                didDocument
            }
        }
    }

    static GetJobExpiredResponse(jobId: string) {
        return {
            jobId,
            didState: {
                state: IState.Failed,
                reason: Messages.InvalidJob
            }
        }
    }

    static GetResourceSuccessResponse(jobId: string, secret: Record<string, any>, resourcePayload: Partial<MsgCreateResourcePayload>) {
        return {
            jobId,
            resourceState: {
                resourceId: resourcePayload.id || '',
                state: "finished",
                secret,
                resource: resourcePayload
            }
        }
    }

    static GetInvalidResourceResponse(resourcePayload: Partial<MsgCreateResourcePayload> = {}, secret: Record<string, any> = {}, error: string) {
        return {
            jobId: null,
            resourceState: {
                resourceId: resourcePayload.id,
                state: IState.Failed,
                reason: Messages.Invalid,
                description: Messages.Invalid + ": " + error,
                secret,
                resourcePayload
            }
        }
    }

}
