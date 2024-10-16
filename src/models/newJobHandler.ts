import { inject, injectable } from 'tsyringe';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsPayload, partSchema } from '@map-colonies/mc-model-types';
import { Logger } from '@map-colonies/js-logger';
import { IJobHandler } from '../common/interfaces';
import { ingestionNewRequestBodySchema } from '../schemas/polyPartsManager.schema';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { SERVICES } from '../common/constants';

@injectable()
export class NewJobHandler implements IJobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) {}

  public async processJob(job: IJobResponse<PolygonPartsPayload, unknown>): Promise<void> {
    const requestBody = {
      productId: job.resourceId,
      productType: job.productType,
      catalogId: job.internalId,
      productVersion: job.version,
      partsData: job.parameters.partsData,
    };

    try {
      requestBody.partsData.forEach((part) => {
        partSchema.parse(part);
      });
      const validatedRequestBody: PolygonPartsPayload = ingestionNewRequestBodySchema.parse(requestBody);

      this.logger.info('creating new polygon part', validatedRequestBody);
      await this.polygonPartsManager.createPolygonParts(validatedRequestBody);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }
}
