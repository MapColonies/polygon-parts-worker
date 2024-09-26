import { inject, injectable } from 'tsyringe';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsPayload, partSchema } from '@map-colonies/mc-model-types';
import { Logger } from '@map-colonies/js-logger';
import { fromError } from 'zod-validation-error';
import { IJobHandler } from '../common/interfaces';
import { newRequestBodySchema } from '../schemas/polyPartsManager.schema';
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
      productId: job.id,
      productType: job.productType,
      catalogId: job.internalId,
      productVersion: job.version,
      partsData: job.parameters.partsData,
    };

    try {
      requestBody.partsData.forEach((part) => {
        partSchema.parse(part);
      });
      const validatedRequestBody: PolygonPartsPayload = newRequestBodySchema.parse(requestBody);

      this.logger.info('creating new polygon part', validatedRequestBody);
      await this.polygonPartsManager.createPolygonParts(validatedRequestBody);
    } catch (error) {
      const validationError = fromError(error);

      this.logger.error(validationError.toString());
      throw validationError;
    }
  }
}
