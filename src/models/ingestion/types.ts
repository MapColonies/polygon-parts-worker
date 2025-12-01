import { featuresErrorCountSchema, thresholdCheckSchema, thresholdsSchema, ValidationErrorType } from '@map-colonies/raster-shared';
import { Feature, Geometry } from 'geojson';
import { z } from 'zod';

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
