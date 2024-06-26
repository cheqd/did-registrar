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

test('did-update. Initiate DID Create procedure', async ({ request }) => {
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

test('did-update. Send the final request for DID creating', async ({ request }) => {
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

test('did-update. Initiate DID Update procedure', async ({ request }) => {
	// Change didPayload
	didPayload = {
		...didPayload,
		service: [
			{
				id: `${didPayload.id}#service-1`,
				type: 'URL',
				serviceEndpoint: ['https://example.com/vc/'],
			},
		],
	};
	const payload = await request.post('/1.0/update', {
		data: {
			didDocument: [didPayload],
			did: didPayload.id,
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

test('did-update. Send the final request for DID updating', async ({ request }) => {
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

	const didUpdate = await request.post(`/1.0/update`, {
		data: {
			jobId: jobId,
			secret: secret,
			options: {
				network: 'testnet',
			},
			didDocument: [didPayload],
			did: didPayload.id,
		},
	});

	expect(didUpdate.status()).toBe(201);
});
