import { injectable } from "tsyringe";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { JobHandler } from "../common/interfaces";
import httpclient

@injectable()
export class NewJobHandler implements JobHandler {
  
  public async processJob(job: IJobResponse<unknown, unknown>): Promise<void> {
    await console.log("ssdfad")
  }

}