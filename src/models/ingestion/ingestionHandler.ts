import path from 'path';
import fs from 'fs';
import { inject, injectable } from 'tsyringe';
import { IJobResponse, ITaskResponse, IUpdateTaskBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import { MetricsCollector, ShapefileChunkReader, ProcessingState, ChunkProcessor, ShapefileChunk, StateManager } from '@map-colonies/mc-utils';
import {
  PolygonPartsChunkValidationResult,
  PolygonPartsFeatureCollection,
  PolygonPartsPayload,
  polygonPartsPayloadSchema,
  rasterProductTypeSchema,
  SHAPEFILE_EXTENSIONS_LIST,
} from '@map-colonies/raster-shared';
import { ZodError } from 'zod';
import { FeatureResolutions, IConfig, IJobHandler, IngestionJobParams, ValidationTaskParameters } from '../../common/interfaces';
import { PolygonPartsManagerClient } from '../../clients/polygonPartsManagerClient';
import { SERVICES } from '../../common/constants';
import { PolygonPartFeature, ShpFeature, shpFeatureSchema } from '../../schemas/shpFile.schema';
import { ShapefileMetrics } from '../../common/otel/metrics/shapeFileMetrics';
import { ShapefileNotFoundError } from '../../common/errors';
import { calculateResMeterFromDegree } from '../../utils/utils';
import { ValidationErrorCollector } from './validationErrorCollector';

@injectable()
export class IngestionJobHandler implements IJobHandler<IngestionJobParams, ValidationTaskParameters> {
  private readonly maxVerticesPerChunk: number;
  private readonly ingestionSourcesDirPath: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient,
    @inject(ValidationErrorCollector) private readonly validationErrorCollector: ValidationErrorCollector,
    @inject(ShapefileMetrics) private readonly shapeFileMetrics: ShapefileMetrics,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    this.maxVerticesPerChunk = config.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
    this.ingestionSourcesDirPath = this.config.get<string>('ingestionSourcesDirPath');
  }

  public async processJob(
    job: IJobResponse<IngestionJobParams, ValidationTaskParameters>,
    task: ITaskResponse<ValidationTaskParameters>
  ): Promise<void> {
    try {
      this.validateShapefilesExists(job.parameters.inputFiles.metadataShapefilePath);
      const shpReader = this.setupShapefileChunkReader(job, task);

      const shapeFileStats = await shpReader.getShapefileStats(job.parameters.inputFiles.metadataShapefilePath);
      this.logger.info({ msg: 'shapefile stats retrieved', shapeFileStats });
      this.validationErrorCollector.setShapefileStats(shapeFileStats);

      const chunkProcessor = this.setupChunkProcessor(job);
      await shpReader.readAndProcess(job.parameters.inputFiles.metadataShapefilePath, chunkProcessor);

      this.logger.info({ msg: 'all chunks processed' });
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
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
      loadState: () => task.parameters.processingState,
      saveState: async (state) => {
        await this.updateTaskParams(state, job, task);
      },
    };

    const reader = new ShapefileChunkReader({
      logger: this.logger,
      maxVerticesPerChunk: this.maxVerticesPerChunk,
      metricsCollector,
      stateManager,
      generateFeatureId: false,
    });

    this.logger.info({ msg: 'shapefile chunk reader initialized', maxVerticesPerChunk: this.maxVerticesPerChunk });
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
          this.validationErrorCollector.addVerticesErrors(chunk.skippedFeatures, chunk.id, this.maxVerticesPerChunk);
        }

        this.logger.info({ msg: 'vertices errors added', chunkId: chunk.id });
        const validFeatureCollection = this.parseChunk(chunk, job);

        const validationResult = await this.validateChunk(job, validFeatureCollection);
        this.validationErrorCollector.addValidationErrors(validationResult, chunk.features, chunk.id);
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

  private validateShapefilesExists(shapefileRelativePath: string): void {
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
    const validCatalogId = polygonPartsPayloadSchema.pick({ catalogId: true }).parse(job.internalId).catalogId;

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

  private async updateTaskParams(
    state: ProcessingState,
    job: IJobResponse<IngestionJobParams, unknown>,
    task: ITaskResponse<ValidationTaskParameters>
  ): Promise<void> {
    this.logger.info({ msg: 'update task parameters', state });

    const newParameters: ValidationTaskParameters = {
      ...task.parameters,
      processingState: { ...task.parameters.processingState, ...state },
    };
    const taskUpdateBody: IUpdateTaskBody<Partial<ValidationTaskParameters>> = {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      percentage: Number(state.progress?.percentage.toFixed()),
      parameters: newParameters,
    };
    await this.queueClient.jobManagerClient.updateTask(job.id, task.id, taskUpdateBody);
  }
}
