import { MsgCreateDidPayload } from "@cheqd/sdk/build/types";
import { MsgCreateDidDocPayload } from "@cheqd/ts-proto/cheqd/did/v2";
import { bytesToBase64 } from "did-jwt/lib/util";
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

    static GetDIDActionSignatureResponse(didDocument: IdentifierPayload) {
        return {
            jobId: null,
            didState: {
                did: didDocument.id,
                state: IState.Action,
                action: IAction.GetSignature,
                description: Messages.GetSignature,
                signingRequest: {
                    payload: MsgCreateDidPayload.transformPayload(didDocument),
                    serializedPayload: bytesToBase64(MsgCreateDidDocPayload.encode(MsgCreateDidPayload.transformPayload(didDocument)).finish()),
                    alg: "EdDSA"
                },
                secret: {
                    signingResponse: ["<Place the signature json array here>"]
                }
            }
        }
    }

    static GetInvalidResponse(didDocument: IdentifierPayload, secret: Record<string, any>, error: string) {
        return {
            jobId: null,
            didState: {
                did: didDocument.id,
                state: IState.Failed,
                reason: Messages.Invalid,
                description: `The payload is invalid due to ${error}`,
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
                description: Messages.TryAgain + error,
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
}
