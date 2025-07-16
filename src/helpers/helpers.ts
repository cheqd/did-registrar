import type { DIDDocument, SpecValidationResult } from '@cheqd/sdk';
import type { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2/index.js';

import { VerificationMethods } from '@cheqd/sdk';
import { base64ToBytes } from 'did-jwt';

import { ISignInfo } from '../types/types.js';

export function convertToSignInfo(payload: Record<string, ISignInfo>): SignInfo[] {
	const signInfo = [];
	for (var key in payload) {
		if (payload[key])
			signInfo.push({
				verificationMethodId: payload[key].kid,
				signature: base64ToBytes(payload[key].signature),
			});
	}

	return signInfo;
}

export function validateSpecCompliantPayload(didDocument: DIDDocument): SpecValidationResult {
	// id is required, validated on both compile and runtime
	if (!didDocument.id) return { valid: false, error: 'id is required' };

	// verificationMethod is required
	if (!didDocument.verificationMethod) return { valid: false, error: 'verificationMethod is required' };

	// verificationMethod must be an array
	if (!Array.isArray(didDocument.verificationMethod))
		return { valid: false, error: 'verificationMethod must be an array' };

	// verificationMethod must be not be empty
	if (!didDocument.verificationMethod.length)
		return { valid: false, error: 'verificationMethod must be not be empty' };

	// verificationMethod types must be supported
	const isValidVerificationMethod = didDocument.verificationMethod.every((vm) => {
		switch (vm.type) {
			case VerificationMethods.Ed255192020:
				return vm.publicKeyMultibase != null;
			case VerificationMethods.JWK:
				return vm.publicKeyJwk != null;
			case VerificationMethods.Ed255192018:
				return vm.publicKeyBase58 != null;
			default:
				return false;
		}
	});

	if (!isValidVerificationMethod) return { valid: false, error: 'verificationMethod publicKey is Invalid' };

	const isValidService = didDocument.service
		? didDocument?.service?.every((s) => {
				const endpoint = s?.serviceEndpoint
				const validEndpoint = typeof endpoint === 'string' ||
					Array.isArray(endpoint) ||
					(typeof endpoint === 'object' && endpoint !== null);
				return validEndpoint && s?.id && s?.type;
			})
		: true;

	if (!isValidService) return { valid: false, error: 'Service is Invalid' };

	return { valid: true } as SpecValidationResult;
}
