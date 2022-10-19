import type { ICheqdSDKOptions } from '@cheqd/sdk'
import type { AbstractCheqdSDKModule } from '@cheqd/sdk/build/modules/_'
import type { ISignInputs } from '@cheqd/sdk/build/types'
import type { MsgCreateDidPayload, MsgUpdateDidPayload } from '@cheqd/ts-proto/cheqd/v1/tx'

import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { CheqdSDK, createCheqdSDK, DIDModule } from '@cheqd/sdk'
import * as dotenv from 'dotenv'

dotenv.config()

const { FEE_PAYER_MNEMONIC, FEE_PAYER_ADDRESS } = process.env

const FEE = { amount: [{ denom: 'ncheq', amount: '5000000' }], gas: '200000', payer: FEE_PAYER_ADDRESS }

export enum DefaultRPCUrl {
	Mainnet = 'https://rpc.cheqd.net',
	Testnet = 'https://rpc.cheqd.network'
}

export enum NetworkType {
	Mainnet = "mainnet",
	Testnet = "testnet"
}

export enum DefaultResolverUrl {
    Cheqd = "https://resolver.cheqd.net"
}

export class CheqdRegistrar {
    private sdk?: CheqdSDK

    public static instance = new CheqdRegistrar()

    constructor() {
        if(!FEE_PAYER_MNEMONIC && !FEE_PAYER_ADDRESS) {
            throw new Error('No faucet address provided')
        }
    }
    
    public async connect(network?: NetworkType) {
        if (this.sdk) return
        const sdkOptions: ICheqdSDKOptions = {
            modules: [DIDModule as unknown as AbstractCheqdSDKModule],
            rpcUrl: network === NetworkType.Mainnet ? DefaultRPCUrl.Mainnet : DefaultRPCUrl.Testnet,
            wallet: await DirectSecp256k1HdWallet.fromMnemonic(FEE_PAYER_MNEMONIC!, {prefix: 'cheqd'})
        }
        this.sdk = await createCheqdSDK(sdkOptions)
    }

    public forceGetSdk(): CheqdSDK{
        if(!this.sdk) {
            throw new Error('Cannot connect when your offline ...')
        }
        return this.sdk
    }

    public async create(signInputs: ISignInputs[], didPayload: Partial<MsgCreateDidPayload>) {
        return await this.forceGetSdk()
        .createDidTx(
            signInputs,
            didPayload,
            FEE_PAYER_ADDRESS,
            FEE,
            undefined,
            { sdk: this.forceGetSdk() }
        )
    }

    public async update(signInputs: ISignInputs[], didPayload: Partial<MsgUpdateDidPayload>) {
        return await this.forceGetSdk()
        .updateDidTx(
            signInputs,
            didPayload,
            FEE_PAYER_ADDRESS,
            FEE,
            undefined,
            { sdk: this.forceGetSdk() }
        )
    }

}

export async function CheqdResolver(id: string) {
    const result = await fetch(`${DefaultResolverUrl.Cheqd}/1.0/identifiers/${id}`)
    if (!result.ok) { 
        return null
    }
    return await result.json()
}