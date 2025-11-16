import path from 'path';
import fs from 'fs';
import { inject, injectable } from 'tsyringe';
import { IJobResponse, ITaskResponse, IUpdateTaskBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import { MetricsCollector, ShapefileChunkReader, ProcessingState, ChunkProcessor, ShapefileChunk, StateManager } from '@map-colonies/mc-utils';
import {
  PartFeatureProperties,
  PolygonPartsFeatureCollection,
  PolygonPartsPayload,
  rasterProductTypeSchema,
  SHAPEFILE_EXTENSIONS_LIST,
} from '@map-colonies/raster-shared';
import { ZodError } from 'zod';
import { FeatureResolutions, IConfig, IJobHandler, IngestionJobParams, ValidationTaskParameters } from '../../common/interfaces';
import { PolygonPartsManagerClient } from '../../clients/polygonPartsManagerClient';
import { SERVICES } from '../../common/constants';
import { ShpFeatureProperties, shpFeatureSchema } from '../../schemas/shpFile.schema';
import { ShapefileMetrics } from '../../common/otel/metrics/shapeFileMetrics';
import { ShapefileNotFoundError } from '../../common/errors';
import { calculateResMeterFromDegree } from '../../utils/utils';

@injectable()
export class IngestionJobHandler implements IJobHandler<IngestionJobParams, ValidationTaskParameters> {
  private readonly maxVerticesPerChunk: number;
  private readonly ingestionSourcesDirPath: string;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient,
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
      const chunkProcessor = this.setupChunkProcessor(job);
      await shpReader.readAndProcess(job.parameters.inputFiles.metadataShapefilePath, chunkProcessor);

      this.logger.info({ msg: 'all chunks processed' });
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  private async handleChunk(job: IJobResponse<IngestionJobParams, unknown>, featureCollection: PolygonPartsFeatureCollection): Promise<void> {
    const requestBody = this.createPolygonPartsPayload(job, featureCollection);
    this.logger.info({ msg: 'sending polygon parts to polygon parts manager', partsCount: featureCollection.features.length });
    await this.polygonPartsManager.validate(requestBody);
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
        // const { skippedFeatures } = chunk; TODO: handle skipped features(Report them)

        const validFeatureCollection = this.parseChunk(chunk, job);

        await this.handleChunk(job, validFeatureCollection);
        this.logger.info({ msg: 'chunk processed', chunkId: chunk.id, featuresCount: validFeatureCollection.features.length });
      },
    };
  }

  private parseChunk(chunk: ShapefileChunk, job: IJobResponse<IngestionJobParams, unknown>): PolygonPartsFeatureCollection {
    const shpFeatures = shpFeatureSchema.array().safeParse(chunk.features);
    if (!shpFeatures.success) {
      this.logger.error({ msg: 'error validating features in chunk', chunkId: chunk.id, errors: shpFeatures.error.errors });
      throw new ZodError(shpFeatures.error.issues); //TODO: report which features are invalid instead of throwing an error
    }

    const featureResolutions: FeatureResolutions = {
      resolutionMeter: calculateResMeterFromDegree(job.parameters.ingestionResolution),
      resolutionDegree: job.parameters.ingestionResolution,
    };

    const mappedFeatures = shpFeatures.data.map((feature) => {
      const mappedProperties = this.mapShpPropertiesSchemaToPartProperties(feature.properties, featureResolutions);
      return {
        ...feature,
        properties: mappedProperties,
      };
    });
    return { type: 'FeatureCollection', features: mappedFeatures };
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

  private mapShpPropertiesSchemaToPartProperties(shpProps: ShpFeatureProperties, resolutions: FeatureResolutions): PartFeatureProperties {
    return {
      id: shpProps.id,
      sourceId: shpProps.sourceId,
      sourceName: shpProps.sourceName,
      horizontalAccuracyCE90: shpProps.ep90,
      imagingTimeBeginUTC: shpProps.updateDate,
      imagingTimeEndUTC: shpProps.updateDate,
      sourceResolutionMeter: shpProps.sourceRes,
      resolutionMeter: resolutions.resolutionMeter,
      resolutionDegree: resolutions.resolutionDegree,
      sensors: shpProps.sensors,
      description: shpProps.desc,
      cities: shpProps.cities,
      countries: shpProps.countries,
    };
  }

  private createPolygonPartsPayload(
    job: IJobResponse<IngestionJobParams, unknown>,
    featureCollection: PolygonPartsFeatureCollection
  ): PolygonPartsPayload {
    const validProductType = rasterProductTypeSchema.parse(job.productType);

    const request: PolygonPartsPayload = {
      jobType: job.type,
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
