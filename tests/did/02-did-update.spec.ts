import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString } from 'uint8arrays';
import { getDidDocument, privKeyBytes } from 'fixtures';

let didPayload;
let didState;
let jobId;

test('did-update. Initiate DID Update procedure with serviceEndpoint array', async ({ request }) => {
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

test('did-update. Initiate DID Update procedure with serviceEndpoint as string and additional params', async ({ request }) => {
	didPayload = getDidDocument();
	// Change didPayload
	didPayload = {
		...didPayload,
		service: [
			{
				id: `${didPayload.id}#service-2`,
				type: 'did-communication',
				serviceEndpoint: 'https://example.com/didcomm',
				accept: ['didcomm/v2'],
				routingKeys: [`${didPayload.id}#key-1`],
				priority: 1,
				recipientKeys: [`${didPayload.id}#key-2`],
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

test('did-update. Send the final request for updating DID with additional service params', async ({ request }) => {
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
	const response =  await didUpdate.json();
	expect(response.didState).toBeDefined();
	expect(response.didState.state).toBe("finished");
	expect(response.didState.didDocument).toBeDefined();
	expect(response.didState.didDocument.service).toBeDefined();
	expect(response.didState.didDocument.service[0].priority).toBe(1);
	expect(response.didState.didDocument.service[0].recipientKeys).toBeDefined();
	expect(response.didState.didDocument.service[0].routingKeys).toBeDefined();
	expect(response.didState.didDocument.service[0].accept).toBeDefined();
});

