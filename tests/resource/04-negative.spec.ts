import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import { getDidDocument, getResourceId } from 'fixtures';

dotenv.config();

let activeDid = 'did:cheqd:testnet:a9ed7bb4-d706-4454-bbbc-feabebe801b8';
let indyDid = 'did:indy:sovrin:WRfXPg8dantKVubE3HX8pw';
let deactiveDid = 'did:cheqd:testnet:ca9ff47c-0286-4614-a4be-8ffa83911e09';
let didUrl = '/resources/bf94eb78-228b-4e4a-88be-1ef2fa44be48';

test('resource-create. wrong did', async ({ request }) => {
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: indyDid,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: The DID is not valid');
});

test('resource-create. Fail to send content', async ({ request }) => {
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: activeDid,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual(
		'Invalid payload: options.name, options.type and content are required'
	);
});

test('resource-create. Send wrong content type', async ({ request }) => {
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: activeDid,
			content: 50,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: Invalid payload');
});
test('resource-create. Send deactivated did', async ({ request }) => {
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: deactiveDid,
			content: 'Test Data',
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: The DID does not exist or is Deactivated');
});

test('resource-update. wrong did', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: indyDid,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: The DID is not valid');
});

test('resource-update. Fail to send content', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: activeDid,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual(
		'Invalid payload: options.name, options.type and content are required'
	);
});

test('resource-update. Send wrong content type', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: activeDid,
			content: [50],
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual(
		'Invalid payload: The content array must be provided and must have exactly one string'
	);
});
test('resource-update. Send wrong didUrl', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: deactiveDid,
			content: ['Test Data'],
			relativeDidUrl: 'abcdef',
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: The DID URL is not valid');
});
test('resource-update. Send wrong operation', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: deactiveDid,
			content: ['Test Data'],
			relativeDidUrl: didUrl,
			contentOperation: ['removeContent'],
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: Only Set operation is supported');
});
test('resource-update. Send deactivated did', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: deactiveDid,
			content: ['Test Data'],
			relativeDidUrl: didUrl,
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual('Invalid payload: The DID does not exist or is Deactivated');
});
test('resource-update. Send wrong name/type', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: activeDid,
			content: ['Test Data'],
			relativeDidUrl: '/resources/0055074c-e6da-4274-a2e0-9b504f401ed6',
			options: {
				network: 'testnet',
				name: 'ResourceNameInvalid',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual(
		'Invalid payload: Update resource name or type does not match existing resource'
	);
});
test('resource-update. Resource not found', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: activeDid,
			content: ['Test Data'],
			relativeDidUrl: '/resources/0055074c-e6da-4274-a2e0-9b504f401ed6',
			options: {
				network: 'testnet',
				name: 'NotFoundResource',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual(
		'Invalid payload: Update resource name or type does not match existing resource'
	);
});

test('resource-update. Send wrong name/type without relativeDidUrl', async ({ request }) => {
	const payload = await request.post(`/1.0/updateResource`, {
		data: {
			did: activeDid,
			content: ['Test Data'],
			options: {
				network: 'testnet',
				name: 'ResourceName2',
				type: 'TextDocument2',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.description).toEqual(
		'Invalid payload: Update resource name or type does not match existing resource'
	);
});

test('resource-create. Fail second create with same name and type', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/createResource`, {
		data: {
			did: didPayload.id,
			content: 'SGVsbG8gV29ybGQ=',
			options: {
				network: 'testnet',
				name: 'ResourceName',
				type: 'TextDocument',
				versionId: '3.0',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.state).toBeDefined();
	expect(body.didUrlState.state).toEqual('failed');
	expect(body.didUrlState.description).toEqual('Invalid payload: Resource already exists');
});

test('resource-update. Fail Resource update with existing nextversionId', async ({ request }) => {
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

	expect(payload.status()).toBe(409);

	const body = await payload.json();
	expect(body.didUrlState).toBeDefined();
	expect(body.didUrlState.state).toBeDefined();
	expect(body.didUrlState.state).toEqual('failed');
	expect(body.didUrlState.description).toEqual('Invalid payload: Update resource version or id already exists');
});
