import * as dotenv from 'dotenv';
import { assert } from 'console';
import { toString, fromString } from 'uint8arrays';
import base64url from 'base64url';

dotenv.config();

const pub_key_base_64 = process.env.TEST_PUBLIC_KEY;
const priv_key_base_64 = process.env.TEST_PRIVATE_KEY;

assert(pub_key_base_64, 'TEST_PUBLIC_KEY is not defined');
assert(priv_key_base_64, 'TEST_PRIVATE_KEY is not defined');

export let pubKeyHex = toString(fromString(pub_key_base_64 as string, 'base64pad'), 'base16');
export let privKeyBytes = base64url.toBuffer(priv_key_base_64 as string);

export let didDocument: any;
export let resourceId: string;

export function setDidDocument(doc: any) {
	didDocument = doc;
}

export function getDidDocument() {
	return didDocument;
}

export function setResourceId(id: string) {
	resourceId = id;
}

export function getResourceId() {
	return resourceId;
}
