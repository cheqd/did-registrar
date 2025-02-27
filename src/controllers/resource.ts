import type { Request, Response } from 'express';
import type { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
import type { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2/index.js';

import { check, param, validationResult } from 'express-validator';
import { v4, validate } from 'uuid';
import { fromString } from 'uint8arrays';

import { CheqdRegistrar, CheqdResolver, NetworkType } from '../service/cheqd.js';
import {
	ContentOperation,
	IResourceCreateRequest,
	IResourceCreateRequestV1,
	IResourceOptions,
	IResourceUpdateRequest,
	IState,
} from '../types/types.js';
import { Messages } from '../types/constants.js';
import { convertToSignInfo } from '../helpers/helpers.js';
import { Responses } from '../helpers/response.js';
import { LocalStore } from './store.js';

export class ResourceController {
	public static createValidator = [
		param('did').exists().isString().contains('did:cheqd').withMessage(Messages.InvalidDid),
		check('jobId')
			.custom((value, { req }) => {
				if (!value && !(req.body.name && req.body.type && req.body.data)) return false;
				return true;
			})
			.withMessage('name, type and data are required'),
		check('name').optional().isString().withMessage(Messages.Invalid),
		check('type').optional().isString().withMessage(Messages.Invalid),
		check('data').optional().isString().withMessage(Messages.Invalid),
		check('alsoKnownAs').optional().isArray().withMessage(Messages.Invalid),
		check('alsoKnownAs.*.uri').isString().withMessage(Messages.Invalid),
		check('alsoKnownAs.*.description').isString().withMessage(Messages.Invalid),
	];

	static validateJobId = check('jobId')
		.custom((value, { req }) => {
			if (!value && !(req.body.content && req.body.options && req.body.options.name && req.body.options.type))
				return false;
			return true;
		})
		.withMessage('options.name, options.type and content are required');

	static validateOptions = [
		check('options').optional().isObject().withMessage(Messages.Invalid),
		check('options.name').optional().isString().withMessage(Messages.Invalid),
		check('options.type').optional().isString().withMessage(Messages.Invalid),
		check('options.versionId').optional().isString().withMessage(Messages.Invalid),
		check('options.alsoKnownAs').optional().isArray().withMessage(Messages.Invalid),
		check('options.alsoKnownAs.*.uri').isString().withMessage(Messages.Invalid),
		check('options.alsoKnownAs.*.description').isString().withMessage(Messages.Invalid),
	];

	public static createResourceValidator = [
		check('did').optional().isString().contains('did:cheqd').withMessage(Messages.InvalidDid),
		this.validateJobId,
		check('content').optional().isString().withMessage(Messages.Invalid),
		check('relativeDidUrl').optional().isString().contains('/resources/').withMessage(Messages.InvalidDidUrl)
        .customSanitizer(value => value.replace('/resources/', ''))
        .isUUID().withMessage(Messages.InvalidResourceId),
		...this.validateOptions,
	];

	public static updateResourceValidator = [
		check('did').optional().isString().contains('did:cheqd').withMessage(Messages.InvalidDid),
		this.validateJobId,
		check('content')
			.optional()
			.isArray()
			.custom((value) => {
				if (value.length !== 1) return false;
				if (typeof value[0] !== 'string') return false;
				return true;
			})
			.withMessage('The content array must be provided and must have exactly one string'),
		check('relativeDidUrl')
            .optional().isString().contains('/resources/').withMessage(Messages.InvalidDidUrl)
            .customSanitizer(value => value.replace('/resources/', ''))
            .isUUID().withMessage(Messages.InvalidResourceId),
		check('contentOperation')
			.optional()
			.isArray()
			.custom((value) => value[0] === ContentOperation.Set && value.length == 1)
			.withMessage('Only Set operation is supported'),
		...this.validateOptions,
	];

	public async create(request: Request, response: Response) {
		const result = validationResult(request);
		if (!result.isEmpty()) {
			return response
				.status(400)
				.json(Responses.GetInvalidResourceResponseV1({}, request.body.secret, result.array()[0].msg));
		}

		let { did } = request.params;
		let {
			jobId,
			data,
			name,
			type,
			alsoKnownAs,
			version,
			secret = {},
			options = {},
		} = request.body as IResourceCreateRequestV1;

		let resourcePayload: Partial<MsgCreateResourcePayload> = {};
		try {
			// check if did is registered on the ledger
			let resolvedDocument = await CheqdResolver(did);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return response
					.status(400)
					.send(Responses.GetInvalidResourceResponseV1({ id: did }, secret, Messages.DidNotFound));
			} else {
				resolvedDocument = resolvedDocument.didDocument;
			}

			// Validate and get store data if any
			if (jobId) {
				const storeData = LocalStore.instance.getResource(jobId);
				if (!storeData) {
					return response.status(400).json(Responses.GetJobExpiredResponse(jobId));
				} else if (storeData.state == IState.Finished) {
					return response.status(201).json({
						jobId,
						resourceState: {
							resourceId: storeData.resource.id,
							state: IState.Finished,
							secret,
							resource: storeData.resource,
						},
					});
				}

				resourcePayload = storeData.resource;
				did = storeData.did;
				resourcePayload.data = new Uint8Array(Object.values(resourcePayload.data!));
			} else if (!data) {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponseV1({}, secret, Messages.InvalidResource));
			} else {
				jobId = v4();

				resourcePayload = {
					collectionId: did.split(':').pop()!,
					id: v4(),
					name,
					resourceType: type,
					data: fromString(data, 'base64'),
					version,
					alsoKnownAs,
				};
			}

			let signInputs: SignInfo[];

			if (secret.signingResponse) {
				signInputs = convertToSignInfo(secret.signingResponse);
			} else {
				LocalStore.instance.setResource(jobId, { resource: resourcePayload, state: IState.Action, did });
				return response
					.status(200)
					.json(
						Responses.GetResourceActionSignatureResponseV1(
							jobId,
							resolvedDocument.verificationMethod,
							resourcePayload
						)
					);
			}

			options.network = options.network || (did.split(':')[2] as NetworkType);
			await CheqdRegistrar.instance.connect(options);
			const result = await CheqdRegistrar.instance.createResource(signInputs, resourcePayload);
			if (result.code == 0) {
				return response
					.status(201)
					.json(Responses.GetResourceSuccessResponseV1(jobId, secret, resourcePayload));
			} else {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponseV1(resourcePayload, secret, Messages.InvalidResource));
			}
		} catch (error) {
			return response.status(500).json({
				jobId,
				resourceState: {
					state: IState.Failed,
					reason: Messages.Internal,
					description: Messages.TryAgain + error,
					secret,
					resourcePayload,
				},
			});
		}
	}

	// function to get resource by using name and type
	public static async checkResourceStatus(
		did: string,
		name: string,
		type: string
	): Promise<{ existingResource: any }> {
		let existingResource;
		const queryString = `${did}?resourceName=${name}&resourceType=${type}`;
		let didResolutionResult = await CheqdResolver(queryString);
		if (didResolutionResult) {
            let metadata = didResolutionResult.didDocumentMetadata.linkedResourceMetadata || [];
            if (metadata.length >= 1) {
                return {
                    existingResource: metadata[0],
                };
            }
		}
		return { existingResource: existingResource };
	}

	public async createResource(request: Request, response: Response) {
		const result = validationResult(request);
		if (!result.isEmpty()) {
			return response
				.status(400)
				.json(Responses.GetInvalidResourceResponse('', {}, request.body.secret, result.array()[0].msg));
		}

		let { did, jobId, content, secret = {}, options, relativeDidUrl } = request.body as IResourceCreateRequest;

		let resourcePayload: Partial<MsgCreateResourcePayload> = {};

		try {
			// check if did is registered on the ledger
			let resolvedDocument = await CheqdResolver(did);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return response
					.status(400)
					.send(Responses.GetInvalidResourceResponse(did, {}, secret, Messages.DidNotFound));
			}
			resolvedDocument = resolvedDocument.didDocument;
			// Validate and get store data if any
			if (jobId) {
				const storeData = LocalStore.instance.getResource(jobId);
				if (!storeData) {
					return response.status(400).json(Responses.GetJobExpiredResourceResponse(jobId));
				} else if (storeData.state == IState.Finished) {
					return response.status(201).json({
						jobId,
						didUrlState: {
							didUrl: storeData.resource.id,
							state: IState.Finished,
							secret,
							resource: storeData.resource,
						},
					});
				}

				resourcePayload = storeData.resource;
				did = storeData.did;
				resourcePayload.data = new Uint8Array(Object.values(resourcePayload.data!));
				options = {
					name: storeData.resource.name!,
					type: storeData.resource.resourceType!,
				};
			} else if (!content || !options) {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponse('', {}, secret, Messages.InvalidContent));
			} else {
				const { name, type, versionId } = options as IResourceOptions;

				const checkResource = await ResourceController.checkResourceStatus(did, name, type);
				if (checkResource.existingResource) {
					return response
						.status(400)
						.send(Responses.GetInvalidResourceResponse(did, {}, secret, Messages.ResourceExists));
				}
				jobId = v4();

                const id = relativeDidUrl ? relativeDidUrl.replace('/resources/', '') : '';
                const resourceId = validate(id) ? id : v4();

				resourcePayload = {
					collectionId: did.split(':').pop()!,
					id: resourceId,
					name,
					resourceType: type,
					version: versionId,
					data: fromString(content, 'base64'),
				};
			}

			let signInputs: SignInfo[];

			if (secret.signingResponse) {
				signInputs = convertToSignInfo(secret.signingResponse);
			} else {
				LocalStore.instance.setResource(jobId, { resource: resourcePayload, state: IState.Action, did });
				return response
					.status(200)
					.json(
						Responses.GetResourceActionSignatureResponse(
							jobId,
							resolvedDocument.verificationMethod,
							did,
							resourcePayload
						)
					);
			}

			options.network = options.network || (did.split(':')[2] as NetworkType);
			await CheqdRegistrar.instance.connect(options);
			const result = await CheqdRegistrar.instance.createResource(signInputs, resourcePayload);
			if (result.code == 0) {
				return response
					.status(201)
					.json(Responses.GetResourceSuccessResponse(jobId, secret, did, resourcePayload));
			} else {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponse(did, resourcePayload, secret, Messages.InvalidResource));
			}
		} catch (error) {
			return response.status(500).json({
				jobId,
				didUrlState: {
					state: IState.Failed,
					reason: Messages.Internal,
					description: Messages.TryAgain + error,
					secret,
					resourcePayload,
				},
			});
		}
	}
	public async updateResource(request: Request, response: Response) {
		const result = validationResult(request);
		if (!result.isEmpty()) {
			return response
				.status(400)
				.json(Responses.GetInvalidResourceResponse('', {}, request.body.secret, result.array()[0].msg));
		}

		let { did, jobId, content, relativeDidUrl, secret = {}, options } = request.body as IResourceUpdateRequest;

		let resourcePayload: Partial<MsgCreateResourcePayload> = {};

		try {
			// check if did is registered on the ledger
			let resolvedDocument = await CheqdResolver(did);
			if (!resolvedDocument?.didDocument || resolvedDocument.didDocumentMetadata.deactivated) {
				return response
					.status(400)
					.send(Responses.GetInvalidResourceResponse(did, {}, secret, Messages.DidNotFound));
			}
			const resolvedDidDocument = resolvedDocument.didDocument;
			// Validate and get store data if any
			if (jobId) {
				const storeData = LocalStore.instance.getResource(jobId);
				if (!storeData) {
					return response.status(400).json(Responses.GetJobExpiredResourceResponse(jobId));
				} else if (storeData.state == IState.Finished) {
					return response.status(201).json({
						jobId,
						didUrlState: {
							didUrl: storeData.resource.id,
							state: IState.Finished,
							secret,
							resource: storeData.resource,
						},
					});
				}

				resourcePayload = storeData.resource;
				did = storeData.did;
				resourcePayload.data = new Uint8Array(Object.values(resourcePayload.data!));
				options = {
					name: storeData.resource.name!,
					type: storeData.resource.resourceType!,
				};
			} else if (!content || !options) {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponse('', {}, secret, Messages.InvalidContent));
			} else {
				const { name, type, versionId } = options as IResourceOptions;

                // find by name and type
                const { existingResource } = await ResourceController.checkResourceStatus(did, name, type);
   				if (!existingResource) {
					return response
						.status(400)
						.send(Responses.GetInvalidResourceResponse(did, {}, secret, Messages.InvalidUpdateResource));
				}

				jobId = v4();
                const id = relativeDidUrl ? relativeDidUrl.replace('/resources/', '') : '';
                const resourceId = validate(id) ? id : v4();

				resourcePayload = {
					collectionId: did.split(':').pop()!,
					id: resourceId,
					name,
					resourceType: type,
					version: versionId,
					data: fromString(content[0], 'base64'),
				};
			}

			let signInputs: SignInfo[];

			if (secret.signingResponse) {
				signInputs = convertToSignInfo(secret.signingResponse);
			} else {
				LocalStore.instance.setResource(jobId, { resource: resourcePayload, state: IState.Action, did });
				return response
					.status(200)
					.json(
						Responses.GetResourceActionSignatureResponse(
							jobId,
							resolvedDidDocument.verificationMethod,
							did,
							resourcePayload
						)
					);
			}

			options.network = options.network || (did.split(':')[2] as NetworkType);
			await CheqdRegistrar.instance.connect(options);
			const result = await CheqdRegistrar.instance.createResource(signInputs, resourcePayload);
			if (result.code == 0) {
				return response
					.status(201)
					.json(Responses.GetResourceSuccessResponse(jobId, secret, did, resourcePayload));
			} else {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponse(did, resourcePayload, secret, Messages.InvalidResource));
			}
		} catch (error) {
			return response.status(500).json({
				jobId,
				didUrlState: {
					state: IState.Failed,
					reason: Messages.Internal,
					description: Messages.TryAgain + error,
					secret,
					resourcePayload,
				},
			});
		}
	}
}
