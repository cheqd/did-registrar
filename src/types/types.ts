import { ISignInputs, MsgCreateDidPayload } from '@cheqd/sdk/build/types'
import { AlternativeUri } from '@cheqd/ts-proto/cheqd/resource/v2'

import { NetworkType } from '../service/cheqd'

export type IdentifierPayload = Partial<MsgCreateDidPayload>

export interface IDIDCreateRequest {
    jobId: string | null
    options?: {
        network: NetworkType,
        keytype: string
    }, 
    secret: {
        seed?: string,
        keys?: ISignInputs[],
        signingResponse?: ISignInfo[]
    },
    didDocument: IdentifierPayload
}

export interface IDIDUpdateRequest {
    jobId: string | null
    did: string
    options: Record<string, any>, 
    secret:{
        keys?: ISignInputs[],
        signingResponse?: ISignInfo[]
    },
    didDocumentOperation: DidDocumentOperation[]
    didDocument: IdentifierPayload[]
}

export interface IResourceCreateRequest {
    jobId: string | null
    secret: {
        keys?: ISignInputs[],
        signingResponse?: ISignInfo[]
    }
    data: any, 
    name: string, 
    type: string, 
    mimeType: string, 
    alsoKnownAs?: AlternativeUri[], 
    version: string
}

export enum DidDocumentOperation {
    Set = 'setDidDocument',
    Add = 'addToDidDocument',
    Remove = 'removeFromDidDocument'
}

export interface IDIDDeactivateRequest {
    jobId: string | null
    did: string
    options: Record<string, any>, 
    secret: Record<string, any>
}

export interface IDidResponse {
    jobId: null,
    didState: IDidState,
    didRegistratonMetatdata?: Record<string, any>
    didDocumentMetadata?: Record<string, any>
}

export interface IDidState {
    state: IState
    action?: IAction
    did: string
    secret: Record<string, any>
    didDocument: Record<string, any>
}

export enum IState {
    Init = "init",
    Finished = "finished",
    Action = "action",
    Failed = "failed"
}

export enum IAction {
    GetVerificationMethod = "getVerificationMethod",
    GetSignature = "signPayload",
    Redirect = "redirect",
    Wait = "wait"
}

export interface ISignInfo {
    verificationMethodId: string,
    signature: string
}