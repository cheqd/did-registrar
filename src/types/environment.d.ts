declare global {
    namespace NodeJS {
        interface ProcessEnv {
            FEE_PAYER_ADDRESS: string
            FEE_PAYER_MNEMONIC: string
        }
    }
}

declare module "*.json" {
    const value: any;
    export default value;
}

export {}