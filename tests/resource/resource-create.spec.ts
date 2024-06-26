import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString, fromString } from 'uint8arrays';
import base64url from 'base64url';

import * as dotenv from 'dotenv';
import { assert } from 'console';

dotenv.config();

const pub_key_base_64 = process.env.TEST_PUBLIC_KEY;
const priv_key_base_64 = process.env.TEST_PRIVATE_KEY;

assert(pub_key_base_64, 'TEST_PUBLIC_KEY is not defined');
assert(priv_key_base_64, 'TEST_PRIVATE_KEY is not defined');

const pubKeyHex = toString(fromString(pub_key_base_64 as string, 'base64pad'), 'base16');
const privKeyBytes = base64url.toBuffer(priv_key_base_64 as string);

let didPayload;
let didState;
let resourceState;
let jobId;

test('did-document. Generate the payload', async ({ request }) => {
	const payload = await request.get(
		`/1.0/did-document?verificationMethod=JsonWebKey2020&methodSpecificIdAlgo=uuid&network=testnet&publicKeyHex=${pubKeyHex}`
	);

	expect(payload.status()).toBe(200);

	const body = await payload.json();
	expect(body.didDoc).toBeDefined();
	expect(body.key).toBeDefined();
	expect(body.key.kid).toBeDefined();
	expect(body.key.publicKeyHex).toBeDefined();

	didPayload = body.didDoc;
});

test('resource-create. Initiate DID Create procedure', async ({ request }) => {
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

test('resource-create. Send the final request for DID creating', async ({ request }) => {
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
	const payload = await request.post(`/1.0/${didPayload.id}/create-resource`, {
		data: {
			data: 'SGVsbG8gV29ybGQ=',
			name: 'ResourceName',
			type: 'TextDocument',
		},
	});

	expect(payload.status()).toBe(200);

	const body = await payload.json();

	expect(body.resourceState).toBeDefined();
	expect(body.resourceState).toBeDefined();

	resourceState = body.resourceState;
	jobId = body.jobId;
});

test('resource-create. Send the final request for Resource creating', async ({ request }) => {
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
			name: 'ResourceName',
			type: 'TextDocument',
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
