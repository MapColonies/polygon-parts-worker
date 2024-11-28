import { inject, injectable } from 'tsyringe';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { PolygonPartsPayload, PolygonPartsEntityName } from '@map-colonies/mc-model-types';
import { Logger } from '@map-colonies/js-logger';
import { IJobHandler } from '../common/interfaces';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { SERVICES } from '../common/constants';
import { validateJob } from '../common/validation';

@injectable()
export class NewJobHandler implements IJobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) {}

  public async processJob(job: IJobResponse<PolygonPartsPayload, unknown>): Promise<PolygonPartsEntityName> {
    try {
      const validatedRequestBody: PolygonPartsPayload = validateJob(job);
      this.logger.info('creating new polygon part', validatedRequestBody);

      return await this.polygonPartsManager.createPolygonParts(validatedRequestBody);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }
}
