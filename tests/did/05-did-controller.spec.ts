import { test, expect } from '@playwright/test';
import { sign } from '@stablelib/ed25519';
import { fromString, toString } from 'uint8arrays';
import { privKeyBytes, pubKeyHex } from 'fixtures';
import { IVerificationKeys, VerificationMethods, createDidPayload, createDidVerificationMethod } from '@cheqd/sdk';
import { v4 } from 'uuid';

let didState;
let jobId;

test('did-create. Initiate DID Create procedure with external controller', async ({ request }) => {
    const methodSpecificId = v4()
    const didUrl = `did:cheqd:testnet:${methodSpecificId}`

    const publicKey = toString(fromString(pubKeyHex, 'hex'), 'base64')
    const verificationKeys: IVerificationKeys[] = [
        {
            methodSpecificId,
            didUrl,
            keyId: `${didUrl}#key-1`,
            publicKey: publicKey,
        },
        {
            methodSpecificId,
            didUrl,
            keyId: `${didUrl}#key-2`,
            publicKey: publicKey,
        },
        {
            methodSpecificId,
            didUrl,
            keyId: `${didUrl}#key-3`,
            publicKey: publicKey,
        }
    ]
    // TODO: fix createDidVerificationMethod in sdk to avoid duplicates in controller
    const verificationMethods = createDidVerificationMethod([VerificationMethods.Ed255192020, VerificationMethods.Ed255192020, VerificationMethods.JWK], verificationKeys);
    
    const newDidDocument = createDidPayload(verificationMethods, verificationKeys)
    newDidDocument.controller = [ newDidDocument.controller[0] ]
	const payload = await request.post('/1.0/create', {
		data: {
			didDocument: newDidDocument,
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

test('did-create. Send the final request for DID creating with external controller', async ({ request }) => {
    const signingRequest = didState.signingRequest['signingRequest1']; // send signature from second verification method

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

	const didCreate = await request.post(`/1.0/create/`, {
		data: {
			jobId: jobId,
			secret: secret,
			options: {
				network: 'testnet',
			}
		},
	});

	expect(didCreate.status()).toBe(201);
});
