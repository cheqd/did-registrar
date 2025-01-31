import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString } from 'uint8arrays';
import { getDidDocument, privKeyBytes } from 'fixtures';

let didPayload;
let didState;
let jobId;

test('did-update. Initiate DID Update procedure', async ({ request }) => {
	didPayload = getDidDocument();
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
	const signingRequest = didState.signingRequest['signingRequest0'];
	const serializedPayload = signingRequest.serializedPayload;
	const serializedBytes = Buffer.from(serializedPayload, 'base64');
	const signature = sign(privKeyBytes, serializedBytes);

	const secret = {
		signingResponse: {
			signingRequest0: {
				kid: signingRequest.kid,
				signature: toString(signature, 'base64'),
			},
		},
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
