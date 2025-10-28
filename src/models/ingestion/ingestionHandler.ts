import path from 'path';
import fs from 'fs';
import { inject, injectable } from 'tsyringe';
import { IJobResponse, ITaskResponse, IUpdateTaskBody, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import {
  MetricsCollector,
  ShapefileChunkReader,
  ProcessingState,
  ChunkProcessor,
  ShapefileChunk,
  StateManager,
  zoomLevelToResolutionDeg,
} from '@map-colonies/mc-utils';

import {
  PartFeatureProperties,
  PolygonPartsFeatureCollection,
  PolygonPartsPayload,
  rasterProductTypeSchema,
  SHAPEFILE_EXTENSIONS_LIST,
} from '@map-colonies/raster-shared';
import { IConfig, IJobHandler, IngestionJobParams } from '../../common/interfaces';
import { PolygonPartsManagerClient } from '../../clients/polygonPartsManagerClient';
import { SERVICES } from '../../common/constants';
import { ShpFeatureProperties, shpFeatureSchema } from '../../schemas/shpFile.schmea';
import { ShapefileMetrics } from '../../common/otel/metrics/shapeFileMetrics';
import { ShapefileNotFoundError } from '../../common/errors';

@injectable()
export class IngestionJobHandler implements IJobHandler<IngestionJobParams, ProcessingState> {
  private readonly maxVerticesPerChunk: number;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient,
    @inject(ShapefileMetrics) private readonly shapeFileMetrics: ShapefileMetrics,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    this.maxVerticesPerChunk = config.get<number>('jobDefinitions.tasks.validations.chunkMaxVertices');
  }

  public async processJob(job: IJobResponse<IngestionJobParams, unknown>, task: ITaskResponse<ProcessingState>): Promise<void> {
    try {
      this.validateShapefileExists(job.parameters.inputFiles.metadataShapefilePath);
      const shpReader = this.setupShapefileChunkReader(job, task);
      const chunkProcessor = this.setupChunkProcessor(job);
      await shpReader.readAndProcess(job.parameters.inputFiles.metadataShapefilePath, chunkProcessor);

      this.logger.info({ msg: 'all chunks processed' });

      this.logger.info({ msg: 'updating additionalParams for job', jobId: job.id });
      // await this.queueClient.jobManagerClient.updateJob(job.id, updatedJobParams);
    } catch (error) {
      this.logger.error({ msg: 'error while processing job', error });
      throw error;
    }
  }

  protected async handleChunk(job: IJobResponse<IngestionJobParams, unknown>, featureCollection: PolygonPartsFeatureCollection): Promise<void> {
    const requestBody = this.createPolygonPartsPayload(job, featureCollection);
    this.logger.info({ msg: 'sending polygon parts to polygon parts manager', partsCount: featureCollection.features.length });
    await this.polygonPartsManager.validatePolygonParts(requestBody);
  }

  private setupShapefileChunkReader(job: IJobResponse<IngestionJobParams, unknown>, task: ITaskResponse<ProcessingState>): ShapefileChunkReader {
    const metricsCollector: MetricsCollector = {
      onChunkMetrics: (metrics) => {
        this.logger.info({ msg: 'chunk metrics', metrics });
        this.shapeFileMetrics.recordChunk(metrics);
        // metricsResult.chunk.push(metrics);
      },
      onFileMetrics: (metrics) => {
        this.logger.info({ msg: 'file metrics', metrics });
      },
    };

    const stateManager: StateManager = {
      loadState: () => task.parameters,
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

        const validFeatureCollection = this.mapAndValidateChunk(chunk, job);

        await this.handleChunk(job, validFeatureCollection);
        this.logger.info({ msg: 'chunk processed', chunkId: chunk.id, featuresCount: validFeatureCollection.features.length });
      },
    };
  }

  private mapAndValidateChunk(chunk: ShapefileChunk, job: IJobResponse<IngestionJobParams, unknown>): PolygonPartsFeatureCollection {
    const shpFeatures = shpFeatureSchema.array().safeParse(chunk.features);
    if (!shpFeatures.success) {
      this.logger.error({ msg: 'error validating features in chunk', chunkId: chunk.id, errors: shpFeatures.error.errors });
      shpFeatures.error.flatten();
      const message = shpFeatures.error.format();
      const result = message._errors.toString();
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(result); //later report which features are invalid
    }

    const mappedFeatures = shpFeatures.data.map((feature) => {
      const mappedProperties = this.mapShpPropertiesSchemaToPartProperties(feature.properties, job.parameters.ingestionResolution);
      return {
        ...feature,
        properties: mappedProperties,
      };
    });
    return { type: 'FeatureCollection', features: mappedFeatures };
  }

  private validateShapefileExists(shapefilePath: string): void {
    const parsed = path.parse(shapefilePath);
    const basePath = path.join(parsed.dir, parsed.name);
    const missing: string[] = [];

    for (const ext of SHAPEFILE_EXTENSIONS_LIST) {
      const filePath = basePath + ext;
      if (!fs.existsSync(filePath)) {
        missing.push(filePath);
      }
    }

    if (missing.length > 0) {
      this.logger.error({ msg: 'shapefile is missing required files', basePath, missingFiles: missing });
      throw new ShapefileNotFoundError(basePath, missing);
    }
  }

  private mapShpPropertiesSchemaToPartProperties(shpProps: ShpFeatureProperties, ingestionResolution: number): PartFeatureProperties {
    return {
      id: shpProps.id,
      sourceId: shpProps.sourceId,
      sourceName: shpProps.sourceName,
      horizontalAccuracyCE90: shpProps.ep90,
      imagingTimeBeginUTC: shpProps.updateDate,
      imagingTimeEndUTC: shpProps.updateDate,
      sourceResolutionMeter: shpProps.sourceRes,
      resolutionMeter: ingestionResolution,
      resolutionDegree: zoomLevelToResolutionDeg(ingestionResolution)!,
      sensors: shpProps.sensors,
      description: shpProps.desc ?? '',
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
    state: Partial<ProcessingState>,

    job: IJobResponse<IngestionJobParams, unknown>,
    task: ITaskResponse<ProcessingState>
  ): Promise<void> {
    this.logger.info({ msg: 'update task parameters', state });

    const newParameters = {
      ...task.parameters,
      ...state,
    };
    const taskUpdateBody: IUpdateTaskBody<Partial<ProcessingState>> = {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      percentage: Number(state.progress?.percentage.toFixed() ?? 0),
      parameters: newParameters,
    };
    await this.queueClient.jobManagerClient.updateTask(job.id, task.id, taskUpdateBody);
  }
}
