import * as mongoose from 'mongoose'
import { IState } from '../types/types'

export interface IJobModel extends mongoose.Document {
    jobId: string
    didDocument: any
    state: IState
}
export const JobSchema = new mongoose.Schema({
    "jobId": {type: String, required: true},
    "didDocument": {type: Object, required: true},
    "state": {type: IState, required: true}
})

export const Job = mongoose.model<IJobModel>('Job', JobSchema)