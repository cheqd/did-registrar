import type { CheqdSDK, AbstractCheqdSDKModule, ICheqdSDKOptions, DIDDocument, DidStdFee, IContext } from '@cheqd/sdk';

import { createCheqdSDK, DIDModule, FeemarketModule, OracleModule, ResourceModule } from '@cheqd/sdk';
import { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2/index.js';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

import { Messages } from '../types/constants.js';
import { IOptions, RpcStatus } from '../types/types.js';

dotenv.config();

let {
	FEE_PAYER_TESTNET_MNEMONIC,
	FEE_PAYER_MAINNET_MNEMONIC,
	TESTNET_RPC_URL,
	MAINNET_RPC_URL,
	RESOLVER_URL,
	ENABLE_FALLBACK_ENDPOINTS,
	MAINNET_RPC_URL_FALLBACK,
	TESTNET_RPC_URL_FALLBACK,
} = process.env;

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

// Using interface from types

type EndpointHealth = {
	primaryUrl?: string;
	fallbackUrl?: string;
	isPrimaryHealthy: boolean;
	isFallbackHealthy: boolean;
	lastCheckedAt?: number;
};

class EndpointHealthManager {
	private readonly checkIntervalMs = 30_000;
	private timer?: ReturnType<typeof setInterval>;
	private networkToHealth: Record<NetworkType, EndpointHealth> = {
		[NetworkType.Mainnet]: {
			primaryUrl: MAINNET_RPC_URL || DefaultRPCUrl.Mainnet,
			fallbackUrl: undefined,
			isPrimaryHealthy: false,
			isFallbackHealthy: false,
		},
		[NetworkType.Testnet]: {
			primaryUrl: TESTNET_RPC_URL || DefaultRPCUrl.Testnet,
			fallbackUrl: undefined,
			isPrimaryHealthy: false,
			isFallbackHealthy: false,
		},
	};

	public async initAndStart(): Promise<void> {
		// Configure fallback usage based on feature flag
		const enabled = this.isEnabled();
		this.networkToHealth[NetworkType.Mainnet].fallbackUrl = enabled ? MAINNET_RPC_URL_FALLBACK : undefined;
		this.networkToHealth[NetworkType.Testnet].fallbackUrl = enabled ? TESTNET_RPC_URL_FALLBACK : undefined;

		// If enabled, require both fallbacks
		if (enabled && (!MAINNET_RPC_URL_FALLBACK || !TESTNET_RPC_URL_FALLBACK)) {
			console.error(Messages.FallbackEndpointsMissing);
			process.exit(1);
		}

		console.log('Registered endpoints:', {
			mainnet: {
				primary: this.networkToHealth[NetworkType.Mainnet].primaryUrl,
				fallback: this.networkToHealth[NetworkType.Mainnet].fallbackUrl,
			},
			testnet: {
				primary: this.networkToHealth[NetworkType.Testnet].primaryUrl,
				fallback: this.networkToHealth[NetworkType.Testnet].fallbackUrl,
			},
		});

		await this.checkAll();
		if (!this.hasHealthyEndpointFor(NetworkType.Mainnet) || !this.hasHealthyEndpointFor(NetworkType.Testnet)) {
			console.error(Messages.NoHealthyEndpoints);
			process.exit(1);
		}

		this.logHealthyEndpoints('Initial health status');
		this.timer = setInterval(() => {
			void this.checkAll().then(() => this.logHealthyEndpoints('Periodic health status'));
		}, this.checkIntervalMs);
	}

	public stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	public isEnabled(): boolean {
		return ENABLE_FALLBACK_ENDPOINTS === 'true';
	}

	public getPreferredUrl(network: NetworkType): string {
		const state = this.networkToHealth[network];
		if (!this.isEnabled()) {
			return state.primaryUrl as string;
		}
		if (state.isPrimaryHealthy && state.primaryUrl) {
			return state.primaryUrl;
		}
		if (state.isFallbackHealthy && state.fallbackUrl) {
			return state.fallbackUrl;
		}
		throw new Error('No healthy RPC endpoints available');
	}

	public async checkAll(): Promise<void> {
		await Promise.all([this.checkNetwork(NetworkType.Mainnet), this.checkNetwork(NetworkType.Testnet)]);
	}

	private async checkNetwork(network: NetworkType): Promise<void> {
		const state = this.networkToHealth[network];
		if (state.primaryUrl) {
			state.isPrimaryHealthy = await this.checkUrl(state.primaryUrl);
		}
		if (state.fallbackUrl) {
			state.isFallbackHealthy = await this.checkUrl(state.fallbackUrl);
		}
		state.lastCheckedAt = Date.now();
	}

	private async checkUrl(baseUrl: string): Promise<boolean> {
		try {
			const target = `${baseUrl.replace(/\/$/, '')}/status`;
			console.log('Performing health check:', target);
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 5_000);
			const res = await fetch(target, { signal: controller.signal });
			clearTimeout(timeout);

			if (!res.ok) {
				console.log('Health check failed - HTTP error:', { url: target, status: res.status });
				return false;
			}

			const data = (await res.json()) as unknown as RpcStatus;
			const catchingUp = data?.result?.sync_info?.catching_up;
			const isHealthy = catchingUp === false;

			console.log('Health check response:', {
				url: target,
				status: res.status,
				catching_up: catchingUp,
				healthy: isHealthy,
			});

			return isHealthy;
		} catch (error) {
			const target = `${baseUrl.replace(/\/$/, '')}/status`;
			console.log('Health check failed:', {
				url: target,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return false;
		}
	}

	private hasHealthyEndpointFor(network: NetworkType): boolean {
		const s = this.networkToHealth[network];
		return Boolean(s.isPrimaryHealthy || s.isFallbackHealthy);
	}

	private logHealthyEndpoints(context: string): void {
		const m = this.networkToHealth[NetworkType.Mainnet];
		const t = this.networkToHealth[NetworkType.Testnet];
		console.log(`${context} - Healthy endpoints:`, {
			mainnet: {
				primary: m.primaryUrl,
				primaryHealthy: m.isPrimaryHealthy,
				fallback: m.fallbackUrl,
				fallbackHealthy: m.isFallbackHealthy,
			},
			testnet: {
				primary: t.primaryUrl,
				primaryHealthy: t.isPrimaryHealthy,
				fallback: t.fallbackUrl,
				fallbackHealthy: t.isFallbackHealthy,
			},
		});
	}
}

export const endpointHealthManager = new EndpointHealthManager();

export class CheqdRegistrar {
	private sdk?: CheqdSDK;
	private fee?: DidStdFee;
	private currentNetwork?: NetworkType;

	public static instance = new CheqdRegistrar();

	public async connect(options: IOptions) {
		if (options.network === NetworkType.Mainnet && !FEE_PAYER_MAINNET_MNEMONIC) {
			throw new Error('No signer provided');
		} else if (!FEE_PAYER_TESTNET_MNEMONIC) {
			FEE_PAYER_TESTNET_MNEMONIC = Messages.TestnetFaucet;
		}

		this.currentNetwork = options.network;

		const rpcUrl = options.rpcUrl
			? options.rpcUrl
			: ((): string => {
					if (!endpointHealthManager.isEnabled()) {
						return options.network === NetworkType.Testnet
							? TESTNET_RPC_URL || DefaultRPCUrl.Testnet
							: MAINNET_RPC_URL || DefaultRPCUrl.Mainnet;
					}
					// Fallback endpoints enabled: require explicit network selection
					if (!options.network) {
						throw new Error('Network must be specified when fallback endpoints are enabled');
					}
					return endpointHealthManager.getPreferredUrl(options.network);
				})();

		const sdkOptions: ICheqdSDKOptions = {
			modules: [
				FeemarketModule as unknown as AbstractCheqdSDKModule,
				DIDModule as unknown as AbstractCheqdSDKModule,
				ResourceModule as unknown as AbstractCheqdSDKModule,
				OracleModule as unknown as AbstractCheqdSDKModule,
			],
			rpcUrl,
			wallet: await DirectSecp256k1HdWallet.fromMnemonic(
				options.network === NetworkType.Mainnet ? FEE_PAYER_MAINNET_MNEMONIC : FEE_PAYER_TESTNET_MNEMONIC,
				{ prefix: 'cheqd' }
			),
		};

		this.sdk = await createCheqdSDK(sdkOptions);
		this.fee = options.fee;
	}

	private async getSignerAddress(): Promise<string> {
		const accounts = await this.forceGetSdk().options.wallet.getAccounts();
		if (!accounts[0]) {
			throw new Error('No signer account available');
		}
		return accounts[0].address;
	}

	private async getDynamicDidFee(
		operation: 'create' | 'update' | 'deactivate',
		feePayer?: string
	): Promise<DidStdFee> {
		const sdk = this.forceGetSdk();
		const payer = feePayer ?? (await this.getSignerAddress());
		const context = { sdk } as IContext;

		switch (operation) {
			case 'create':
				return sdk.generateCreateDidDocFees(payer, undefined, undefined, context);
			case 'update':
				return sdk.generateUpdateDidDocFees(payer, undefined, undefined, context);
			case 'deactivate':
				return sdk.generateDeactivateDidDocFees(payer, undefined, undefined, context);
			default:
				throw new Error(`Unsupported DID operation for dynamic fee: ${operation}`);
		}
	}

	public forceGetSdk(): CheqdSDK {
		if (!this.sdk) {
			throw new Error('Cannot connect when your offline ...');
		}
		return this.sdk;
	}

	public async create(signInputs: SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
		const sdk = this.forceGetSdk();
		const signerAddress = await this.getSignerAddress();
		const fee = this.fee ?? (await this.getDynamicDidFee('create', signerAddress));

		return await sdk.createDidDocTx(signInputs, didPayload, signerAddress, fee, undefined, versionId, undefined, {
			sdk,
		});
	}

	public async update(signInputs: SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
		const sdk = this.forceGetSdk();
		const signerAddress = await this.getSignerAddress();
		const fee = this.fee ?? (await this.getDynamicDidFee('update', signerAddress));

		return await sdk.updateDidDocTx(signInputs, didPayload, signerAddress, fee, undefined, versionId, undefined, {
			sdk,
		});
	}

	public async deactivate(signInputs: SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
		const sdk = this.forceGetSdk();
		const signerAddress = await this.getSignerAddress();
		const fee = this.fee ?? (await this.getDynamicDidFee('deactivate', signerAddress));

		return await sdk.deactivateDidDocTx(
			signInputs,
			didPayload,
			signerAddress,
			fee,
			undefined,
			versionId,
			undefined,
			{ sdk }
		);
	}

	public async createResource(signInputs: SignInfo[], resourcePayload: Partial<MsgCreateResourcePayload>) {
		return await this.forceGetSdk().createLinkedResourceTx(
			signInputs,
			resourcePayload,
			await this.getSignerAddress(),
			undefined,
			undefined,
			undefined,
			{ sdk: this.forceGetSdk() }
		);
	}
}

export async function CheqdResolver(id: string) {
	const result = await fetch(`${RESOLVER_URL || DefaultResolverUrl.Cheqd}/1.0/identifiers/${id}`, {
		headers: {
			Accept: 'application/ld+json;profile=https://w3id.org/did-resolution',
		},
	});
	if (!result.ok) {
		return null;
	}
	return (await result.json()) as any;
}
