import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsPayload, partSchema } from '@map-colonies/raster-shared';
import { ingestionNewRequestBodySchema } from '../schemas/polyPartsManager.schema';
import { IngestionJobParams } from './interfaces';

export function validateIngestionJob(job: IJobResponse<IngestionJobParams, unknown>): PolygonPartsPayload {
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
