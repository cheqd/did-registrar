import { SignInfo } from "@cheqd/ts-proto/cheqd/did/v2";
import { base64ToBytes } from "did-jwt";
import { ISignInfo } from "../types/types";

export function randomStr() {
    var arr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var ans = '';
    for (var i = 32; i > 0; i--) {
        ans += 
          arr[Math.floor(Math.random() * arr.length)];
    }
    return ans;
}

export function jsonConcat(o1: Record<string, any>, o2: Record<string, any>) : any{
    for (var key in o2) {
    if(Array.isArray(o1[key])) {
        o1[key].push(...o2[key])
    } else {
        o1[key] = o2[key]
    }}
    return o1
}

export function jsonSubtract(o1: Record<string, any>, o2: Record<string, any>) : any{
    for (var key in o2) {
        if(o2[key] == o1[key]) {
            delete(o1[key])
        }
    }
    return o2
}


export function convertToSignInfo(payload: ISignInfo[]): SignInfo[] {
    return payload.map((value)=>{
        return {
            verificationMethodId: value.verificationMethodId,
            signature: base64ToBytes(value.signature)
        }
    })
}