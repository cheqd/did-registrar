import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString } from 'uint8arrays';
import { getDidDocument, privKeyBytes } from 'fixtures';
import { v4 } from 'uuid';

let didUrlState;
let resourceJobId;
let resourceId;
test('resource-update. Initiate Resource update procedure', async ({ request }) => {
	const didPayload = getDidDocument();
	resourceId = v4();
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			content: ['SGVsbG8gV29ybGQ='],
			relativeDidUrl: '/resources/' + resourceId,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '2.0',
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

test('resource-update. Send the final request for Resource update', async ({ request }) => {
	const didPayload = getDidDocument();
	const signingRequest = didUrlState.signingRequest['signingRequest0'];
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

	const resourceUpdate = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			content: ['SGVsbG8gV29ybGQ='],
			jobId: resourceJobId,
			relativeDidUrl: '/resources/' + resourceId,
			secret: secret,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '1.0',
			},
		},
	});
	const response = await resourceUpdate.json();
	expect(resourceUpdate.status()).toBe(201);
	expect(response.didUrlState).toBeDefined();
	expect(response.didUrlState.didUrl).toBeDefined();
	expect(response.didUrlState.state).toBeDefined();
	expect(response.didUrlState.state).toEqual('finished');
	expect(response.didUrlState.name).toEqual('ResourceName');
	expect(response.didUrlState.type).toEqual('TextDocument');
	expect(response.didUrlState.version).toEqual('2.0');
});

test('resource-update. Resource update without relativeDidUrl', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			content: ['SGVsbG8gV29ybGQ='],
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
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

test('resource-update. Send the final update without relativeDidUrl', async ({ request }) => {
	const didPayload = getDidDocument();
	const signingRequest = didUrlState.signingRequest['signingRequest0'];
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

	const resourceUpdate = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			jobId: resourceJobId,
			secret: secret,
			options: {
				network: 'testnet',
			},
		},
	});
	const response = await resourceUpdate.json();
	expect(resourceUpdate.status()).toBe(201);
	expect(response.didUrlState).toBeDefined();
	expect(response.didUrlState.didUrl).toBeDefined();
	expect(response.didUrlState.state).toBeDefined();
	expect(response.didUrlState.state).toEqual('finished');
	expect(response.didUrlState.name).toEqual('ResourceName');
	expect(response.didUrlState.type).toEqual('TextDocument');
	expect(response.didUrlState.version).toEqual('3.0');
});
