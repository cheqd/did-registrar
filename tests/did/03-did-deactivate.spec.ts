import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString, fromString } from 'uint8arrays';
import { getDidDocument, privKeyBytes } from 'fixtures';

let didState;
let jobId;

test('did-deactivate. Initiate DID Deactivate procedure', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post('/1.0/deactivate', {
		data: {
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

test('did-deactivate. Send the final request for DID deactivating', async ({ request }) => {
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

	const didDeactivate = await request.post(`/1.0/deactivate`, {
		data: {
			jobId: jobId,
			secret: secret,
			options: {
				network: 'testnet',
			},
			did: didPayload.id,
		},
	});

	expect(didDeactivate.status()).toBe(201);
});
