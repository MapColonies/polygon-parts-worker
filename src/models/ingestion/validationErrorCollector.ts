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
} from '@map-colonies/raster-shared';
import { SERVICES } from '../../common/constants';
import { exceededVerticesShpFeatureSchema, featureIdSchema } from '../../schemas/shpFile.schema';
import { IConfig } from '../../common/interfaces';
import { ErrorsCount, InvalidFeature, ThresholdsResult, ValidationError } from './types';
import { errorCountMapping, ErrorTypeToColumnName, metadataErrorSeparator, Unknown_ID } from './constants';

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
      columnName: ErrorTypeToColumnName[ValidationErrorType.METADATA],
      message: zodIssues.map((issue) => issue.message).join(metadataErrorSeparator),
    };

    this.addOrUpdateInvalidFeature(id, chunkId, feature, error);
  }

  /**
   * Adds geometry validation errors from polygon-parts-manager response
   */
  public addGeometryValidationErrors(
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
    this.processPartGeometryErrors(validationResult.parts, featuresById, chunkId);
    this.updateThresholdsTracking(validationResult.smallHolesCount);

    this.logger.debug({
      msg: 'Geometry validation errors added to map',
      chunkId,
      featuresAddedToMap: validationResult.parts.length,
      thresholds: this.thresholdsResult,
    });
  }

  /**
   * Checks if any errors have been collected
   */
  public hasErrors(): boolean {
    return this.invalidFeaturesMap.size > 0;
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

  private processPartGeometryErrors(
    parts: PolygonPartsChunkValidationResult['parts'],
    featuresById: Map<string, Feature<Geometry, unknown>>,
    chunkId: number
  ): void {
    parts.forEach((partError) => {
      const feature = featuresById.get(partError.id);

      if (!feature) {
        this.logger.warn({
          msg: 'Feature not found for validation error',
          featureId: partError.id,
          chunkId,
        });
        return;
      }

      this.addPartErrorsToFeature(partError, feature, chunkId);
    });
  }

  private addPartErrorsToFeature(
    partError: PolygonPartsChunkValidationResult['parts'][number],
    feature: Feature<Geometry, unknown>,
    chunkId: number
  ): void {
    partError.errors.forEach((errorType) => {
      const error: ValidationError = {
        type: errorType,
        columnName: ErrorTypeToColumnName[errorType],
        message: this.mapErrorTypeToMessage(errorType),
      };

      this.addOrUpdateInvalidFeature(partError.id, chunkId, feature, error);
    });
  }

  private incrementErrorCounter(errorType: ValidationErrorType): void {
    const countKey = errorCountMapping[errorType];
    this.errorsCount[countKey]++;
  }

  private updateThresholdsTracking(smallHolesCount: number): void {
    if (smallHolesCount > 0) {
      this.thresholdsResult.smallHoles.count += smallHolesCount;
      this.thresholdsResult.smallHoles.exceeded = this.checkSmallHolesThreshold();
    }

    this.thresholdsResult.smallGeometries.exceeded = this.checkSmallGeometriesThreshold();
  }

  private addVerticesError(feature: Feature<Geometry, unknown>, chunkId: number, maxVerticesAllowed: number): void {
    try {
      const parsedFeature = exceededVerticesShpFeatureSchema.parse(feature);

      const error: ValidationError = {
        type: ValidationErrorType.VERTICES,
        columnName: ErrorTypeToColumnName[ValidationErrorType.VERTICES],
        message: `result:${parsedFeature.properties.vertices}, limit: ${maxVerticesAllowed}`,
      };

      this.addOrUpdateInvalidFeature(parsedFeature.properties.id, chunkId, feature, error);
    } catch (err) {
      if (err instanceof ZodError) {
        this.addMetadataError(err.issues, feature, chunkId);
      }
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
      const columnName = ErrorTypeToColumnName[errorType];
      errorProps[columnName] = errors.map((e) => e.message).join(metadataErrorSeparator);
    });

    return {
      ...invalidFeature.feature,
      properties: {
        ...(invalidFeature.feature.properties as Record<string, unknown>),
        ...errorProps,
      },
    };
  }

  private checkSmallGeometriesThreshold(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const percentage = (this.errorsCount.smallGeometries / this.shapefileStats.totalFeatures) * 100;
    const exceeded = percentage > this.smallGeometriesPercentageThreshold;

    return exceeded;
  }

  private checkSmallHolesThreshold(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const percentage = (this.errorsCount.smallHoles / this.shapefileStats.totalFeatures) * 100;
    const exceeded = percentage > this.smallHolesPercentageThreshold;

    return exceeded;
  }

  private extractFeatureId(feature: Feature<Geometry, unknown>): string {
    const parseResult = featureIdSchema.safeParse(feature.properties);
    const id = parseResult.success ? parseResult.data.id : Unknown_ID;
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
        return 'Unknown error';
    }
  }
}
