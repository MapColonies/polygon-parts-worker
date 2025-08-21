import { ConflictError, NotFoundError } from '@map-colonies/error-types';
import type { Logger } from '@map-colonies/js-logger';
import { type IJobResponse, type IUpdateJobBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import type { PolygonPartsEntityNameObject, PolygonPartsPayload } from '@map-colonies/raster-shared';
import { inject, injectable } from 'tsyringe';
import { ZodError } from 'zod';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { SERVICES } from '../common/constants';
import type { IJobHandler, IngestionJobParams } from '../common/interfaces';
import { validateIngestionJob } from '../common/validation';

@injectable()
export class NewJobHandler implements IJobHandler<IngestionJobParams> {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
  ) { }

  public async processJob(job: IJobResponse<IngestionJobParams, unknown>): Promise<void> {
    try {
      const validatedRequestBody = validateIngestionJob(job);
      this.logger.info('creating new polygon part', validatedRequestBody);

      let polygonPartsEntityName: PolygonPartsEntityNameObject;

      // Check if this is a retry scenario (polygonPartsEntityName already present in additionalParams)
      const existingEntityName = job.parameters.additionalParams.polygonPartsEntityName as string | undefined;

      if (existingEntityName !== undefined) {
        // This is a retry - check existence first
        try {
          const existingEntity = await this.checkExistingPolygonPartsEntity(validatedRequestBody);
          if (existingEntity) {
            polygonPartsEntityName = existingEntity;
          } else {
            polygonPartsEntityName = await this.createPolygonParts(validatedRequestBody);
          }
        } catch (error) {
          if (error instanceof ConflictError) {
            // Validate the existing entity name from job parameters
            if (existingEntityName === '') {
              throw new ZodError([{ code: 'custom', message: 'polygonPartsEntityName cannot be an empty string', path: ['polygonPartsEntityName'] }]);
            }
            polygonPartsEntityName = { polygonPartsEntityName: existingEntityName } as PolygonPartsEntityNameObject;
          } else {
            throw error;
          }
        }
      } else {
        // This is the first attempt - try CREATE first
        try {
          polygonPartsEntityName = await this.createPolygonParts(validatedRequestBody);
        } catch (error) {
          if (error instanceof ConflictError) {
            // Handle conflict error - entity exists but no entity name in job parameters
            throw new Error('polygonPartsEntityName is missing from additionalParams');
          } else {
            throw error;
          }
        }
      }

      const updatedJobParams: IUpdateJobBody<IngestionJobParams> = this.updateAdditionalParams(job, polygonPartsEntityName);
      this.logger.info({ msg: 'updating additionalParams for job', jobId: job.id });
      await this.queueClient.jobManagerClient.updateJob(job.id, updatedJobParams);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  private async checkExistingPolygonPartsEntity(validatedRequestBody: PolygonPartsPayload): Promise<PolygonPartsEntityNameObject | undefined> {
    const { productId, productType } = validatedRequestBody;
    try {
      const existingPolygonPartsEntityName = await this.polygonPartsManager.existsPolygonParts({ productId, productType });
      return existingPolygonPartsEntityName;
    } catch (error) {
      if (error instanceof NotFoundError) {
        this.logger.warn({ msg: 'entity not found during existence check', error });
        return undefined;
      }
      this.logger.error({ msg: 'checking existing polygon parts entity failed', error });
      throw error;
    }
  }

  private async createPolygonParts(validatedRequestBody: PolygonPartsPayload): Promise<PolygonPartsEntityNameObject> {
    try {
      return await this.polygonPartsManager.createPolygonParts(validatedRequestBody);
    } catch (error) {
      this.logger.error({ msg: 'failed creating polygon parts', error });
      throw error;
    }
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
