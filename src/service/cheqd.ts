import type { ICheqdSDKOptions } from '@cheqd/sdk'
import { CheqdSDK, createCheqdSDK, DIDModule, ResourceModule } from '@cheqd/sdk'
import type { AbstractCheqdSDKModule } from '@cheqd/sdk/build/modules/_'
import type { ISignInputs, DIDDocument } from '@cheqd/sdk/build/types'
import { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2'
import { SignInfo } from '@cheqd/ts-proto/cheqd/did/v2'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'

import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

import { Messages } from '../types/constants'

dotenv.config()

let { 
    FEE_PAYER_TESTNET_MNEMONIC, 
    FEE_PAYER_MAINNET_MNEMONIC 
} = process.env

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

export enum Fee {
    CreateDid = '50000000000',
    UpdateDid = '25000000000',
    DeactivateDid = '10000000000',
    Gas = '400000'
}

export class CheqdRegistrar {
    private sdk?: CheqdSDK
    private address?: string

    public static instance = new CheqdRegistrar()
   
    public async connect(network?: NetworkType) {
        if(network === NetworkType.Mainnet && !FEE_PAYER_MAINNET_MNEMONIC) {
            throw new Error('No signer provided')
        } else if(!FEE_PAYER_TESTNET_MNEMONIC) {
            FEE_PAYER_TESTNET_MNEMONIC = Messages.TestnetFaucet
        }

        const sdkOptions: ICheqdSDKOptions = {
            modules: [DIDModule as unknown as AbstractCheqdSDKModule, ResourceModule as unknown as AbstractCheqdSDKModule],
            rpcUrl: network === NetworkType.Mainnet ? DefaultRPCUrl.Mainnet : DefaultRPCUrl.Testnet,
            wallet: await DirectSecp256k1HdWallet.fromMnemonic(network === NetworkType.Mainnet ? FEE_PAYER_MAINNET_MNEMONIC : FEE_PAYER_TESTNET_MNEMONIC, {prefix: 'cheqd'})
        }
        this.sdk = await createCheqdSDK(sdkOptions)

        this.address = (await sdkOptions.wallet.getAccounts())[0].address
        if(!this.address) {
            throw new Error("Invalid signer")
        }

    }

    public forceGetSdk(): CheqdSDK{
        if(!this.sdk) {
            throw new Error('Cannot connect when your offline ...')
        }
        return this.sdk
    }

    public async create(signInputs: ISignInputs[] | SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
        return await this.forceGetSdk()
        .createDidTx(
            signInputs,
            didPayload,
            this.address!,
            { amount: [{ denom: 'ncheq', amount: Fee.CreateDid }], gas: Fee.Gas, payer: this.address },
            undefined,
            versionId,
            { sdk: this.forceGetSdk() }
        )
    }

    public async update(signInputs: ISignInputs[] | SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
        return await this.forceGetSdk()
        .updateDidTx(
            signInputs,
            didPayload,
            this.address!,
            { amount: [{ denom: 'ncheq', amount: Fee.UpdateDid }], gas: Fee.Gas, payer: this.address },
            undefined,
            versionId,
            { sdk: this.forceGetSdk() }
        )
    }

    public async deactivate(signInputs: ISignInputs[] | SignInfo[], didPayload: DIDDocument, versionId: string | undefined) {
        return await this.forceGetSdk()
        .deactivateDidTx(
            signInputs,
            didPayload,
            this.address!,
            { amount: [{ denom: 'ncheq', amount: Fee.DeactivateDid }], gas: Fee.Gas, payer: this.address },
            undefined,
            versionId,
            { sdk: this.forceGetSdk() }
        )
    }

    public async createResource(signInputs: ISignInputs[] | SignInfo[], resourcePayload: Partial<MsgCreateResourcePayload>) {
        return await this.forceGetSdk().createResourceTx(
            signInputs,
            resourcePayload,
            this.address!,
            { amount: [{ denom: 'ncheq', amount: Fee.CreateDid }], gas: Fee.Gas, payer: this.address },
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
    return (await result.json() as any)
}