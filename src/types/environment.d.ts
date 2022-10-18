declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DID_REGISTRAR_ADDRESS: string
            DID_REGISTRAR_MNEMONIC: string
        }
    }
}

declare module "*.json" {
    const value: any;
    export default value;
}

export {}