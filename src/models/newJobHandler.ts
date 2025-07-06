import { ConflictError } from '@map-colonies/error-types';
import type { Logger } from '@map-colonies/js-logger';
import { type IJobResponse, type IUpdateJobBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import type { PolygonPartsEntityNameObject, PolygonPartsPayload } from '@map-colonies/raster-shared';
import { inject, injectable } from 'tsyringe';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { SERVICES } from '../common/constants';
import type { IJobHandler, IngestionJobParams } from '../common/interfaces';
import { validateIngestionJob } from '../common/validation';
import { ingestionNewInitJobSchema } from '../utils/zod.schema';

@injectable()
export class NewJobHandler implements IJobHandler<IngestionJobParams> {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) {}

  public async processJob(job: IJobResponse<IngestionJobParams, unknown>): Promise<void> {
    try {
      const validatedRequestBody = validateIngestionJob(job);
      this.logger.info('creating new polygon part', validatedRequestBody);

      const polygonPartsCreateResponse = await this.createPolygonParts(job, validatedRequestBody);

      const updatedJobParams: IUpdateJobBody<IngestionJobParams> = this.updateAdditionalParams(job, polygonPartsCreateResponse);
      this.logger.info({ msg: 'updating additionalParams for job', jobId: job.id });
      await this.queueClient.jobManagerClient.updateJob(job.id, updatedJobParams);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  private async createPolygonParts(
    job: IJobResponse<IngestionJobParams, unknown>,
    validatedRequestBody: PolygonPartsPayload
  ): Promise<PolygonPartsEntityNameObject> {
    try {
      return await this.polygonPartsManager.createPolygonParts(validatedRequestBody);
    } catch (error) {
      if (error instanceof ConflictError) {
        this.logger.warn({ msg: 'polygon parts entity already exists, proceeding processing' });
        return this.getExistingPolygonPartsEntity(job);
      } else {
        throw error;
      }
    }
  }

  private getExistingPolygonPartsEntity(job: IJobResponse<IngestionJobParams, unknown>): PolygonPartsEntityNameObject {
    const ingestionNewInitJob = ingestionNewInitJobSchema.parse(job);
    const polygonPartsEntityName = ingestionNewInitJob.parameters.additionalParams.polygonPartsEntityName;

    if (polygonPartsEntityName === undefined) {
      throw new Error('polygonPartsEntityName is missing from additionalParams');
    }
    return { polygonPartsEntityName };
  }

  private updateAdditionalParams(
    job: IJobResponse<IngestionJobParams, unknown>,
    polygonPartsEntity: PolygonPartsEntityNameObject
  ): IUpdateJobBody<IngestionJobParams> {
    const newAdditionalParameters = { ...job.parameters.additionalParams, ...polygonPartsEntity };
    const newParameters = { ...job.parameters, additionalParams: { ...newAdditionalParameters } };
    return { parameters: newParameters };
  }
}
