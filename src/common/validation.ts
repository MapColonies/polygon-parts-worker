import { partSchema, PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { ingestionNewRequestBodySchema } from '../schemas/polyPartsManager.schema';
import { JobParams } from './interfaces';

export function validateIngestionJob(job: IJobResponse<JobParams, unknown>): PolygonPartsPayload {
  const requestBody = {
    productId: job.resourceId,
    productType: job.productType,
    catalogId: job.internalId,
    productVersion: job.version,
    partsData: job.parameters.partsData,
  };

  requestBody.partsData.forEach((part) => {
    partSchema.parse(part);
  });
  const validatedRequestBody: PolygonPartsPayload = ingestionNewRequestBodySchema.parse(requestBody);
  return validatedRequestBody;
}
