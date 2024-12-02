import { partSchema, PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { ingestionNewRequestBodySchema } from '../schemas/polyPartsManager.schema';
import { JobResponse } from './interfaces';

export function validateJob(job: JobResponse): PolygonPartsPayload {
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
