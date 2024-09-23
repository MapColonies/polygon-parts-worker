import { inject, injectable } from "tsyringe";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { HttpClient } from "@map-colonies/mc-utils"
import { PolygonPart, PolygonPartsPayload, ProductType } from "@map-colonies/mc-model-types";
import { z } from "zod";
import { JobHandler } from "../common/interfaces";
import { newRequestBodySchema } from "../schemas/polyPartsManager.schema"
import { PolygonPartsManagerClient } from "../clients/polygonPartsManagerClient";

@injectable()
export class NewJobHandler implements JobHandler {
  public constructor(
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) { }

  public async processJob(job: IJobResponse<PolygonPart[], unknown>): Promise<void> {


    //add zod to validate job.internalId and job.productType
    const requestBody = {
      productId: job.id,
      productType: job.productType,
      catalogId: job.internalId,
      productVersion: job.version,
      partsData: job.parameters,
    };
    const validationResult = newRequestBodySchema.safeParse(requestBody);
    if (validationResult.success) {
      const polyData: PolygonPartsPayload = validationResult.data;
      
      console.log("Valid PolyData:", polyData);
    } else {
      throw Error("unvalid request")
    }
  }

}