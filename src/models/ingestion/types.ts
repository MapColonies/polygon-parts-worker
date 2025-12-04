import { IJobResponse } from '@map-colonies/mc-priority-queue';
import {
  featuresErrorCountSchema,
  FileMetadata,
  thresholdCheckSchema,
  thresholdsSchema,
  ValidationAggregatedErrors,
  ValidationErrorType,
} from '@map-colonies/raster-shared';
import { Feature, Geometry } from 'geojson';
import { z } from 'zod';
import { IngestionJobParams, ValidationTaskParameters } from '../../common/interfaces';

/**
 * A single validation error message
 */
export interface ValidationError {
  type: ValidationErrorType;
  columnName: string;
  message: string;
}

/**
 * Feature with all its validation errors attached
 */
export interface InvalidFeature {
  id: string;
  chunkId: number;
  feature: Feature<Geometry, unknown>;
  errors: ValidationError[];
}

/**
 * Counts of different validation error types
 */
export type ErrorsCount = z.infer<typeof featuresErrorCountSchema>;

/**
 * Threshold check result
 */
export type ThresholdCheck = z.infer<typeof thresholdCheckSchema>;
export type ThresholdsResult = z.infer<typeof thresholdsSchema>;

/**
 * Validation statistics for reporting
 */
export interface ValidationStatistics {
  count: ErrorsCount;
}

/**
 * QMD metadata structure for validation error summary
 */

export interface QmdMetadataKeyword {
  vocabulary: string;
  items: string[];
}

export interface QmdMetadata {
  identifier: string;
  parentIdentifier: string;
  title: string;
  type: string;
  abstract: string;
  language?: string;
  keywords: QmdMetadataKeyword[];
}

export interface QmdFileParams {
  jobId: string;
  jobType: string;
  taskId: string;
  reportTitle: string;
  errorSummary: ValidationAggregatedErrors;
}

export interface ShapefileFinalizationParams {
  job: IJobResponse<IngestionJobParams, ValidationTaskParameters>;
  taskId: string;
  errorSummary: ValidationAggregatedErrors;
  hasCriticalErrors: boolean;
}

export type Report = Omit<FileMetadata, 'url'> & { path: string };
