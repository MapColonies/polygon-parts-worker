import { injectable } from "tsyringe";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { HttpClient } from "@map-colonies/mc-utils"
import { PolygonPart, PolygonPartsPayload, ProductType } from "@map-colonies/mc-model-types";
import { JobHandler } from "../common/interfaces";

@injectable()
export class NewJobHandler implements JobHandler {

  public async processJob(job: IJobResponse<PolygonPart[], unknown>): Promise<void> {


    //add zod to validate job.internalId and job.productType
    const requestBody: PolygonPartsPayload = {
      productId: job.id,
      productType: job.productType as ProductType,
      catalogId: job.internalId,
      productVersion: job.version,
      partsData: job.parameters,
    }
  }

}