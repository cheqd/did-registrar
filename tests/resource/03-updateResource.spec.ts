import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString, fromString } from 'uint8arrays';
import { getDidDocument, getResourceId, privKeyBytes } from 'fixtures';

let didUrlState;
let resourceJobId;

test('resource-update. Initiate Resource update procedure', async ({ request }) => {
	const didPayload = getDidDocument();
	const resourceId = getResourceId();
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			name: 'ResourceName',
			type: 'TextDocument',
			content: ['SGVsbG8gV29ybGQ='],
			version: '2.0',
			relativeDidUrl: '/resources/' + resourceId,
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

test('resource-update. Send the final request for Resource update', async ({ request }) => {
	const didPayload = getDidDocument();
	const resourceId = getResourceId();
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

	const resourceUpdate = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			content: ['SGVsbG8gV29ybGQ='],
			name: 'ResourceName',
			type: 'TextDocument',
			version: '1.0',
			jobId: resourceJobId,
			relativeDidUrl: '/resources/' + resourceId,
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
	expect(response.didUrlState.version).toEqual('2.0');
});

test('resource-update. Resource update without relativeDidUrl', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: didPayload.id,
			name: 'ResourceName',
			type: 'TextDocument',
			content: ['SGVsbG8gV29ybGQ='],
			version: '3.0',
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

test('resource-update. Send the final update without relativeDidUrl', async ({ request }) => {
	const didPayload = getDidDocument();
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
