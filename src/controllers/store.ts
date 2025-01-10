import type { DIDDocument } from '@cheqd/sdk';
import type { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';

import NodeCache from 'node-cache';
import * as dotenv from 'dotenv';

import { IState } from '../types/types.js';

dotenv.config();

let { LOCAL_STORE_TTL } = process.env;

export class LocalStore {
	private cache: NodeCache;

	public static instance = new LocalStore();

	constructor() {
		this.cache = new NodeCache();
	}

	setItem(key: string, data: IDidDocData) {
		this.cache.set(key, data, +LOCAL_STORE_TTL || 600);
	}

	getItem(key: string) {
		return this.cache.get(key) as IDidDocData | undefined;
	}

	setResource(key: string, data: IResourceData) {
		this.cache.set(key, data, +LOCAL_STORE_TTL || 600);
	}

	getResource(key: string) {
		return this.cache.get(key) as IResourceData | undefined;
	}
}

export interface IDidDocData {
	didDocument: DIDDocument;
	state: IState;
	versionId: string;
}

export interface IResourceData {
	resource: Partial<MsgCreateResourcePayload>;
	state: IState;
	did: string;
}
