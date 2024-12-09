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
let didUrlState;
let jobId;
let resourceJobId;

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

	const didCreate = await request.post(`/1.0/create`, {
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

test('resource-create. Fail to send content', async ({ request }) => {
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: didPayload.id,
			name: 'ResourceName',
			type: 'TextDocument',
			version: '1.0',
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: name, type and content are required');
});

test('resource-create. Initiate Resource creation procedure', async ({ request }) => {
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: didPayload.id,
			content: 'SGVsbG8gV29ybGQ=',
			name: 'ResourceName',
			type: 'TextDocument',
			version: '1.0',
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(200);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.didUrl).toBeDefined();
	expect(body.didUrlState.state).toBeDefined();
	expect(body.didUrlState.signingRequest).toBeDefined();

	didUrlState = body.didUrlState;
	resourceJobId = body.jobId;
});

test('resource-create. Send the final request for Resource creating', async ({ request }) => {
	const serializedPayload = didUrlState.signingRequest[0].serializedPayload;
	const serializedBytes = Buffer.from(serializedPayload, 'base64');
	const signature = sign(privKeyBytes, serializedBytes);

	const secret = {
		signingResponse: [
			{
				kid: didUrlState.signingRequest[0].kid,
				signature: toString(signature, 'base64'),
			},
		],
	};

	const resourceCreate = await request.post(`/1.0/createResource`, {
		data: {
			did: didPayload.id,
			content: 'SGVsbG8gV29ybGQ=',
			name: 'ResourceName',
			type: 'TextDocument',
			version: '1.0',
			jobId: resourceJobId,
			secret: secret,
			options: {
				network: 'testnet',
			},
		},
	});
	const response = await resourceCreate.json();
	expect(resourceCreate.status()).toBe(201);
	expect(response.didUrlState).toBeDefined();
	expect(response.didUrlState.didUrl).toBeDefined();
	expect(response.didUrlState.state).toBeDefined();
	expect(response.didUrlState.state).toEqual('finished');
	expect(response.didUrlState.name).toEqual('ResourceName');
	expect(response.didUrlState.type).toEqual('TextDocument');
	expect(response.didUrlState.version).toEqual('1.0');
});
