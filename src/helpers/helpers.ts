import type { DIDDocument, Service, SpecValidationResult } from '@cheqd/sdk';
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

	const isValidService = validateServices(didDocument.service);

	if (!isValidService) return { valid: false, error: 'Service is Invalid' };

	return { valid: true } as SpecValidationResult;
}

function validateServices(services: unknown): boolean {
	// If services is undefined or null, consider it valid (optional field)
	if (services === undefined || services === null) {
		return true;
	}
	if (Array.isArray(services)) {
		// If array, All services must be valid
		return services.every(isValidService);
	} else {
		return isValidService(services);
	}
}
// Validate individual service
function isValidService(service: unknown): boolean {
	if (!service || typeof service !== 'object') {
		return false;
	}

	const s = service as Partial<Service>;

	// Required fields validation
	if (!s.id || typeof s.id !== 'string' || s.id.trim().length === 0) {
		return false;
	}

	if (!s.type || typeof s.type !== 'string' || s.type.trim().length === 0) {
		return false;
	}

	if (!s.serviceEndpoint || !isValidServiceEndpoint(s.serviceEndpoint)) {
		return false;
	}

	// Optional fields validation
	if (s.priority !== undefined && (typeof s.priority !== 'number' || s.priority < 0)) {
		return false;
	}

	if (s.accept !== undefined && (!Array.isArray(s.accept) || !s.accept.every((item) => typeof item === 'string'))) {
		return false;
	}

	if (
		s.routing_keys !== undefined &&
		(!Array.isArray(s.routing_keys) || !s.routing_keys.every((key) => typeof key === 'string'))
	) {
		return false;
	}

	if (
		s.recipientKeys !== undefined &&
		(!Array.isArray(s.recipientKeys) || !s.recipientKeys.every((key) => typeof key === 'string'))
	) {
		return false;
	}

	return true;
}
function isValidServiceEndpoint(endpoint: unknown): boolean {
	if (typeof endpoint === 'string' && endpoint.trim().length > 0) {
		return true;
	}

	if (Array.isArray(endpoint)) {
		return endpoint.length > 0 && endpoint.every((ep) => typeof ep === 'string' && ep.trim().length > 0);
	}
	return false;
}
