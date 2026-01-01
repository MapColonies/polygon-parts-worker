import { Feature, Geometry, Polygon } from 'geojson';
import { ZodIssue } from 'zod';
import { ValidationErrorType, PolygonPartsChunkValidationResult, PolygonPartValidationErrorsType } from '@map-colonies/raster-shared';
import { faker } from '@faker-js/faker';
import { ValidationErrorCollector } from '../../../../src/models/ingestion/validationErrorCollector';
import { configMock, registerDefaultConfig } from '../../mocks/configMock';
import { loggerMock } from '../../mocks/telemetryMock';
import { METADATA_ERROR_SEPARATOR } from '../../../../src/models/ingestion/constants';
import { createFakeShpFeatureProperties } from '../../mocks/fakeFeatures';
import { hasCriticalErrorsTestCases, getFeaturesWithErrorPropertiesTestCases } from './validationErrorCollector.cases';

describe('ValidationErrorCollector', () => {
  let collector: ValidationErrorCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    registerDefaultConfig();
    collector = new ValidationErrorCollector(loggerMock, configMock);
  });

  afterEach(() => {
    collector.clear();
  });

  describe('addVerticesErrors', () => {
    it('should add vertices errors for multiple features', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const chunkId = 1;
      const features: Feature<Geometry, unknown>[] = [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
        },
      ];

      // Act
      collector.addVerticesErrors(features, chunkId, maxVerticesAllowed);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.vertices).toBe(2);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(2);
      expect(featuresWithErrors[0].properties.e_vertices).toBeDefined();
      expect(featuresWithErrors[1].properties.e_vertices).toBeDefined();
    });

    it('should handle features with missing metadata gracefully', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const chunkId = 1;
      const { ep90, ...rest } = { ...createFakeShpFeatureProperties() };
      const featureProperties = { ...rest, vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) };
      const featureWithoutId: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: featureProperties, // Missing 'ep90' property
      };

      // Act
      collector.addVerticesErrors([featureWithoutId], chunkId, maxVerticesAllowed);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.vertices).toBe(1);
      expect(errorCounts.metadata).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_vertices).toBeDefined();
      expect(featuresWithErrors[0].properties.e_metadata).toBeDefined();
    });

    it('should increment error counter and be reflected in getErrorCounts', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const chunkId = 1;
      const features: Feature<Geometry, unknown>[] = [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
        },
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
        },
      ];

      const countsBefore = collector.getErrorCounts();
      expect(countsBefore.vertices).toBe(0);

      // Act
      collector.addVerticesErrors(features, chunkId, maxVerticesAllowed);

      // Assert
      const countsAfter = collector.getErrorCounts();
      expect(countsAfter.vertices).toBe(2);
    });
  });

  describe('addMetadataError', () => {
    it('should add metadata validation errors from Zod issues', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), updateDate: 2025, ep90: 4001 },
      };
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['updateDate'],
          message: 'Expected string, received number',
        },

        {
          code: 'too_big',
          maximum: 4000,
          type: 'number',
          inclusive: true,
          exact: false,
          path: ['ep90'],
          message: 'Horizontal accuracy CE90 should not be larger than 4000',
        },
      ];

      // Act
      collector.addMetadataError(zodIssues, feature, chunkId);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.metadata).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_metadata).toBeDefined();
      expect(featuresWithErrors[0].properties.e_metadata).toContain(`${zodIssues[0].message}${METADATA_ERROR_SEPARATOR}${zodIssues[1].message}`);
    });

    it('should be reflected in error counts and hasCriticalErrors', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), updateDate: 2025 },
      };

      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['updateDate'],
          message: 'Expected string, received number',
        },
      ];

      expect(collector.hasCriticalErrors()).toBe(false);
      const countsBefore = collector.getErrorCounts();
      expect(countsBefore.metadata).toBe(0);

      // Act
      collector.addMetadataError(zodIssues, feature, chunkId);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const countsAfter = collector.getErrorCounts();
      expect(countsAfter.metadata).toBe(1);
    });
  });

  describe('addValidationErrors', () => {
    it('should handle unknown error types gracefully', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: ['UNKNOWN_ERROR_TYPE' as PolygonPartValidationErrorsType],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], chunkId);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.unknown).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_unknown).toBeDefined();
      expect(featuresWithErrors[0].properties.e_unknown).toBe('UNKNOWN_ERROR_TYPE');
    });

    it('should handle mix of known and unknown error types', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [ValidationErrorType.GEOMETRY_VALIDITY, 'INVALID_TYPE' as PolygonPartValidationErrorsType, ValidationErrorType.RESOLUTION],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], chunkId);

      // Assert
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(1);
      expect(errorCounts.resolution).toBe(1);
      expect(errorCounts.unknown).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors[0].properties.e_validity).toBeDefined();
      expect(featuresWithErrors[0].properties.e_res).toBeDefined();
      expect(featuresWithErrors[0].properties.e_unknown).toBeDefined();
    });

    it('should add validation errors from validation result', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [ValidationErrorType.GEOMETRY_VALIDITY],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], chunkId);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_validity).toBeDefined();
    });

    it('should handle multiple error types for single feature', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [
              ValidationErrorType.GEOMETRY_VALIDITY,
              ValidationErrorType.RESOLUTION,
              ValidationErrorType.SMALL_GEOMETRY,
              ValidationErrorType.SMALL_HOLES,
            ],
          },
        ],
        smallHolesCount: 1,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], chunkId);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(1);
      expect(errorCounts.resolution).toBe(1);
      expect(errorCounts.smallGeometries).toBe(1);
      expect(errorCounts.smallHoles).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_validity).toBeDefined();
      expect(featuresWithErrors[0].properties.e_res).toBeDefined();
      expect(featuresWithErrors[0].properties.e_sm_geom).toBeDefined();
      expect(featuresWithErrors[0].properties.e_sm_holes).toBeDefined();
      expect(featuresWithErrors[0].properties.id).toBe(feature.properties.id);
    });

    it('should handle multiple features with errors', () => {
      // Arrange
      const chunkId = 1;
      const feature1: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };
      const feature2: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature1.properties.id,
            errors: [ValidationErrorType.GEOMETRY_VALIDITY, ValidationErrorType.RESOLUTION],
          },
          {
            id: feature2.properties.id,
            errors: [ValidationErrorType.SMALL_GEOMETRY],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature1, feature2], chunkId);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(1);
      expect(errorCounts.resolution).toBe(1);
      expect(errorCounts.smallGeometries).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(2);

      const feature1WithErrors = featuresWithErrors.find((f) => f.properties.id === feature1.properties.id);
      const feature2WithErrors = featuresWithErrors.find((f) => f.properties.id === feature2.properties.id);

      expect(feature1WithErrors?.properties.e_validity).toBeDefined();
      expect(feature1WithErrors?.properties.e_res).toBeDefined();
      expect(feature2WithErrors?.properties.e_sm_geom).toBeDefined();
    });

    it('should skip feature when feature is not found in chunk features', () => {
      // Arrange
      const chunkId = 1;
      const missingFeatureId = faker.string.uuid();
      const existingFeature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: missingFeatureId, // This ID does not match any feature in the chunk
            errors: [ValidationErrorType.GEOMETRY_VALIDITY, ValidationErrorType.RESOLUTION],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [existingFeature], chunkId);

      // Assert
      // No errors should be added since the feature wasn't found
      expect(collector.hasErrors()).toBe(false);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(0);
      expect(errorCounts.resolution).toBe(0);

      // No features should have errors
      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(0);
    });

    it('should update small holes and check threshold when small holes are present and exceeded', () => {
      // Arrange
      const chunkId = 1;
      const totalFeatures = 1;
      const smallHoles = 10;

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [ValidationErrorType.SMALL_HOLES],
          },
        ],
        smallHolesCount: smallHoles,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], chunkId);

      // Assert
      const thresholds = collector.getThresholdsInfo();
      const errorCounts = collector.getErrorCounts();

      expect(errorCounts.smallHoles).toBe(validationResult.parts.length);
      expect(thresholds.smallHoles.count).toBe(smallHoles);
      expect(thresholds.smallHoles.exceeded).toBe(true);
    });

    it('should update small geometries threshold when small geometries are present and exceeded', () => {
      // Arrange
      const chunkId = 1;
      const totalFeatures = 100;
      const smallGeometriesCount = 10;

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, features, chunkId);

      // Assert
      const thresholds = collector.getThresholdsInfo();
      const errorCounts = collector.getErrorCounts();

      expect(errorCounts.smallGeometries).toBe(smallGeometriesCount);
      expect(thresholds.smallGeometries.exceeded).toBe(true);
    });

    it('should be reflected in error counts', () => {
      // Arrange
      const chunkId = 1;
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [ValidationErrorType.GEOMETRY_VALIDITY, ValidationErrorType.RESOLUTION],
          },
        ],
        smallHolesCount: 0,
      };

      const countsBefore = collector.getErrorCounts();
      expect(countsBefore.geometryValidity).toBe(0);
      expect(countsBefore.resolution).toBe(0);

      // Act
      collector.addValidationErrors(validationResult, [feature], chunkId);

      // Assert
      const countsAfter = collector.getErrorCounts();
      expect(countsAfter.geometryValidity).toBe(1);
      expect(countsAfter.resolution).toBe(1);
    });
  });

  describe('hasCriticalErrors', () => {
    it('should return false when no errors collected', () => {
      // Arrange - collector is already initialized with no errors

      // Act
      const errorCounts = collector.getErrorCounts();

      // Assert
      expect(collector.hasCriticalErrors()).toBe(false);
      expect(errorCounts.geometryValidity).toBe(0);
      expect(errorCounts.vertices).toBe(0);
      expect(errorCounts.metadata).toBe(0);
      expect(errorCounts.resolution).toBe(0);
      expect(errorCounts.smallGeometries).toBe(0);
      expect(errorCounts.smallHoles).toBe(0);
      expect(errorCounts.unknown).toBe(0);

      const features = collector.getFeaturesWithErrorProperties();
      expect(features).toHaveLength(0);
    });

    test.each(hasCriticalErrorsTestCases)('should return $expectedCritical after adding $description', ({ setup, expectedCritical }) => {
      // Arrange
      expect(collector.hasCriticalErrors()).toBe(false);

      // Act
      setup(collector);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(expectedCritical);
    });

    it('should return false for only small geometries errors below threshold', () => {
      // Arrange
      const totalFeatures = 1000;
      const smallGeometriesCount = 5; // 0.5% - below threshold

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, features, 1);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(false);
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(false);
    });

    it('should return true for small geometries errors exceeding threshold', () => {
      // Arrange
      const totalFeatures = 100;
      const smallGeometriesCount = 10; // 10% - exceeds threshold

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, features, 1);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(true);
    });

    it('should return false for only small holes errors below threshold', () => {
      // Arrange
      const totalFeatures = 1000;
      const smallHolesCount = 5; // 0.5% - below threshold

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [ValidationErrorType.SMALL_HOLES],
          },
        ],
        smallHolesCount: smallHolesCount,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], 1);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(false);
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallHoles.exceeded).toBe(false);
    });

    it('should return true for small holes errors exceeding threshold', () => {
      // Arrange
      const totalFeatures = 2;
      const smallHolesCount = 10;

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const feature1: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const feature2: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature1.properties.id,
            errors: [ValidationErrorType.SMALL_HOLES],
          },
          {
            id: feature2.properties.id,
            errors: [ValidationErrorType.SMALL_HOLES],
          },
        ],
        smallHolesCount: smallHolesCount,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature1, feature2], 1);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallHoles.exceeded).toBe(true); // 2/2 features = 100% > 5% threshold
    });

    it('should return true when both critical errors and non-critical errors exist', () => {
      // Arrange
      const totalFeatures = 1000;
      const smallGeometriesCount = 2; // below threshold

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const criticalFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      const nonCriticalFeatures: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: nonCriticalFeatures.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.addVerticesErrors([criticalFeature], 1, maxVerticesAllowed);
      collector.addValidationErrors(validationResult, nonCriticalFeatures, 1);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(false);
    });

    it('should return true for unknown error types', () => {
      // Arrange
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: ['UNKNOWN_ERROR_TYPE' as PolygonPartValidationErrorsType],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], 1);

      // Assert
      expect(collector.hasCriticalErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.unknown).toBe(1);
    });
  });

  describe('getFeaturesWithErrorProperties', () => {
    it('should return empty array when no errors', () => {
      // Arrange - collector is already initialized with no errors

      // Act
      const features = collector.getFeaturesWithErrorProperties();

      // Assert
      expect(features).toEqual([]);
    });

    test.each(getFeaturesWithErrorPropertiesTestCases)('should return features with $description', ({ setup, expectedProperty }) => {
      // Arrange
      setup(collector);

      // Act
      const features = collector.getFeaturesWithErrorProperties();

      // Assert
      expect(features).toHaveLength(1);
      expect(features[0].properties[expectedProperty]).toBeDefined();
    });

    it('should preserve original feature properties', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const originalProperties = { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) };
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: originalProperties,
      };

      // Act
      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);

      // Assert
      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);

      // Verify error property was added
      expect(featuresWithErrors[0].properties.e_vertices).toBeDefined();

      // Verify all original properties are preserved
      Object.keys(originalProperties).forEach((key) => {
        if (key === 'vertices') {
          return; // We are removing this property in the error feature
        }
        expect(featuresWithErrors[0].properties[key]).toEqual(originalProperties[key as keyof typeof originalProperties]);
      });
    });
  });

  describe('getErrorCounts', () => {
    it('should return initial zero counts', () => {
      // Arrange - collector is already initialized with no errors

      // Act
      const counts = collector.getErrorCounts();

      // Assert
      expect(counts).toEqual({
        geometryValidity: 0,
        vertices: 0,
        metadata: 0,
        resolution: 0,
        smallGeometries: 0,
        smallHoles: 0,
        unknown: 0,
      });
    });

    it('should return correct counts after adding various error types', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const chunkId = 1;

      // Add vertices error
      const verticesFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };
      // Add metadata error
      const metadataFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), updateDate: 2025 },
      };
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['updateDate'],
          message: 'Expected string, received number',
        },
      ];
      // Add validation errors
      const validationFeature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };
      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: validationFeature.properties.id,
            errors: [
              ValidationErrorType.GEOMETRY_VALIDITY,
              ValidationErrorType.RESOLUTION,
              ValidationErrorType.SMALL_GEOMETRY,
              ValidationErrorType.SMALL_HOLES,
            ],
          },
        ],
        smallHolesCount: 1,
      };

      // Act
      collector.addVerticesErrors([verticesFeature], chunkId, maxVerticesAllowed);
      collector.addMetadataError(zodIssues, metadataFeature, chunkId);
      collector.addValidationErrors(validationResult, [validationFeature], chunkId);

      // Assert
      const counts = collector.getErrorCounts();
      expect(counts.vertices).toBe(1);
      expect(counts.metadata).toBe(1);
      expect(counts.geometryValidity).toBe(1);
      expect(counts.resolution).toBe(1);
      expect(counts.smallGeometries).toBe(1);
      expect(counts.smallHoles).toBe(1);
      expect(counts.unknown).toBe(0);
    });
  });

  describe('getThresholdsInfo', () => {
    it('should return initial threshold state', () => {
      // Arrange - collector is already initialized with no errors

      // Act
      const thresholds = collector.getThresholdsInfo();

      // Assert
      expect(thresholds).toEqual({
        smallGeometries: {
          exceeded: false,
        },
        smallHoles: {
          exceeded: false,
          count: 0,
        },
      });
    });

    it('should update when small geometries threshold is exceeded', () => {
      // Arrange
      const totalFeatures = 100;
      const smallGeometriesCount = 10; // 10% of total features

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, features, 1);

      // Assert
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(true);
    });

    it('should update when small holes threshold is exceeded', () => {
      // Arrange
      const totalFeatures = 2;
      const smallHolesCount = 10;

      collector.setShapefileStats({ totalFeatures, totalVertices: 300 });

      const feature1: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const feature2: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature1.properties.id,
            errors: [ValidationErrorType.SMALL_HOLES],
          },
          {
            id: feature2.properties.id,
            errors: [ValidationErrorType.SMALL_HOLES],
          },
        ],
        smallHolesCount: smallHolesCount,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature1, feature2], 1);

      // Assert
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallHoles.count).toBe(smallHolesCount);
      expect(thresholds.smallHoles.exceeded).toBe(true); // 2/2 features = 100% > 5% threshold
    });
  });

  describe('getErrorsSummary', () => {
    it('should return both error counts and thresholds', () => {
      // Arrange - collector is already initialized

      // Act
      const errorsSummary = collector.getErrorsSummary();

      // Assert
      expect(errorsSummary).toHaveProperty('errorsCount');
      expect(errorsSummary).toHaveProperty('thresholds');
    });
  });

  describe('setShapefileStats', () => {
    it('should affect threshold calculations', () => {
      // Arrange
      const totalFeatures = 100;
      const smallGeometriesCount = 10; // 10% of total features

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Test with lower percentage that shouldn't exceed threshold
      const collector2 = new ValidationErrorCollector(loggerMock, configMock);
      collector2.setShapefileStats({ totalFeatures: 1000, totalVertices: 50000 });

      const smallFeatureSet: Feature<Polygon, { id: string }>[] = Array.from({ length: 5 }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult2: PolygonPartsChunkValidationResult = {
        parts: smallFeatureSet.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, features, 1);
      collector2.addValidationErrors(validationResult2, smallFeatureSet, 1);

      // Assert
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(true);

      const thresholds2 = collector2.getThresholdsInfo();
      expect(thresholds2.smallGeometries.exceeded).toBe(false);
    });
  });

  describe('clear', () => {
    it('should reset all errors, counts, thresholds, and shapefile stats', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const chunkId = 1;
      const totalFeatures = 100;
      const smallGeometriesCount = 10;

      // Set shapefile stats
      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const verticesFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      // Add metadata error
      const metadataFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), updateDate: 2025 },
      };
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['updateDate'],
          message: 'Expected string, received number',
        },
      ];

      // Add validation errors that exceed thresholds
      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [
            ValidationErrorType.GEOMETRY_VALIDITY,
            ValidationErrorType.RESOLUTION,
            ValidationErrorType.SMALL_GEOMETRY,
            ValidationErrorType.SMALL_HOLES,
          ],
        })),
        smallHolesCount: 10,
      };

      collector.addVerticesErrors([verticesFeature], chunkId, maxVerticesAllowed);
      collector.addMetadataError(zodIssues, metadataFeature, chunkId);
      collector.addValidationErrors(validationResult, features, chunkId);

      // Verify errors, counts, and thresholds before clear
      expect(collector.hasCriticalErrors()).toBe(true);
      const countsBeforeClear = collector.getErrorCounts();
      expect(countsBeforeClear.vertices).toBeGreaterThan(0);
      expect(countsBeforeClear.metadata).toBeGreaterThan(0);
      expect(countsBeforeClear.geometryValidity).toBeGreaterThan(0);
      expect(countsBeforeClear.resolution).toBeGreaterThan(0);
      expect(countsBeforeClear.smallGeometries).toBeGreaterThan(0);
      expect(countsBeforeClear.smallHoles).toBeGreaterThan(0);

      const thresholdsBeforeClear = collector.getThresholdsInfo();
      expect(thresholdsBeforeClear.smallGeometries.exceeded).toBe(true);
      expect(thresholdsBeforeClear.smallHoles.exceeded).toBe(true);
      expect(thresholdsBeforeClear.smallHoles.count).toBe(10);

      const featuresBeforeClear = collector.getFeaturesWithErrorProperties();
      expect(featuresBeforeClear.length).toBeGreaterThan(0);

      // Act
      collector.clear();

      // Assert
      // Verify all errors are reset
      expect(collector.hasCriticalErrors()).toBe(false);
      const featuresAfterClear = collector.getFeaturesWithErrorProperties();
      expect(featuresAfterClear).toHaveLength(0);

      // Verify all counts are reset to zero
      const countsAfterClear = collector.getErrorCounts();
      expect(countsAfterClear).toEqual({
        geometryValidity: 0,
        vertices: 0,
        metadata: 0,
        resolution: 0,
        smallGeometries: 0,
        smallHoles: 0,
        unknown: 0,
      });

      // Verify thresholds are reset
      const thresholdsAfterClear = collector.getThresholdsInfo();
      expect(thresholdsAfterClear).toEqual({
        smallGeometries: {
          exceeded: false,
        },
        smallHoles: {
          exceeded: false,
          count: 0,
        },
      });

      // Verify shapefile stats are reset by adding same errors and checking threshold not exceeded
      collector.addValidationErrors(validationResult, features, chunkId);
      const thresholdsAfterReAdding = collector.getThresholdsInfo();
      expect(thresholdsAfterReAdding.smallGeometries.exceeded).toBe(false);
      expect(thresholdsAfterReAdding.smallHoles.exceeded).toBe(false);
    });
  });

  describe('hasErrors', () => {
    it('should return false when no errors collected', () => {
      // Arrange - collector is already initialized with no errors

      // Act & Assert
      expect(collector.hasErrors()).toBe(false);
    });

    it('should return true when vertices errors are added', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      // Act
      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
      const hasErrors = collector.hasErrors();

      // Assert
      expect(hasErrors).toBe(true);
    });

    it('should return true when metadata errors are added', () => {
      // Arrange
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), updateDate: 2025 },
      };
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['updateDate'],
          message: 'Expected string, received number',
        },
      ];

      // Act
      collector.addMetadataError(zodIssues, feature, 1);
      const hasErrors = collector.hasErrors();

      // Assert
      expect(hasErrors).toBe(true);
    });

    it('should return true when validation errors are added', () => {
      // Arrange
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };
      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [{ id: feature.properties.id, errors: [ValidationErrorType.GEOMETRY_VALIDITY] }],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], 1);

      // Assert
      expect(collector.hasErrors()).toBe(true);
    });

    it('should return true for any error type including non-critical errors below threshold', () => {
      // Arrange
      const totalFeatures = 1000;

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [
          {
            id: feature.properties.id,
            errors: [ValidationErrorType.SMALL_GEOMETRY],
          },
        ],
        smallHolesCount: 0,
      };

      // Act
      collector.addValidationErrors(validationResult, [feature], 1);
      const hasErrors = collector.hasErrors();
      const hasCriticalErrors = collector.hasCriticalErrors();

      // Assert - hasErrors should return true even though hasCriticalErrors returns false
      expect(hasErrors).toBe(true);
      expect(hasCriticalErrors).toBe(false);
    });

    it('should return false after clear', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
      expect(collector.hasErrors()).toBe(true);

      // Act
      collector.clear();
      const hasErrors = collector.hasErrors();

      // Assert
      expect(hasErrors).toBe(false);
    });

    it('should return false after clearInvalidFeatures', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
      expect(collector.hasErrors()).toBe(true);

      // Act
      collector.clearInvalidFeatures();
      const hasErrors = collector.hasErrors();

      // Assert
      expect(hasErrors).toBe(false);
    });
  });

  describe('clearInvalidFeatures', () => {
    it('should clear the invalid features map', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
      expect(collector.hasErrors()).toBe(true);

      // Act
      collector.clearInvalidFeatures();

      // Assert
      expect(collector.hasErrors()).toBe(false);
      const features = collector.getFeaturesWithErrorProperties();
      expect(features).toHaveLength(0);
    });

    it('should not reset error counts', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);

      const countsBeforeClear = collector.getErrorCounts();
      expect(countsBeforeClear.vertices).toBe(1);

      // Act
      collector.clearInvalidFeatures();

      // Assert - Error counts should remain the same
      const countsAfterClear = collector.getErrorCounts();
      expect(countsAfterClear.vertices).toBe(1);
      expect(countsAfterClear).toEqual(countsBeforeClear);
    });

    it('should not reset thresholds', () => {
      // Arrange
      const totalFeatures = 100;
      const smallGeometriesCount = 10; // 10% - exceeds threshold

      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      collector.addValidationErrors(validationResult, features, 1);

      const thresholdsBeforeClear = collector.getThresholdsInfo();
      expect(thresholdsBeforeClear.smallGeometries.exceeded).toBe(true);

      // Act
      collector.clearInvalidFeatures();

      // Assert - Thresholds should remain the same
      const thresholdsAfterClear = collector.getThresholdsInfo();
      expect(thresholdsAfterClear.smallGeometries.exceeded).toBe(true);
      expect(thresholdsAfterClear).toEqual(thresholdsBeforeClear);
    });

    it('should not reset shapefile stats', () => {
      // Arrange
      const totalFeatures = 100;
      const totalVertices = 5000;

      collector.setShapefileStats({ totalFeatures, totalVertices });

      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };

      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);

      // Add errors again and verify threshold calculation still works (uses shapefile stats)
      const smallGeometriesCount = 10; // 10% of 100 features - should exceed threshold
      const features: Feature<Polygon, { id: string }>[] = Array.from({ length: smallGeometriesCount }, () => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      }));

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: features.map((feature) => ({
          id: feature.properties.id,
          errors: [ValidationErrorType.SMALL_GEOMETRY],
        })),
        smallHolesCount: 0,
      };

      // Act
      collector.clearInvalidFeatures();
      collector.addValidationErrors(validationResult, features, 1);

      // Assert - If stats were reset, this would be false (percentage would be calculated against 0)
      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(true);
    });

    it('should only clear features, allowing new features to be added', () => {
      // Arrange
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const props1 = { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) };
      const feature1: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: props1,
      };

      collector.addVerticesErrors([feature1], 1, maxVerticesAllowed);
      expect(collector.hasErrors()).toBe(true);

      // Add new features after clearing
      const props2 = { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) };
      const feature2: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: props2,
      };

      // Act
      collector.clearInvalidFeatures();
      expect(collector.hasErrors()).toBe(false);

      collector.addVerticesErrors([feature2], 2, maxVerticesAllowed);

      // Assert
      expect(collector.hasErrors()).toBe(true);

      const features = collector.getFeaturesWithErrorProperties();
      expect(features).toHaveLength(1);
      expect(features[0].properties.id).toBe(props2.id);
    });
  });
});
