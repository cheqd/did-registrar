declare global {
	namespace NodeJS {
		interface ProcessEnv {
			FEE_PAYER_TESTNET_MNEMONIC: string;
			FEE_PAYER_MAINNET_MNEMONIC: string;
			LOCAL_STORE_TTL: number;
			PORT: number;
		}
	}
}

declare module '*.json' {
	const value: any;
	export default value;
}

export {};
