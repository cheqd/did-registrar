import { SignInfo } from "@cheqd/ts-proto/cheqd/did/v2";

import { base64ToBytes } from "did-jwt";

import { ISignInfo } from "../types/types";

export function convertToSignInfo(payload: ISignInfo[]): SignInfo[] {
    return payload.map((value)=>{
        return {
            verificationMethodId: value.verificationMethodId,
            signature: base64ToBytes(value.signature)
        }
    })
}