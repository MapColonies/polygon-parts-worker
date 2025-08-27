import { NotFoundError } from '@map-colonies/error-types';
import type { Logger } from '@map-colonies/js-logger';
import { type IJobResponse, type IUpdateJobBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import type { PolygonPartsEntityNameObject, PolygonPartsPayload } from '@map-colonies/raster-shared';
import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
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
  ) {}

  public async processJob(job: IJobResponse<IngestionJobParams, unknown>): Promise<void> {
    try {
      const validatedRequestBody = validateIngestionJob(job);
      this.logger.info('creating new polygon part', validatedRequestBody);

      const polygonPartsEntityName = await this.handlePolygonPartsEntity(job, validatedRequestBody);
      const polygonPartsEntityNameSchema = z
        .string()
        .min(1, 'polygonPartsEntityName cannot be an empty string')
        .describe('Polygon parts entity name must be a non-empty string');
      // Use Zod schema to validate the entity name - this will throw a ZodError if invalid
      polygonPartsEntityNameSchema.parse(polygonPartsEntityName.polygonPartsEntityName);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error({ msg: 'validation error', error });
        throw error;
      }
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  private async handlePolygonPartsEntity(
    job: IJobResponse<IngestionJobParams, unknown>,
    validatedRequestBody: PolygonPartsPayload
  ): Promise<PolygonPartsEntityNameObject> {
    const existingEntityName = job.parameters.additionalParams.polygonPartsEntityName as string | undefined;
    const existingEntity = await this.checkExistingPolygonPartsEntity(validatedRequestBody);
    let finalPolygonPartsEntityNameObject: PolygonPartsEntityNameObject;

    if (existingEntity !== undefined) {
      finalPolygonPartsEntityNameObject = existingEntity;
    } else {
      const newEntity = await this.createPolygonParts(validatedRequestBody);
      finalPolygonPartsEntityNameObject = newEntity;
    }

    if (existingEntityName === undefined) {
      await this.updateJobWithPolygonPartsEntity(job, finalPolygonPartsEntityNameObject);
    }

    return finalPolygonPartsEntityNameObject;
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

  private async updateJobWithPolygonPartsEntity(
    job: IJobResponse<IngestionJobParams, unknown>,
    polygonPartsEntity: PolygonPartsEntityNameObject
  ): Promise<void> {
    const updatedJobParams: IUpdateJobBody<IngestionJobParams> = this.setAdditionalParams(job, polygonPartsEntity);
    this.logger.info({ msg: 'updating additionalParams for job', jobId: job.id });
    await this.queueClient.jobManagerClient.updateJob(job.id, updatedJobParams);
  }

  private setAdditionalParams(
    job: IJobResponse<IngestionJobParams, unknown>,
    polygonPartsEntity: PolygonPartsEntityNameObject
  ): IUpdateJobBody<IngestionJobParams> {
    const newAdditionalParameters = { ...job.parameters.additionalParams, ...polygonPartsEntity };
    const newParameters = { ...job.parameters, additionalParams: { ...newAdditionalParameters } };
    return { parameters: newParameters };
  }
}
