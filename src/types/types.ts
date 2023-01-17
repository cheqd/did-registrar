import { IKeyPair, ISignInputs, MsgCreateDidPayload, VerificationMethods } from '@cheqd/sdk/build/types'
import {  SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'
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
        signingResponse?: SignInfo[]
    },
    didDocument: IdentifierPayload
}

export interface IDIDUpdateRequest {
    jobId: string | null
    did: string
    options: Record<string, any>, 
    secret:{
        keys?: ISignInputs[],
        signingResponse?: SignInfo[]
    },
    didDocumentOperation: DidDocumentOperation[]
    didDocument: IdentifierPayload[]
}

export interface IResourceCreateRequest {
    jobId: string | null
    secret: {
        keys: ISignInputs[],
        signingResponse?: SignInfo[]
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