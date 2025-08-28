import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsPayload, polygonPartsPayloadSchema } from '@map-colonies/raster-shared';
import { IngestionJobParams } from './interfaces';

export function validateIngestionJob(job: IJobResponse<IngestionJobParams, unknown>): PolygonPartsPayload {
  const requestBody = {
    productId: job.resourceId,
    productType: job.productType,
    catalogId: job.internalId,
    productVersion: job.version,
    partsData: job.parameters.partsData,
  };

  const validatedRequestBody = polygonPartsPayloadSchema.parse(requestBody);
  return validatedRequestBody;
}
