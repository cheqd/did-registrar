import { v4 } from "uuid"
import { IJobModel, Job } from "../database/model"
import { IState } from "../types/types"

export class JobService {
    async create(data: any, state: IState): Promise<boolean> {
        const job = new Job({
            jobId: v4(),
            didDocument: data,
            state
        })
        try {
            await job.save()
            return true
        } catch {
            return false
        }
    }

    async getById(id: string): Promise<IJobModel> {
        const job = (await Job.findOne(
            {jobId: id},
            "-_id -__v"
        ).lean()) as IJobModel
        return job
    }
}