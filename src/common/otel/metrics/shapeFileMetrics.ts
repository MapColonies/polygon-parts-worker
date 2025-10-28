/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/naming-convention */
// src/common/telemetry/metrics/shapefileMetrics.ts
import { singleton, inject } from 'tsyringe';
import { ChunkMetrics } from '@map-colonies/mc-utils';
import { Registry, Histogram } from 'prom-client';
import { Logger } from '@map-colonies/js-logger';
import { SERVICES } from '../../constants';
import { IConfig } from '../../interfaces';

@singleton()
export class ShapefileMetrics {
  private chunkProcessingDurationHistogram?: Histogram;
  private featuresPerChunkHistogram?: Histogram;
  private durationByChunkSizeHistogram?: Histogram;

  // Configuration
  private readonly metricsEnabled: boolean;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS_REGISTRY) private readonly metricsRegistry?: Registry
  ) {
    this.metricsEnabled = this.config.get<boolean>('telemetry.metrics.enabled');

    if (this.metricsRegistry && this.metricsEnabled) {
      this.initializeMetrics();
      this.logger.info('Shapefile metrics initialized');
    }
  }

  // === Chunk Reading ===
  public recordChunk(chunkMetrics: ChunkMetrics): void {
    const { processTimeMs, readTimeMs, totalTimeMs, featuresCount, verticesCount, skippedFeaturesCount } = chunkMetrics;

    const readTimeSeconds = readTimeMs / 1000;
    const processTimeSeconds = processTimeMs / 1000;
    const totalTimeSeconds = totalTimeMs / 1000;

    //duration
    this.chunkProcessingDurationHistogram?.labels({ operation: 'read' }).observe(readTimeSeconds);
    this.chunkProcessingDurationHistogram?.labels({ operation: 'process' }).observe(processTimeSeconds);
    this.chunkProcessingDurationHistogram?.labels({ operation: 'total' }).observe(totalTimeSeconds);

    //features per chunk
    this.featuresPerChunkHistogram?.labels({}).observe(featuresCount);

    //performance by chunk size
    const chunkSizeRange = this.getChunkSizeRangeLabel(featuresCount);
    this.durationByChunkSizeHistogram?.labels({ chunk_size_range: chunkSizeRange }).observe(totalTimeSeconds);
  }

  private getChunkSizeRangeLabel(chunkSize: number): string {
    if (chunkSize <= 100) {
      return '0-100';
    } else if (chunkSize <= 500) {
      return '101-500';
    } else if (chunkSize <= 1000) {
      return '501-1000';
    } else if (chunkSize <= 2000) {
      return '1001-2000';
    } else if (chunkSize <= 5000) {
      return '2001-5000';
    } else if (chunkSize <= 10000) {
      return '5001-10000';
    } else {
      return '10001+';
    }
  }

  private initializeMetrics(): void {
    // Chunk Reading Metrics
    this.chunkProcessingDurationHistogram = new Histogram({
      name: 'shapefile_chunk_processing_duration_seconds',
      help: 'Time taken to process shapefile chunks by operation type',
      labelNames: ['file_type', 'operation'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 30, 60], // 1ms to 60 seconds
      registers: [this.metricsRegistry!],
    });

    this.featuresPerChunkHistogram = new Histogram({
      name: 'shapefile_features_per_chunk',
      help: 'Distribution of features per chunk - optimize chunk sizes',
      labelNames: ['file_type'],
      buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000], // Up to 10k features
      registers: [this.metricsRegistry!],
    });

    this.durationByChunkSizeHistogram = new Histogram({
      name: 'shapefile_duration_by_chunk_size_range_seconds',
      help: 'Processing duration grouped by chunk size ranges - THE OPTIMIZATION METRIC!',
      labelNames: ['chunk_size_range', 'file_type'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 30, 60], // 1ms to 60 seconds
      registers: [this.metricsRegistry!],
    });
  }
}
