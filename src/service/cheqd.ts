import type { CheqdSDK, AbstractCheqdSDKModule, ICheqdSDKOptions, DIDDocument, DidStdFee } from '@cheqd/sdk';

import { createCheqdSDK, DIDModule, FeemarketModule, ResourceModule } from '@cheqd/sdk';
import { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2/index.js';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

import { Messages } from '../types/constants.js';
import { IOptions } from '../types/types.js';

dotenv.config();

let { FEE_PAYER_TESTNET_MNEMONIC, FEE_PAYER_MAINNET_MNEMONIC } = process.env;

export enum DefaultRPCUrl {
	Mainnet = 'https://rpc.cheqd.net',
	Testnet = 'https://rpc.cheqd.network',
}

export enum NetworkType {
	Mainnet = 'mainnet',
	Testnet = 'testnet',
}

export enum DefaultResolverUrl {
	Cheqd = 'https://resolver.cheqd.net',
}

export class CheqdRegistrar {
	private sdk?: CheqdSDK;
	private fee?: DidStdFee;

	public static instance = new CheqdRegistrar();

	public async connect(options: IOptions) {
		if (options.network === NetworkType.Mainnet && !FEE_PAYER_MAINNET_MNEMONIC) {
			throw new Error('No signer provided');
		} else if (!FEE_PAYER_TESTNET_MNEMONIC) {
			FEE_PAYER_TESTNET_MNEMONIC = Messages.TestnetFaucet;
		}

		const sdkOptions: ICheqdSDKOptions = {
			modules: [
				FeemarketModule as unknown as AbstractCheqdSDKModule,
				DIDModule as unknown as AbstractCheqdSDKModule,
				ResourceModule as unknown as AbstractCheqdSDKModule,
			],
			rpcUrl: options.rpcUrl
				? options.rpcUrl
				: options.network === NetworkType.Testnet
					? DefaultRPCUrl.Testnet
					: DefaultRPCUrl.Mainnet,
			wallet: await DirectSecp256k1HdWallet.fromMnemonic(
				options.network === NetworkType.Mainnet ? FEE_PAYER_MAINNET_MNEMONIC : FEE_PAYER_TESTNET_MNEMONIC,
				{ prefix: 'cheqd' }
			),
		};

		this.sdk = await createCheqdSDK(sdkOptions);
		this.fee = options.fee;
	}

	public forceGetSdk(): CheqdSDK {
		if (!this.sdk) {
			throw new Error('Cannot connect when your offline ...');
		}
		return this.sdk;
	}

	public async create(signInputs: SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
		return await this.forceGetSdk().createDidDocTx(signInputs, didPayload, '', this?.fee, undefined, versionId, {
			sdk: this.forceGetSdk(),
		});
	}

	public async update(signInputs: SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
		return await this.forceGetSdk().updateDidDocTx(signInputs, didPayload, '', this?.fee, undefined, versionId, {
			sdk: this.forceGetSdk(),
		});
	}

	public async deactivate(signInputs: SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
		return await this.forceGetSdk().deactivateDidDocTx(
			signInputs,
			didPayload,
			'',
			this?.fee,
			undefined,
			versionId,
			{ sdk: this.forceGetSdk() }
		);
	}

	public async createResource(signInputs: SignInfo[], resourcePayload: Partial<MsgCreateResourcePayload>) {
		return await this.forceGetSdk().createLinkedResourceTx(signInputs, resourcePayload, '', this?.fee, undefined, {
			sdk: this.forceGetSdk(),
		});
	}
}

export async function CheqdResolver(id: string) {
	const result = await fetch(`${DefaultResolverUrl.Cheqd}/1.0/identifiers/${id}`, {
		headers: {
			Accept: 'application/ld+json;profile=https://w3id.org/did-resolution',
		},
	});
	if (!result.ok) {
		return null;
	}
	return (await result.json()) as any;
}
