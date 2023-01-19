import NodeCache from 'node-cache'
import { IdentifierPayload, IState } from '../types/types';

export class LocalStore {
    private cache: NodeCache

    public static instance = new LocalStore()

    constructor() {
        this.cache = new NodeCache(); 
    }

    setItem(key: string, data: ILocalData) {
        this.cache.set(key, data, 30000)
    }

    getItem(path: string) {
        return this.cache.get(path) as ILocalData | undefined     
    }
}


export interface ILocalData {
    didDocument: IdentifierPayload
    state: IState
}