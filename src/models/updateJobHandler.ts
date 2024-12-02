import { inject, injectable } from 'tsyringe';
import { PolygonPartsEntityName, PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { Logger } from '@map-colonies/js-logger';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, JobProfile } from '../common/interfaces';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { HANDLERS, SERVICES } from '../common/constants';
import { validateJob } from '../common/validation';

const isSwapMapper = new Map([
  [HANDLERS.UPDATE, false],
  [HANDLERS.SWAP, true],
]);

@injectable()
export class UpdateJobHandler implements IJobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) {}

  public async processJob(job: JobProfile): Promise<PolygonPartsEntityName> {
    const isSwap = isSwapMapper.get(job.type);

    if (isSwap === undefined) {
      throw new BadRequestError(`jobType invalid ${job.type}, isSwap parameter is required for update jobs`);
    }

    try {
      const validatedRequestBody: PolygonPartsPayload = validateJob(job);
      this.logger.info('creating update polygon part', validatedRequestBody, isSwap);

      return await this.polygonPartsManager.updatePolygonParts(validatedRequestBody, isSwap);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }
}
