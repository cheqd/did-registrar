import type { DIDDocument, DidStdFee, VerificationMethod } from '@cheqd/sdk';
import type { AlternativeUri } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
import type { NetworkType } from '../service/cheqd.js';

export interface IDIDCreateRequest {
	jobId: string | null;
	options?: IOptions;
	secret?: ISecret;
	didDocument: DIDDocument;
}

export interface IDIDUpdateRequest {
	jobId: string | null;
	did: string;
	options?: IOptions;
	secret?: ISecret;
	didDocumentOperation: DidDocumentOperation[];
	didDocument: DIDDocument[];
}

export interface IResourceCreateRequestV1 {
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
	options?: IOptions;
	secret?: ISecret;
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
	DecryptionRequest = 'decryptionRequest',
}

export interface ISignInfo {
	kid: string;
	signature: string;
	alg?: string;
	purpose?: string;
}

export interface IDecryptionInfo {
	kid: string;
	decryptedPayload: string;
	enc?: string;
	purpose?: string;
}

export interface ISecret {
	verificationMethod?: VerificationMethod[];
	signingResponse?: ISignInfo[];
	decryptionResponse?: IDecryptionInfo[];
}

export interface IOptions {
	network?: NetworkType;
	rpcUrl?: string;
	fee?: DidStdFee;
	versionId?: string;
}

export interface IResourceCreateRequest {
	jobId: string | null;
	options?: IOptions;
	secret?: ISecret;
	did: string;
	relativeDidUrl: string;
	content: any;
	name: string;
	type: string;
	version: string;
}
export interface IResourceUpdateRequest {
	jobId: string | null;
	options?: IOptions;
	secret?: ISecret;
	did: string;
	relativeDidUrl: string;
	content: any;
	contentOperation: ContentOperation[];
	name: string;
	type: string;
	version: string;
}

export enum ContentOperation {
	Set = 'setContent',
	Add = 'addContent',
	Remove = 'removeContent',
}

export interface IResourceResponse {
	jobId: null;
	didUrlState: IDidUrlState;
	didRegistratonMetatdata?: Record<string, any>;
	contentMetadata?: Record<string, any>;
}

export interface IDidUrlState {
	state: IState;
	action?: IAction;
	didUrl: string;
	secret: ISecret;
	content: string;
}
