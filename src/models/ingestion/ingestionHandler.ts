import path from 'path';
import fs from 'fs';
import { inject, injectable } from 'tsyringe';
import { IJobResponse, ITaskResponse, IUpdateTaskBody, OperationStatus, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import { MetricsCollector, ShapefileChunkReader, ChunkProcessor, ShapefileChunk, StateManager } from '@map-colonies/mc-utils';
import {
  CallbackResponse,
  PolygonPartsChunkValidationResult,
  PolygonPartsFeatureCollection,
  PolygonPartsPayload,
  polygonPartsPayloadSchema,
  rasterProductTypeSchema,
  SHAPEFILE_EXTENSIONS_LIST,
  ValidationAggregatedErrors,
  ValidationCallbackData,
} from '@map-colonies/raster-shared';
import { ZodError } from 'zod';
import { FeatureResolutions, IConfig, IJobHandler, IngestionJobParams, ValidationTaskParameters } from '../../common/interfaces';
import { PolygonPartsManagerClient } from '../../clients/polygonPartsManagerClient';
import { S3_VALIDATION_REPORTS_FOLDER, SERVICES, StorageProvider, ZIP_CONTENT_TYPE } from '../../common/constants';
import { PolygonPartFeature, ShpFeature, shpFeatureSchema } from '../../schemas/shpFile.schema';
import { ShapefileMetrics } from '../../common/otel/metrics/shapeFileMetrics';
import { ShapefileNotFoundError } from '../../common/errors';
import { S3Service, UploadFile } from '../../common/storage/s3Service';
import { CallbackClient } from '../../clients/callbackClient';
import { buildUrl, calculateResMeterFromDegree } from '../../utils/utils';
import { ValidationErrorCollector } from './validationErrorCollector';
import { ShapefileReportWriter } from './shapefileReportWriter';
import { Report } from './types';

@injectable()
export class IngestionJobHandler implements IJobHandler<IngestionJobParams, ValidationTaskParameters> {
  private readonly chunkMaxVertices: number;
  private readonly ingestionSourcesDirPath: string;
  private readonly shouldUploadToS3: boolean;
  private readonly downloadServerUrl: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient,
    @inject(ValidationErrorCollector) private readonly validationErrorCollector: ValidationErrorCollector,
    @inject(ShapefileMetrics) private readonly shapeFileMetrics: ShapefileMetrics,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(ShapefileReportWriter) private readonly shapefileReportWriter: ShapefileReportWriter,
    @inject(S3Service) private readonly s3Service: S3Service,
    @inject(CallbackClient) private readonly callbackClient: CallbackClient
  ) {
    this.chunkMaxVertices = this.config.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
    this.ingestionSourcesDirPath = this.config.get<string>('ingestionSourcesDirPath');
    const provider = this.config.get<StorageProvider>('reportStorageProvider');
    this.shouldUploadToS3 = provider === StorageProvider.S3;
    const downloadServerPublicDns = this.config.get<string>('downloadServer.publicDns');
    const reportsDownloadPath = this.config.get<string>('downloadServer.reportsDownloadPath');
    this.downloadServerUrl = buildUrl(downloadServerPublicDns, reportsDownloadPath);
  }

  public async processJob(
    job: IJobResponse<IngestionJobParams, ValidationTaskParameters>,
    task: ITaskResponse<ValidationTaskParameters>
  ): Promise<void> {
    const logger = this.logger.child({ jobId: job.id, taskId: task.id });

    try {
      await this.queueClient.jobManagerClient.updateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      logger.info({ msg: 'starting ingestion validation job processing' });

      const shapefileFullPath = this.validateShapefilesExists(job.parameters.inputFiles.metadataShapefilePath);
      const shpReader = this.setupShapefileChunkReader(job, task);

      const shapeFileStats = await shpReader.getShapefileStats(shapefileFullPath);

      logger.info({ msg: 'shapefile stats retrieved', shapeFileStats });
      this.validationErrorCollector.setShapefileStats(shapeFileStats);

      const chunkProcessor = this.setupChunkProcessor(job);
      await shpReader.readAndProcess(shapefileFullPath, chunkProcessor);
      logger.info({ msg: 'all chunks processed' });

      const hasCriticalErrors = this.validationErrorCollector.hasCriticalErrors();
      logger.info({ msg: 'has critical errors', hasCriticalErrors });

      const errorsSummary = this.validationErrorCollector.getErrorsSummary();
      logger.info({ msg: 'errors summary', errorsSummary });

      this.validationErrorCollector.clear();
      logger.info({ msg: 'validation error collector cleared' });

      const report = await this.shapefileReportWriter.finalize({
        job,
        task,
        errorSummary: errorsSummary,
        hasCriticalErrors,
      });

      logger.info({ msg: 'report finalized', report });

      await this.updateTaskValidationResult(job.id, task.id, errorsSummary, hasCriticalErrors, report);

      if (this.shouldUploadToS3 && report) {
        await this.uploadReportToS3(job.id, report);
      }
    } catch (error) {
      logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  public async sendCallBacks(jobId: string, taskId: string, status: OperationStatus): Promise<void> {
    const job = await this.queueClient.jobManagerClient.getJob<IngestionJobParams, ValidationTaskParameters>(jobId, true);
    const task = job.tasks?.find((t) => t.id === taskId);
    const callbackUrls = job.parameters.callbackUrls;
    const logger = this.logger.child({ jobId, taskId, jobType: job.type, taskType: task?.type });

    if (!task) {
      logger.warn({ msg: 'task not found in job tasks' });
      return;
    }

    if (!callbackUrls || callbackUrls.length === 0) {
      logger.info({ msg: 'no callback urls provided, skipping callbacks' });
      return;
    }

    const validProductType = rasterProductTypeSchema.parse(job.productType);
    const report = task.parameters.report;
    const isValid = task.parameters.isValid ?? false;

    const links: ValidationCallbackData['links'] = report
      ? [
          {
            fileName: report.fileName,
            url: report.url,
            fileSize: report.fileSize,
          },
        ]
      : [];

    const callbackInfo =
      status === OperationStatus.FAILED
        ? { error: `${task.type} task failed` }
        : {
            message: isValid ? `${task.type} task completed successfully` : `${task.type} task completed with errors`,
            data: {
              isValid: isValid,
              links,
            },
          };

    const callbackResponse: CallbackResponse<ValidationCallbackData> = {
      jobId: job.id,
      taskId: task.id,
      jobType: job.type,
      productId: job.resourceId,
      productType: validProductType,
      version: job.version,
      taskType: task.type,
      status,
      ...callbackInfo,
    };

    logger.info({ msg: 'sending callbacks', callbackResponse });
    await this.callbackClient.send(callbackUrls, callbackResponse);
  }

  private async validateChunk(
    job: IJobResponse<IngestionJobParams, unknown>,
    featureCollection: PolygonPartsFeatureCollection
  ): Promise<PolygonPartsChunkValidationResult> {
    const requestBody = this.createPolygonPartsPayload(job, featureCollection);
    this.logger.info({ msg: 'sending polygon parts to polygon parts manager', partsCount: featureCollection.features.length });
    const validationResult = await this.polygonPartsManager.validate(requestBody);
    return validationResult;
  }

  private setupShapefileChunkReader(
    job: IJobResponse<IngestionJobParams, unknown>,
    task: ITaskResponse<ValidationTaskParameters>
  ): ShapefileChunkReader {
    const metricsCollector: MetricsCollector = {
      onChunkMetrics: (metrics) => {
        this.logger.info({ msg: 'chunk metrics', metrics });
        this.shapeFileMetrics.recordChunk(metrics);
      },
      onFileMetrics: (metrics) => {
        this.logger.info({ msg: 'file metrics', metrics });
        this.shapeFileMetrics.recordFile(metrics);
      },
    };

    const stateManager: StateManager = {
      loadState: () => task.parameters.processingState ?? null,
      saveState: async (state) => {
        const errorsSummary = this.validationErrorCollector.getErrorsSummary();
        const processingState = task.parameters.processingState ? { ...task.parameters.processingState, ...state } : state;
        const newParameters: ValidationTaskParameters = {
          ...task.parameters,
          processingState,
          errorsSummary,
        };
        await this.updateTaskParams(job.id, task.id, newParameters);
      },
    };

    const reader = new ShapefileChunkReader({
      logger: this.logger,
      maxVerticesPerChunk: this.chunkMaxVertices,
      metricsCollector,
      stateManager,
      generateFeatureId: false,
    });

    this.logger.info({ msg: 'shapefile chunk reader initialized', chunkMaxVertices: this.chunkMaxVertices });
    return reader;
  }

  private setupChunkProcessor(job: IJobResponse<IngestionJobParams, unknown>): ChunkProcessor {
    return {
      process: async (chunk: ShapefileChunk): Promise<void> => {
        this.logger.info({
          msg: 'processing chunk',
          chunkId: chunk.id,
          verticesCount: chunk.verticesCount,
          chunkSize: chunk.features.length,
          skippedFeaturesCount: chunk.skippedFeatures.length,
        });

        if (chunk.skippedFeatures.length > 0) {
          this.validationErrorCollector.addVerticesErrors(chunk.skippedFeatures, chunk.id, this.chunkMaxVertices);
          this.logger.info({ msg: 'vertices errors added', chunkId: chunk.id });
        }

        const validFeatureCollection = this.parseChunk(chunk, job);
        const shouldValidate = validFeatureCollection.features.length > 0;
        this.logger.info({ msg: 'chunk parsed', validFeaturesCount: validFeatureCollection.features.length, shouldValidate });

        if (shouldValidate) {
          const validationResult = await this.validateChunk(job, validFeatureCollection);
          const hasValidationErrors = validationResult.parts.length > 0;
          this.logger.info({ msg: 'chunk validated', validationResult, hasValidationErrors });
          if (hasValidationErrors) {
            this.validationErrorCollector.addValidationErrors(validationResult, chunk.features, chunk.id);
          }
        }

        if (this.validationErrorCollector.hasErrors()) {
          const featuresWithErrors = this.validationErrorCollector.getFeaturesWithErrorProperties();
          await this.shapefileReportWriter.writeChunk(featuresWithErrors, job.id, chunk.id);
          this.validationErrorCollector.clearInvalidFeatures();
        }
        this.logger.info({ msg: 'chunk processed', chunkId: chunk.id, featuresCount: validFeatureCollection.features.length });
      },
    };
  }

  private parseChunk(chunk: ShapefileChunk, job: IJobResponse<IngestionJobParams, unknown>): PolygonPartsFeatureCollection {
    const validFeatures: PolygonPartFeature[] = [];

    const featureResolutions: FeatureResolutions = {
      resolutionMeter: calculateResMeterFromDegree(job.parameters.ingestionResolution),
      resolutionDegree: job.parameters.ingestionResolution,
    };

    for (const feature of chunk.features) {
      try {
        const parsedFeature = shpFeatureSchema.parse(feature);
        parsedFeature.id = parsedFeature.properties.id;
        const mappedFeature = this.mapShpPropertiesSchemaToPartProperties(parsedFeature, featureResolutions);
        validFeatures.push(mappedFeature);
      } catch (error) {
        if (error instanceof ZodError) {
          this.logger.warn({ msg: 'feature validation failed', featureId: feature.id, errors: error.issues });
          this.validationErrorCollector.addMetadataError(error.issues, feature, chunk.id);
        }
      }
    }

    return { type: 'FeatureCollection', features: validFeatures };
  }

  private validateShapefilesExists(shapefileRelativePath: string): string {
    const shapefileFullPath = path.join(this.ingestionSourcesDirPath, shapefileRelativePath);
    const parsed = path.parse(shapefileFullPath);
    const basePath = path.join(parsed.dir, parsed.name);
    const missing: string[] = [];

    for (const ext of SHAPEFILE_EXTENSIONS_LIST) {
      const filePath = basePath + ext;
      if (!fs.existsSync(filePath)) {
        missing.push(filePath);
      }
    }

    if (missing.length > 0) {
      this.logger.error({ msg: 'shapefiles are missing required files', basePath, missingFiles: missing });
      throw new ShapefileNotFoundError(basePath, missing);
    }

    return shapefileFullPath;
  }

  private mapShpPropertiesSchemaToPartProperties(feature: ShpFeature, resolutions: FeatureResolutions): PolygonPartFeature {
    const mappedProperties = {
      id: feature.properties.id,
      sourceId: feature.properties.sourceId,
      sourceName: feature.properties.sourceName,
      horizontalAccuracyCE90: feature.properties.ep90,
      imagingTimeBeginUTC: feature.properties.updateDate,
      imagingTimeEndUTC: feature.properties.updateDate,
      sourceResolutionMeter: feature.properties.sourceRes,
      resolutionMeter: resolutions.resolutionMeter,
      resolutionDegree: resolutions.resolutionDegree,
      sensors: feature.properties.sensors,
      description: feature.properties.desc,
      cities: feature.properties.cities,
      countries: feature.properties.countries,
    };
    return {
      ...feature,
      properties: mappedProperties,
    };
  }

  private createPolygonPartsPayload(
    job: IJobResponse<IngestionJobParams, unknown>,
    featureCollection: PolygonPartsFeatureCollection
  ): PolygonPartsPayload {
    const validProductType = rasterProductTypeSchema.parse(job.productType);
    const validCatalogId = polygonPartsPayloadSchema.pick({ catalogId: true }).shape.catalogId.parse(job.internalId);

    const request: PolygonPartsPayload = {
      jobType: job.type,
      catalogId: validCatalogId,
      productId: job.resourceId,
      productType: validProductType,
      productVersion: job.version,
      partsData: featureCollection,
    };

    return request;
  }

  private async updateTaskParams(jobId: string, taskId: string, newTaskParameters: ValidationTaskParameters): Promise<void> {
    this.logger.info({ msg: 'updating task parameters', jobId, taskId, newTaskParameters });
    const taskUpdateBody: IUpdateTaskBody<Partial<ValidationTaskParameters>> = {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      percentage: Number(newTaskParameters.processingState?.progress?.percentage.toFixed()),
      parameters: newTaskParameters,
    };
    await this.queueClient.jobManagerClient.updateTask(jobId, taskId, taskUpdateBody);
  }

  private generateReportDownloadUrl(jobId: string, reportFileName: string): string {
    return `${this.downloadServerUrl}/${jobId}/${reportFileName}`;
  }

  private async uploadReportToS3(jobId: string, report: Report): Promise<void> {
    const s3Key = path.join(S3_VALIDATION_REPORTS_FOLDER, jobId, report.fileName);
    const fileToUpload: UploadFile = { filePath: report.path, s3Key, contentType: ZIP_CONTENT_TYPE };
    this.logger.info({ msg: 'uploading validation report to S3', jobId, s3Key });

    await this.s3Service.uploadFiles([fileToUpload], { deleteAfterUpload: true });
    this.logger.info({ msg: 'validation report uploaded to S3', jobId, s3Key });
  }

  private async updateTaskValidationResult(
    jobId: string,
    taskId: string,
    errorsSummary: ValidationAggregatedErrors,
    hasCriticalErrors: boolean,
    report: Report | null
  ): Promise<void> {
    const latestTask = await this.queueClient.jobManagerClient.getTask<ValidationTaskParameters>(jobId, taskId);
    const taskParameters: ValidationTaskParameters = {
      ...latestTask.parameters,
      errorsSummary,
      isValid: !hasCriticalErrors,
      ...(report && {
        report: {
          fileName: report.fileName,
          fileSize: report.fileSize,
          path: report.path,
          url: this.generateReportDownloadUrl(jobId, report.fileName),
        },
      }),
    };
    this.logger.info({ msg: 'updating task parameters', jobId, taskId: latestTask.id, newTaskParameters: taskParameters });
    await this.updateTaskParams(jobId, latestTask.id, taskParameters);
  }
}
