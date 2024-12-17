import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { toString, fromString } from 'uint8arrays';
import { getDidDocument, privKeyBytes, setResourceId } from 'fixtures';

let didUrlState;
let resourceJobId;

test('resource-create. Initiate Resource creation procedure', async ({ request }) => {
	const didPayload = getDidDocument();
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

test('resource-create. Send the final request for Resource creation', async ({ request }) => {
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
	console.log('DIDUrl:' + response.didUrlState.didUrl);
	setResourceId(response.didUrlState.didUrl.split('/resources/')[1]);
});
