import type { DIDDocument, DidStdFee } from '@cheqd/sdk';
import type { AlternativeUri } from '@cheqd/ts-proto/cheqd/resource/v2';
import type { NetworkType } from '../service/cheqd';

export interface IDIDCreateRequest {
	jobId: string | null;
	options?: IOptions;
	secret: ISecret;
	didDocument: DIDDocument;
}

export interface IDIDUpdateRequest {
	jobId: string | null;
	did: string;
	options: IOptions;
	secret: ISecret;
	didDocumentOperation: DidDocumentOperation[];
	didDocument: DIDDocument[];
}

export interface IResourceCreateRequest {
	jobId: string | null;
	secret: ISecret;
	options: IOptions;
	data: any;
	name: string;
	type: string;
	mimeType: string;
	alsoKnownAs?: AlternativeUri[];
	version: string;
}

export enum DidDocumentOperation {
	Set = 'setDidDocument',
	Add = 'addToDidDocument',
	Remove = 'removeFromDidDocument',
}

export interface IDIDDeactivateRequest {
	jobId: string | null;
	did: string;
	options: Record<string, any>;
	secret: ISecret;
}

export interface IDidResponse {
	jobId: null;
	didState: IDidState;
	didRegistratonMetatdata?: Record<string, any>;
	didDocumentMetadata?: Record<string, any>;
}

export interface IDidState {
	state: IState;
	action?: IAction;
	did: string;
	secret: ISecret;
	didDocument: DIDDocument;
}

export enum IState {
	Init = 'init',
	Finished = 'finished',
	Action = 'action',
	Failed = 'failed',
}

export enum IAction {
	GetVerificationMethod = 'getVerificationMethod',
	GetSignature = 'signPayload',
	Redirect = 'redirect',
	Wait = 'wait',
}

export interface ISignInfo {
	verificationMethodId: string;
	signature: string;
}

export interface ISecret {
	signingResponse?: ISignInfo[];
}

export interface IOptions {
	network?: NetworkType;
	rpcUrl?: string;
	fee?: DidStdFee;
	versionId?: string;
}
