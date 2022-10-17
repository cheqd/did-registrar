import { IKeyPair } from '@cheqd/sdk/build/types'
import { MsgCreateDidPayload, MsgUpdateDidPayload } from '@cheqd/ts-proto/cheqd/v1/tx'
import { NetworkType } from '../service/cheqd'

export type IdentifierPayload = Partial<MsgCreateDidPayload> | Partial<MsgUpdateDidPayload>

export interface IDIDCreateRequest {
    jobId: string | null
    options?: {
        network: NetworkType,
        keytype: string
    }, 
    secret: {
        seed?: string,
        keys?: IKeyPair[]
    },
    didDocument: Partial<MsgCreateDidPayload>
}

export interface IDIDUpdateRequest {
    jobId: string | null
    did: string
    options: Record<string, any>, 
    secret: Record<string, any>,
    didDocumentOperation: DidDocumentOperation[]
    didDocument: Partial<MsgUpdateDidPayload>[]
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
    state: any
    did: string
    secret: Record<string, any>
    didDocument: Record<string, any>
}