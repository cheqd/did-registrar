declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ADDRESS: string
            MNEMONIC: string
        }
    }
}

declare module "*.json" {
    const value: any;
    export default value;
}

export {}