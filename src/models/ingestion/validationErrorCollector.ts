import { inject, injectable } from 'tsyringe';
import type { Feature, Geometry } from 'geojson';
import { ProgressInfo } from '@map-colonies/mc-utils';
import { ZodError, ZodIssue } from 'zod';
import { Logger } from '@map-colonies/js-logger';
import {
  PolygonPartsChunkValidationResult,
  PolygonPartValidationErrorsType,
  ValidationAggregatedErrors,
  ValidationErrorType,
  PolygonPartValidationError,
} from '@map-colonies/raster-shared';
import { SERVICES } from '../../common/constants';
import { exceededVerticesShpFeatureSchema, featureIdSchema } from '../../schemas/shpFile.schema';
import { IConfig } from '../../common/interfaces';
import { ErrorsCount, InvalidFeature, ThresholdsResult, ValidationError } from './types';
import { VALIDATION_ERROR_TYPE_FORMATS, METADATA_ERROR_SEPARATOR, UNKNOWN_ID } from './constants';

/**
 * Collects and aggregates validation errors during shapefile processing.
 * Organizes errors by feature ID, allowing multiple errors per feature.
 * Maintains statistics for error counts, small holes, and small geometries.
 */
@injectable()
export class ValidationErrorCollector {
  private readonly invalidFeaturesMap: Map<string, InvalidFeature> = new Map();

  //Shapefile stats
  private shapefileStats: Pick<ProgressInfo, 'totalVertices' | 'totalFeatures'> = {
    totalFeatures: 0,
    totalVertices: 0,
  };

  // Error counters
  private errorsCount: ErrorsCount = {
    geometryValidity: 0,
    vertices: 0,
    metadata: 0,
    resolution: 0,
    smallGeometries: 0,
    smallHoles: 0,
    unknown: 0,
  };

