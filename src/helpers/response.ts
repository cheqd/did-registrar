import type { DIDDocument } from '@cheqd/sdk';

import { DIDModule } from '@cheqd/sdk';
import { MsgCreateDidDocPayload, MsgDeactivateDidDocPayload } from '@cheqd/ts-proto/cheqd/did/v2/index.js';
import { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';

import { toString } from 'uint8arrays';

import { Messages } from '../types/constants.js';
import { IAction, IState } from '../types/types.js';
import { CheqdResolver } from '../service/cheqd.js';

export class Responses {
	static GetSuccessResponse(jobId: string, didDocument: DIDDocument, secret: Record<string, any>) {
		return {
			jobId,
			didState: {
				did: didDocument.id,
				state: IState.Finished,
				secret,
				didDocument,
			},
		};
	}

	static async GetDIDActionSignatureResponse(jobId: string, didPayload: DIDDocument, versionId: string) {
		const { protobufVerificationMethod, protobufService } =
			await DIDModule.validateSpecCompliantPayload(didPayload);
		const signingRequest: Record<string, any> = {};

		const controllers = didPayload.controller || [];

		const authentications: string[] = [];
		for (const controller of controllers) {
			if (controller == didPayload.id) {
				authentications.push(...((didPayload.authentication as string[]) || []));
				continue;
			}

			let resolvedDocument = await CheqdResolver(controller);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return Responses.GetInvalidResponse({ id: controller }, {}, Messages.ControllerNotFound);
			}
			authentications.push(...resolvedDocument.didDocument.authentication);
		}

		authentications.forEach((kid, index) => {
			signingRequest[`signingRequest${index}`] = {
				kid: kid,
				alg: 'EdDSA',
				serializedPayload: toString(
					MsgCreateDidDocPayload.encode(
						MsgCreateDidDocPayload.fromPartial({
							context: <string[]>didPayload?.['@context'],
							id: didPayload.id,
							controller: <string[]>didPayload.controller,
							verificationMethod: protobufVerificationMethod,
							authentication: <string[]>didPayload.authentication,
							assertionMethod: <string[]>didPayload.assertionMethod,
							capabilityInvocation: <string[]>didPayload.capabilityInvocation,
							capabilityDelegation: <string[]>didPayload.capabilityDelegation,
							keyAgreement: <string[]>didPayload.keyAgreement,
							service: protobufService,
							alsoKnownAs: <string[]>didPayload.alsoKnownAs,
							versionId: versionId,
						})
					).finish(),
					'base64pad'
				),
			};
		});

		return {
			jobId,
			didState: {
				did: didPayload.id,
				state: IState.Action,
				action: IAction.GetSignature,
				description: Messages.GetSignature,
				signingRequest,
				secret: {
					signingResponse: Messages.SigingResponse,
				},
			},
		};
	}

	static async GetDeactivateDidSignatureResponse(jobId: string, payload: DIDDocument, versionId: string) {
		const signingRequest: Record<string, any> = {};

		const controllers = payload.controller || [];
		const authentications: string[] = [];
		for (const controller of controllers) {
			if (controller == payload.id) {
				authentications.push(...((payload.authentication as string[]) || []));
				continue;
			}

			let resolvedDocument = await CheqdResolver(controller);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return Responses.GetInvalidResponse({ id: controller }, {}, Messages.ControllerNotFound);
			}
			authentications.push(...resolvedDocument.didDocument.authentication);
		}

		authentications.forEach((kid, index) => {
			signingRequest[`signingRequest${index}`] = {
				kid: kid,
				alg: 'EdDSA',
				serializedPayload: toString(
					MsgDeactivateDidDocPayload.encode({
						id: payload.id,
						versionId: versionId,
					}).finish(),
					'base64pad'
				),
			};
		});

		return {
			jobId,
			didState: {
				did: payload.id,
				state: IState.Action,
				action: IAction.GetSignature,
				description: Messages.GetSignature,
				signingRequest,
				secret: {
					signingResponse: Messages.SigingResponse,
				},
			},
		};
	}

	static async GetResourceActionSignatureResponseV1(
		jobId: string,
		didPayload: DIDDocument,
		resource: Partial<MsgCreateResourcePayload>
	) {
		const signingRequest: Record<string, any> = {};
		const controllers = didPayload.controller || [];
		const authentications: string[] = [];
		for (const controller of controllers) {
			if (controller == didPayload.id) {
				authentications.push(...((didPayload.authentication as string[]) || []));
				continue;
			}

			let resolvedDocument = await CheqdResolver(controller);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return Responses.GetInvalidResponse({ id: controller }, {}, Messages.ControllerNotFound);
			}
			authentications.push(...resolvedDocument.didDocument.authentication);
		}

		authentications.forEach((kid, index) => {
			signingRequest[`signingRequest${index}`] = {
				kid: kid,
				alg: 'EdDSA',
				serializedPayload: toString(
					MsgCreateResourcePayload.encode(MsgCreateResourcePayload.fromPartial(resource)).finish(),
					'base64pad'
				),
			};
		});

		return {
			jobId,
			resourceState: {
				did: resource.collectionId,
				state: IState.Action,
				action: IAction.GetSignature,
				description: Messages.GetSignature,
				signingRequest,
				secret: {
					signingResponse: Messages.SigingResponse,
				},
			},
		};
	}

	static async GetResourceActionSignatureResponse(
		jobId: string,
		didPayload: DIDDocument,
		resource: Partial<MsgCreateResourcePayload>
	) {
		const signingRequest: Record<string, any> = {};
		const controllers = didPayload.controller || [];
		const authentications: string[] = [];
		for (const controller of controllers) {
			if (controller == didPayload.id) {
				authentications.push(...((didPayload.authentication as string[]) || []));
				continue;
			}

			let resolvedDocument = await CheqdResolver(controller);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return Responses.GetInvalidResponse({ id: controller }, {}, Messages.ControllerNotFound);
			}
			authentications.push(...resolvedDocument.didDocument.authentication);
		}
		authentications.forEach((kid, index) => {
			signingRequest[`signingRequest${index}`] = {
				kid: kid,
				alg: 'EdDSA',
				serializedPayload: toString(
					MsgCreateResourcePayload.encode(MsgCreateResourcePayload.fromPartial(resource)).finish(),
					'base64pad'
				),
			};
		});

		return {
			jobId,
			didUrlState: {
				didUrl: didPayload.id + '/resources/' + resource.id,
				state: IState.Action,
				action: IAction.GetSignature,
				description: Messages.GetSignature,
				signingRequest,
				secret: {
					signingResponse: Messages.SigingResponse,
				},
			},
		};
	}

	static GetInvalidResponse(didDocument: DIDDocument | undefined, secret: Record<string, any> = {}, error: string) {
		return {
			jobId: null,
			didState: {
				did: didDocument?.id || '',
				state: IState.Failed,
				reason: Messages.Invalid,
				description: Messages.Invalid + ': ' + error,
				secret,
				didDocument,
			},
		};
	}

	static GetInternalErrorResponse(didDocument: DIDDocument | undefined, secret: Record<string, any>, error?: string) {
		return {
			jobId: null,
			didState: {
				state: IState.Failed,
				reason: Messages.Internal,
				description: Messages.TryAgain + ': ' + error,
				secret,
				didDocument,
			},
		};
	}

	static GetJobExpiredResponse(jobId: string) {
		return {
			jobId,
			didState: {
				state: IState.Failed,
				reason: Messages.InvalidJob,
			},
		};
	}

	static GetJobExpiredResourceResponse(jobId: string) {
		return {
			jobId,
			didUrlState: {
				state: IState.Failed,
				reason: Messages.InvalidJob,
			},
		};
	}

	static GetResourceSuccessResponseV1(
		jobId: string,
		secret: Record<string, any>,
		resourcePayload: Partial<MsgCreateResourcePayload>
	) {
		return {
			jobId,
			resourceState: {
				resourceId: resourcePayload.id || '',
				state: IState.Finished,
				secret,
				resource: resourcePayload,
			},
		};
	}
	static GetResourceSuccessResponse(
		jobId: string,
		secret: Record<string, any>,
		did: string,
		resourcePayload: Partial<MsgCreateResourcePayload>
	) {
		return {
			jobId,
			didUrlState: {
				didUrl: did + '/resources/' + resourcePayload.id || '',
				state: IState.Finished,
				secret,
				content: resourcePayload.data ? toString(resourcePayload.data) : undefined,
				name: resourcePayload.name,
				type: resourcePayload.resourceType,
				version: resourcePayload.version,
			},
			didRegistrationMetadata: {},
			contentMetadata: {},
		};
	}

	static GetInvalidResourceResponseV1(
		resourcePayload: Partial<MsgCreateResourcePayload> = {},
		secret: Record<string, any> = {},
		error: string
	) {
		return {
			jobId: null,
			resourceState: {
				resourceId: resourcePayload.id,
				state: IState.Failed,
				reason: Messages.Invalid,
				description: Messages.Invalid + ': ' + error,
				secret,
				resourcePayload,
			},
		};
	}
	static GetInvalidResourceResponse(
		did: string,
		resourcePayload: Partial<MsgCreateResourcePayload> = {},
		secret: Record<string, any> = {},
		error: string
	) {
		return {
			jobId: null,
			didUrlState: {
				didUrl: did + '/resources/' + resourcePayload.id,
				state: IState.Failed,
				reason: Messages.Invalid,
				description: Messages.Invalid + ': ' + error,
				secret,
				resourcePayload,
			},
		};
	}
}
