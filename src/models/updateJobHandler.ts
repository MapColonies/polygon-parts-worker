import { inject, injectable } from 'tsyringe';
import { PolygonPartsEntityName, PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { IJobResponse, IUpdateJobBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, JobParams } from '../common/interfaces';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { HANDLERS, SERVICES } from '../common/constants';
import { validateIngestionJob } from '../common/validation';

const isSwapMapper = new Map([
  [HANDLERS.UPDATE, false],
  [HANDLERS.SWAP, true],
]);

@injectable()
export class UpdateJobHandler implements IJobHandler<JobParams> {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) {}

  public async processJob(job: IJobResponse<JobParams, unknown>): Promise<void> {
    const isSwap = isSwapMapper.get(job.type);

    if (isSwap === undefined) {
      throw new BadRequestError(`jobType invalid ${job.type}, isSwap parameter is required for update jobs`);
    }

    try {
      const validatedRequestBody: PolygonPartsPayload = validateIngestionJob(job);
      this.logger.info('creating update polygon part', validatedRequestBody, isSwap);

      const polygonPartsEntity = await this.polygonPartsManager.updatePolygonParts(validatedRequestBody, isSwap);

      const updatedJobParams: IUpdateJobBody<JobParams> = this.updateAdditionalParams(job, polygonPartsEntity);
      this.logger.info({ msg: 'updating additionalParams for job', jobId: job.id });
      await this.queueClient.jobManagerClient.updateJob(job.id, updatedJobParams);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  private updateAdditionalParams(job: IJobResponse<JobParams, unknown>, polygonPartsEntity: PolygonPartsEntityName): IUpdateJobBody<JobParams> {
    const newAdditionalParameters = { ...job.parameters.additionalParams, ...polygonPartsEntity };
    const newParameters = { ...job.parameters, additionalParams: { ...newAdditionalParameters } };
    return { parameters: newParameters };
  }
}
