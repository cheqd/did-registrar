import { expect, test } from '@playwright/test';
import { toString, fromString } from 'uint8arrays';
import { getDidDocument } from 'fixtures';

let indyDid = 'did:indy:sovrin:WRfXPg8dantKVubE3HX8pw';
let deactiveDid = 'did:cheqd:testnet:ca9ff47c-0286-4614-a4be-8ffa83911e09';

test('did-create. wrong didDocument', async ({ request }) => {
	const payload = await request.post('/1.0/create', {
		data: {
			didDocument: {},
			secret: {},
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didState).toBeDefined();
	expect(body.didState.description).toEqual(
		'Invalid payload: Provide a DID Document with at least one valid verification method'
	);
});

test('did-update. invalid did', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/update`, {
		data: {
			did: indyDid,
			didDocument: [didPayload],
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didState).toBeDefined();
	expect(body.didState.description).toEqual('Invalid payload: The DID is not valid');
});

test('did-update. Send deactivated did', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/update`, {
		data: {
			did: deactiveDid,
			didDocument: [didPayload],
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didState).toBeDefined();
	expect(body.didState.description).toEqual('Invalid payload: The DID does not exist or is Deactivated');
});

test('did-update. Send wrong operation', async ({ request }) => {
	const didPayload = getDidDocument();
	const payload = await request.post(`/1.0/update`, {
		data: {
			didDocument: [didPayload],
			did: didPayload.id,
			didDocumentOperation: ['removeFromDidDocument'],
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didState).toBeDefined();
	expect(body.didState.description).toEqual('Invalid payload: Only Set operation is supported');
});

test('did-deactivate. invalid did', async ({ request }) => {
	const payload = await request.post(`/1.0/deactivate`, {
		data: {
			did: indyDid,
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didState).toBeDefined();
	expect(body.didState.description).toEqual('Invalid payload: The DID is not valid');
});

test('did-deactivate. Send deactivated did', async ({ request }) => {
	const payload = await request.post(`/1.0/deactivate`, {
		data: {
			did: deactiveDid,
			options: {
				network: 'testnet',
			},
		},
	});

	expect(payload.status()).toBe(400);

	const body = await payload.json();
	expect(body.didState).toBeDefined();
	expect(body.didState.description).toEqual('Invalid payload: The DID does not exist or is Deactivated');
});
