import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString, fromString } from 'uint8arrays';
import { getDidDocument, privKeyBytes, pubKeyHex, setDidDocument } from 'fixtures';

let didState;
let resourceState;
let jobId;

test.beforeAll(async ({ request }) => {
	const payload = await request.get(
		`/1.0/did-document?verificationMethod=JsonWebKey2020&methodSpecificIdAlgo=uuid&network=testnet&publicKeyHex=${pubKeyHex}`
	);

	expect(payload.status()).toBe(200);

	const body = await payload.json();
	expect(body.didDoc).toBeDefined();
	expect(body.key).toBeDefined();
	expect(body.key.kid).toBeDefined();
	expect(body.key.publicKeyHex).toBeDefined();

	setDidDocument(body.didDoc);
});

test('resource-create. Initiate DID Create procedure', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post('/1.0/create', {
		data: {
			didDocument: didPayload,
			secret: {},
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(200);

	const body = await payload.json();

	expect(body.jobId).toBeDefined();
	expect(body.didState).toBeDefined();
	expect(body.didState.did).toBeDefined();
	expect(body.didState.state).toBeDefined();
	expect(body.didState.secret).toBeDefined();

	didState = body.didState;
	jobId = body.jobId;
});

test('resource-create. Send the final request for DID creation', async ({ request }) => {
	const didPayload = getDidDocument();
	const serializedPayload = didState.signingRequest[0].serializedPayload;
	const serializedBytes = Buffer.from(serializedPayload, 'base64');
	const signature = sign(privKeyBytes, serializedBytes);

	const secret = {
		signingResponse: [
			{
				kid: didState.signingRequest[0].kid,
				signature: toString(signature, 'base64'),
			},
		],
	};

	const didCreate = await request.post(`/1.0/create/`, {
		data: {
			jobId: jobId,
			secret: secret,
			options: {
				network: 'testnet',
			},
			didDocument: didPayload,
		},
	});

	expect(didCreate.status()).toBe(201);
});

test('resource-create. Initiate Resource creation procedure', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/${didPayload.id}/create-resource`, {
		data: {
			data: 'SGVsbG8gV29ybGQ=',
			name: 'TestResourceName',
			type: 'Document',
		},
	});

	expect(payload.status()).toBe(200);

	const body = await payload.json();

	expect(body.resourceState).toBeDefined();
	expect(body.resourceState).toBeDefined();

	resourceState = body.resourceState;
	jobId = body.jobId;
});

test('resource-create. Send the final request for Resource creation', async ({ request }) => {
	const didPayload = getDidDocument();
	const serializedPayload = resourceState.signingRequest[0].serializedPayload;
	const serializedBytes = Buffer.from(serializedPayload, 'base64');
	const signature = sign(privKeyBytes, serializedBytes);

	const secret = {
		signingResponse: [
			{
				kid: resourceState.signingRequest[0].kid,
				signature: toString(signature, 'base64'),
			},
		],
	};

	const resourceCreate = await request.post(`/1.0/${didPayload.id}/create-resource`, {
		data: {
			data: 'SGVsbG8gV29ybGQ=',
			name: 'TestResourceName',
			type: 'Document',
			jobId: jobId,
			secret: secret,
			options: {
				network: 'testnet',
			},
			did: didPayload.id,
		},
	});

	expect(resourceCreate.status()).toBe(201);
});
