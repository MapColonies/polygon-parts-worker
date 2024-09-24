import { inject } from 'tsyringe';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsPayload, partSchema } from '@map-colonies/mc-model-types';
import { Logger } from '@map-colonies/js-logger';
import createError from 'http-errors';
import { JobHandler } from '../common/interfaces';
import { newRequestBodySchema } from '../schemas/polyPartsManager.schema';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { SERVICES } from '../common/constants';

export class NewJobHandler implements JobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) {}

  public async processJob(job: IJobResponse<PolygonPartsPayload, unknown>): Promise<void> {
    const requestBody = {
      productId: job.id,
      productType: job.productType,
      catalogId: job.internalId,
      productVersion: job.version,
      partsData: job.parameters,
    };
    const validationResult = newRequestBodySchema.safeParse(requestBody);
    const validationpartsData = partSchema.safeParse(requestBody.partsData);

    if (validationResult.success && validationpartsData.success) {
      const polyData: PolygonPartsPayload = validationResult.data;
      this.logger.info('creating new polygon part', polyData);

      await this.polygonPartsManager.createNewPolyParts(polyData);
    } else {
      const BAD_REQUEST_CODE = 400;
      throw createError(BAD_REQUEST_CODE, `job ${requestBody.productId} is not valid`);
    }
  }
}
