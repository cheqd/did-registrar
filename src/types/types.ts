import { IKeyPair } from '@cheqd/sdk/build/types'
import { MsgCreateDidDocPayload, MsgUpdateDidDocPayload } from '@cheqd/ts-proto/cheqd/did/v2'
import { AlternativeUri } from '@cheqd/ts-proto/cheqd/resource/v2'
import { NetworkType } from '../service/cheqd'

export type IdentifierPayload = Partial<MsgCreateDidDocPayload> | Partial<MsgUpdateDidDocPayload>

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
    didDocument: Partial<MsgCreateDidDocPayload>
}

export interface IDIDUpdateRequest {
    jobId: string | null
    did: string
    options: Record<string, any>, 
    secret: Record<string, any>,
    didDocumentOperation: DidDocumentOperation[]
    didDocument: Partial<MsgUpdateDidDocPayload>[]
}

export interface IResourceCreateRequest {
    jobId: string | null
    secret: {
        keys: IKeyPair[]
        cosmosPayerMnemonic: string
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
    state: any
    did: string
    secret: Record<string, any>
    didDocument: Record<string, any>
}