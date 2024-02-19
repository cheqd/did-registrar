import { test, expect } from '@playwright/test';
import {sign} from '@stablelib/ed25519'
import {toString, fromString} from 'uint8arrays'
import base64url from 'base64url'

const pub_key_base_64 = "HnogtCJaLFqKS2+/B4VoD/mtMZWnODbYyuY07Zo37vc="
const priv_key_base_64 = "MB9jr7i+ii1BuWFviuTT7KVy2XEU7g70rVMpZ44NwrgeeiC0IlosWopLb78HhWgP+a0xlac4NtjK5jTtmjfu9w=="
const pubKeyHex = toString(fromString(pub_key_base_64, 'base64pad'), 'base16');
const privKeyBytes = base64url.toBuffer(priv_key_base_64);

// console.log(pubKeyHex);
// console.log(privKeyHex)

let didPayload;
let didState;
let jobId;

test('did-document. Generate the payload', async ({ request }) => {
    const payload = await request.get(`/1.0/did-document?verificationMethod=JsonWebKey2020&methodSpecificIdAlgo=uuid&network=testnet&publicKeyHex=${pubKeyHex}`)

    expect(payload.status()).toBe(200);
    const body = await payload.json();
    expect(body.didDoc).toBeDefined();
    expect(body.key).toBeDefined();
    expect(body.key.kid).toBeDefined();
    expect(body.key.publicKeyHex).toBeDefined();
    didPayload = body.didDoc;
})

test('did-create', async ({ request }) => {
    const payload = await request.post('/1.0/create', {
        data: {
            didDocument: didPayload,
            secret: {},
            options: {
                network: "testnet"
            },
        }
    })

    expect(payload.status()).toBe(200);
    const body = await payload.json();
    expect(body.jobId).toBeDefined();
    expect(body.didState).toBeDefined();
    expect(body.didState.did).toBeDefined();
    expect(body.didState.state).toBeDefined();
    expect(body.didState.secret).toBeDefined();
    didState = body.didState;
    jobId = body.jobId;
})

test('did-create. Get the status', async ({ request }) => {
    const serializedPayload = didState.signingRequest[0].serializedPayload;
    const serializedBytes = Buffer.from(serializedPayload, 'base64')
    const signature = sign(privKeyBytes, serializedBytes)

    // console.log(base64url.encode(Buffer.from(signature), 'base16'))
    const secret = {
        signingResponse: [
            {
                kid: didState.signingRequest[0].kid,
                signature: toString(signature, 'base64'),
            }
        ]
    }

    const didCreate = await request.post(`/1.0/create/`, {
        data: {
            jobId: jobId,
            secret: secret,
            options: {
                network: "testnet"
            },
            didDocument: didPayload
        }
    })

    console.log(await didCreate.text())

    expect(didCreate.status()).toBe(201);
})