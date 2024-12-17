import type { Request, Response } from 'express';
import type { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
import type { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2/index.js';

import { check, param, validationResult } from 'express-validator';
import { v4 } from 'uuid';
import { fromString } from 'uint8arrays';

import { CheqdRegistrar, CheqdResolver, NetworkType } from '../service/cheqd.js';
import {
	ContentOperation,
	IResourceCreateRequest,
	IResourceCreateRequestV1,
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
	public static createResourceValidator = [
		check('did').exists().isString().contains('did:cheqd').withMessage(Messages.InvalidDid),
		check('jobId')
			.custom((value, { req }) => {
				if (!value && !(req.body.name && req.body.type && req.body.content)) return false;
				return true;
			})
			.withMessage('name, type and content are required'),
		check('content').optional().isString().withMessage(Messages.Invalid),
		check('name').optional().isString().withMessage(Messages.Invalid),
		check('type').optional().isString().withMessage(Messages.Invalid),
		check('version').optional().isString().withMessage(Messages.Invalid),
		check('relativeDidUrl').optional().isString().contains('/resources/').withMessage(Messages.InvalidDidUrl),
		check('alsoKnownAs').optional().isArray().withMessage(Messages.Invalid),
		check('alsoKnownAs.*.uri').isString().withMessage(Messages.Invalid),
		check('alsoKnownAs.*.description').isString().withMessage(Messages.Invalid),
	];
	public static updateResourceValidator = [
		check('did').exists().isString().contains('did:cheqd').withMessage(Messages.InvalidDid),
		check('jobId')
			.custom((value, { req }) => {
				if (!value && !(req.body.name && req.body.type && req.body.content)) return false;
				return true;
			})
			.withMessage('name, type and content are required'),
		check('name').optional().isString().withMessage(Messages.Invalid),
		check('type').optional().isString().withMessage(Messages.Invalid),
		check('content')
			.optional()
			.isArray()
			.custom((value) => {
				if (value.length !== 1) return false;
				if (typeof value[0] !== 'string') return false;
				return true;
			})
			.withMessage('The content array must be provided and must have exactly one string'),
		check('relativeDidUrl').optional().isString().contains('/resources/').withMessage(Messages.InvalidDidUrl),
		check('contentOperation')
			.optional()
			.isArray()
			.custom((value) => value[0] === ContentOperation.Set && value.length == 1)
			.withMessage('Only Set operation is supported'),
	];

	public async create(request: Request, response: Response) {
		const result = validationResult(request);
		if (!result.isEmpty()) {
			return response
				.status(400)
				.json(Responses.GetInvalidResourceResponseV1({}, request.body.secret, result.array()[0].msg));
		}

		const { did } = request.params;
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
					.send(Responses.GetInvalidResponse({ id: did }, secret, Messages.DidNotFound));
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
				LocalStore.instance.setResource(jobId, { resource: resourcePayload, state: IState.Action });
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
		const queryString = `${did}?resourceName=${name}&resourceType=${type}&resourceMetadata=true`;
		let resource = await CheqdResolver(queryString);
		if (resource)
			if (resource.contentStream) {
				let metadata = resource.contentStream.linkedResourceMetadata || [];
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

		let {
			did,
			jobId,
			content,
			name,
			type,
			version,
			secret = {},
			options = {},
		} = request.body as IResourceCreateRequest;

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
					return response.status(400).json(Responses.GetJobExpiredResponse(jobId));
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
				resourcePayload.data = new Uint8Array(Object.values(resourcePayload.data!));
			} else if (!content) {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponse('', {}, secret, Messages.InvalidContent));
			} else {
				const checkResource = await ResourceController.checkResourceStatus(did, name, type);
				if (checkResource.existingResource) {
					return response
						.status(400)
						.send(Responses.GetInvalidResourceResponse(did, {}, secret, Messages.ResourceExists));
				}
				jobId = v4();

				resourcePayload = {
					collectionId: did.split(':').pop()!,
					id: v4(),
					name,
					resourceType: type,
					version: version,
					data: fromString(content, 'base64'),
				};
			}

			let signInputs: SignInfo[];

			if (secret.signingResponse) {
				signInputs = convertToSignInfo(secret.signingResponse);
			} else {
				LocalStore.instance.setResource(jobId, { resource: resourcePayload, state: IState.Action });
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

		let {
			did,
			jobId,
			content,
			relativeDidUrl,
			name,
			type,
			version,
			secret = {},
			options = {},
		} = request.body as IResourceUpdateRequest;

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
					return response.status(400).json(Responses.GetJobExpiredResponse(jobId));
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
				resourcePayload.data = new Uint8Array(Object.values(resourcePayload.data!));
			} else if (!content) {
				return response
					.status(400)
					.json(Responses.GetInvalidResourceResponse('', {}, secret, Messages.InvalidContent));
			} else {
				let existingResource;
				const linkedResourceMetadata = resolvedDocument.didDocumentMetadata.linkedResourceMetadata || [];

				if (relativeDidUrl) {
					// search resource using relativeDidUrl
					const didUrlIndex = linkedResourceMetadata.findIndex(
						(resource: { resourceURI: string }) => resource.resourceURI === did + relativeDidUrl
					);
					if (didUrlIndex !== -1) {
						// if resource is found using relativeDidUrl
						existingResource = linkedResourceMetadata[didUrlIndex];
						// passed name and type must match
						if (existingResource.resourceName !== name || existingResource.resourceType !== type)
							return response
								.status(400)
								.send(
									Responses.GetInvalidResourceResponse(
										did,
										{ id: relativeDidUrl.split('resources/')[1] },
										secret,
										Messages.InvalidUpdateResource
									)
								);
						// If resource has a nextVersionId, then return error
						if (existingResource.nextVersionId) {
							return response
								.status(400)
								.send(
									Responses.GetInvalidResourceResponse(
										did,
										{},
										secret,
										'Only latest version of resource can be updated'
									)
								);
						}
					}
				} else {
					// if not relativeDidUrl, find by name and type
					const checkResource = await ResourceController.checkResourceStatus(did, name, type);
					existingResource = checkResource.existingResource;
				}
				if (!existingResource) {
					return response
						.status(400)
						.send(Responses.GetInvalidResourceResponse(did, {}, secret, Messages.ResourceNotFound));
				}

				jobId = v4();

				resourcePayload = {
					collectionId: did.split(':').pop()!,
					id: v4(),
					name,
					resourceType: type,
					version: version,
					data: fromString(content[0], 'base64'),
				};
			}

			let signInputs: SignInfo[];

			if (secret.signingResponse) {
				signInputs = convertToSignInfo(secret.signingResponse);
			} else {
				LocalStore.instance.setResource(jobId, { resource: resourcePayload, state: IState.Action });
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
