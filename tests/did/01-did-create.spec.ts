import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString, fromString } from 'uint8arrays';
import { getDidDocument, privKeyBytes, pubKeyHex, setDidDocument } from 'fixtures';

let didState;
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

test('did-create. Initiate DID Create procedure', async ({ request }) => {
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

test('did-create. Send the final request for DID creating', async ({ request }) => {
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