  //Thresholds
  private thresholdsResult: ThresholdsResult = {
    smallGeometries: {
      exceeded: false,
    },
    smallHoles: {
      exceeded: false,
      count: 0,
    },
  };
  private readonly smallGeometriesPercentageThreshold: number;
  private readonly smallHolesPercentageThreshold: number;

  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.CONFIG) private readonly config: IConfig) {
    this.smallGeometriesPercentageThreshold = this.config.get('jobDefinitions.tasks.validation.smallGeometriesPercentageThreshold');
    this.smallHolesPercentageThreshold = this.config.get('jobDefinitions.tasks.validation.smallHolesPercentageThreshold');
  }
  // Map of feature ID to invalid feature with all its errors

  /**
   * Adds multiple features with vertex limit errors from a chunk
   */
  public addVerticesErrors(features: Feature<Geometry, unknown>[], chunkId: number, maxVerticesAllowed: number): void {
    this.logger.debug({ msg: 'Adding vertices errors for features in chunk', features: features.length, chunkId });
    features.forEach((feature) => {
      this.addVerticesError(feature, chunkId, maxVerticesAllowed);
    });
  }

  /**
   * Adds metadata validation errors (Zod validation failures)
   */
  public addMetadataError(zodIssues: ZodIssue[], feature: Feature<Geometry, unknown>, chunkId: number): void {
    const id = this.extractFeatureId(feature);

    const error: ValidationError = {
      type: ValidationErrorType.METADATA,
      columnName: VALIDATION_ERROR_TYPE_FORMATS[ValidationErrorType.METADATA].columnName,
      message: zodIssues.map((issue) => issue.message).join(METADATA_ERROR_SEPARATOR),
    };

    this.addOrUpdateInvalidFeature(id, chunkId, feature, error);
  }

  /**
   * Adds validation errors from polygon-parts-manager response
   */
  public addValidationErrors(
    validationResult: PolygonPartsChunkValidationResult,
    chunkFeatures: Feature<Geometry, unknown>[],
    chunkId: number
  ): void {
    this.logger.debug({
      msg: 'Processing geometry validation errors',
      chunkId,
      partsWithErrors: validationResult.parts.length,
      totalFeaturesInChunk: chunkFeatures.length,
    });

    const featuresById = this.buildFeatureIdMap(chunkFeatures);
    this.processPartValidationErrors(validationResult.parts, featuresById, chunkId);
    this.updateThresholdsTracking(validationResult.smallHolesCount);

    this.logger.debug({
      msg: 'Geometry validation errors added to map',
      chunkId,
      featuresAddedToMap: validationResult.parts.length,
      thresholds: this.thresholdsResult,
    });
  }

  /**
   * Checks if there are critical errors that require report generation.
   * Critical errors include: vertices, metadata, geometryValidity, resolution
   * Also returns true if smallGeometries or smallHoles exceed their thresholds.
   * Returns false if only non-critical errors (smallGeometries/smallHoles below thresholds) exist.
   */
  public hasCriticalErrors(): boolean {
    const { vertices, metadata, geometryValidity, resolution } = this.errorsCount;

    // Check for critical error types
    const hasCriticalErrorTypes = vertices > 0 || metadata > 0 || geometryValidity > 0 || resolution > 0;

    // Check if small geometry/holes errors exceeded thresholds
    const hasExceededThresholds = this.thresholdsResult.smallGeometries.exceeded || this.thresholdsResult.smallHoles.exceeded;

    return hasCriticalErrorTypes || hasExceededThresholds;
  }

  /**
   * Gets features with error properties attached for shapefile writing.
   * Each error type adds a corresponding property to the feature:
   * - e_vertices: Vertex limit information
   * - e_metadata: Metadata validation errors
   * - e_validity: Geometry validity errors
   * - e_res: Resolution errors
   * - e_sm_geom: Small geometry errors
   * - e_sm_holes: Small holes errors
   */
  public getFeaturesWithErrorProperties(): Feature<Geometry, Record<string, unknown>>[] {
    return this.getInvalidFeatures().map((invalidFeature) => this.convertToFeatureWithErrorProperties(invalidFeature));
  }

  /**
   * Gets error counts
   */
  public getErrorCounts(): ErrorsCount {
    return { ...this.errorsCount };
  }

  public getThresholdsInfo(): ThresholdsResult {
    return { ...this.thresholdsResult };
  }

  /**
   * Gets comprehensive validation statistics
   */
  public getStatistics(): ValidationAggregatedErrors {
    return {
      errorsCount: this.getErrorCounts(),
      thresholds: this.getThresholdsInfo(),
    };
  }

  /**
   * Sets shapefile stats
   */
  public setShapefileStats(stats: Pick<ProgressInfo, 'totalVertices' | 'totalFeatures'>): void {
    this.shapefileStats = { ...stats };
  }

  /**
   */

  /**
   * Clears all collected errors and resets counters
   */
  public clear(): void {
    this.invalidFeaturesMap.clear();

    this.shapefileStats = {
      totalFeatures: 0,
      totalVertices: 0,
    };

    this.errorsCount = {
      geometryValidity: 0,
      vertices: 0,
      metadata: 0,
      resolution: 0,
      smallGeometries: 0,
      smallHoles: 0,
      unknown: 0,
    };

    this.thresholdsResult = {
      smallGeometries: {
        exceeded: false,
      },
      smallHoles: {
        exceeded: false,
        count: 0,
      },
    };
  }

  private getInvalidFeatures(): InvalidFeature[] {
    return Array.from(this.invalidFeaturesMap.values());
  }

  private buildFeatureIdMap(chunkFeatures: Feature<Geometry, unknown>[]): Map<string, Feature<Geometry, unknown>> {
    const featuresById = new Map<string, Feature<Geometry, unknown>>();
    chunkFeatures.forEach((feature) => {
      const featureId = this.extractFeatureId(feature);
      featuresById.set(featureId, feature);
    });
    return featuresById;
  }

  private processPartValidationErrors(
    parts: PolygonPartsChunkValidationResult['parts'],
    featuresById: Map<string, Feature<Geometry, unknown>>,
    chunkId: number
  ): void {
    parts.forEach((partError) => {
      const feature = featuresById.get(partError.id);

      if (!feature) {
        this.logger.warn({
          msg: 'Feature has validation errors but was not found in chunk features',
          validationErrors: partError.errors,
          featureId: partError.id,
          chunkId,
        });
        return;
      }

      this.addPartErrorsToFeature(partError, feature, chunkId);
    });
  }

  private addPartErrorsToFeature(partError: PolygonPartValidationError, feature: Feature<Geometry, unknown>, chunkId: number): void {
    partError.errors.forEach((errorType) => {
      const message = this.mapErrorTypeToMessage(errorType);
      const isUnknownErrorType = !(errorType in VALIDATION_ERROR_TYPE_FORMATS);
      errorType = isUnknownErrorType ? ValidationErrorType.UNKNOWN : errorType;

      const error: ValidationError = {
        type: errorType,
        columnName: VALIDATION_ERROR_TYPE_FORMATS[errorType].columnName,
        message: message,
      };

      this.addOrUpdateInvalidFeature(partError.id, chunkId, feature, error);
    });
  }

  private incrementErrorCounter(errorType: ValidationErrorType): void {
    const countKey = VALIDATION_ERROR_TYPE_FORMATS[errorType].countKey;
    this.errorsCount[countKey]++;
  }

  private updateThresholdsTracking(smallHolesCount: number): void {
    if (smallHolesCount > 0) {
      this.thresholdsResult.smallHoles.count += smallHolesCount;
      this.thresholdsResult.smallHoles.exceeded = this.checkThresholdExceeded(
        this.thresholdsResult.smallHoles.count,
        this.smallHolesPercentageThreshold
      );
    }

    this.thresholdsResult.smallGeometries.exceeded = this.checkThresholdExceeded(
      this.errorsCount.smallGeometries,
      this.smallGeometriesPercentageThreshold
    );
  }

  private addVerticesError(feature: Feature<Geometry, unknown>, chunkId: number, maxVerticesAllowed: number): void {
    const error: ValidationError = {
      type: ValidationErrorType.VERTICES,
      columnName: VALIDATION_ERROR_TYPE_FORMATS[ValidationErrorType.VERTICES].columnName,
      message: `limit: ${maxVerticesAllowed}`,
    };

    try {
      const parsedFeature = exceededVerticesShpFeatureSchema.parse(feature);
      error.message = `result:${parsedFeature.properties.vertices}, limit: ${maxVerticesAllowed}`;
    } catch (err) {
      if (err instanceof ZodError) {
        this.addMetadataError(err.issues, feature, chunkId);
      }
    } finally {
      const featureId = this.extractFeatureId(feature);
      this.addOrUpdateInvalidFeature(featureId, chunkId, feature, error);
    }
  }

  private addOrUpdateInvalidFeature(id: string, chunkId: number, feature: Feature<Geometry, unknown>, error: ValidationError): void {
    this.incrementErrorCounter(error.type);
    const existing = this.invalidFeaturesMap.get(id);

    if (existing) {
      existing.errors.push(error);
    } else {
      this.invalidFeaturesMap.set(id, {
        id,
        chunkId,
        feature,
        errors: [error],
      });
    }
  }

  private convertToFeatureWithErrorProperties(invalidFeature: InvalidFeature): Feature<Geometry, Record<string, unknown>> {
    const errorProps: Record<string, string> = {};
    const errorsByType = new Map<ValidationErrorType, ValidationError[]>();

    invalidFeature.errors.forEach((error) => {
      const errors = errorsByType.get(error.type) ?? [];
      errors.push(error);
      errorsByType.set(error.type, errors);
    });

    errorsByType.forEach((errors, errorType) => {
      const columnName = VALIDATION_ERROR_TYPE_FORMATS[errorType].columnName;
      errorProps[columnName] = errors.map((e) => e.message).join(METADATA_ERROR_SEPARATOR);
    });

    return {
      ...invalidFeature.feature,
      properties: {
        ...(invalidFeature.feature.properties as Record<string, unknown>),
        ...errorProps,
      },
    };
  }

  private checkThresholdExceeded(errorCount: number, threshold: number): boolean {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    if (this.shapefileStats.totalFeatures === 0) {
      return false;
    }

    const rawPercentage = (errorCount / this.shapefileStats.totalFeatures) * 100;
    const percentage = Number(rawPercentage.toFixed(2));
    /* eslint-enable @typescript-eslint/no-magic-numbers */
    const exceeded = percentage > threshold;

    return exceeded;
  }

  private extractFeatureId(feature: Feature<Geometry, unknown>): string {
    const parseResult = featureIdSchema.safeParse(feature.properties);
    const id = parseResult.success ? parseResult.data.id : UNKNOWN_ID;
    return id;
  }

  private mapErrorTypeToMessage(errorType: PolygonPartValidationErrorsType): string {
    switch (errorType) {
      case ValidationErrorType.GEOMETRY_VALIDITY:
        return 'Invalid Geometry';
      case ValidationErrorType.RESOLUTION:
        return 'Resolution Conflict';
      case ValidationErrorType.SMALL_GEOMETRY:
        return 'Small geometry error';
      case ValidationErrorType.SMALL_HOLES:
        return 'Contains small holes';
      default:
        return errorType;
    }
  }
}
