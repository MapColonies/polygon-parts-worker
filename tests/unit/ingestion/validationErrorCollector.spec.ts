import { Feature, Geometry, Polygon } from 'geojson';
import { ZodIssue } from 'zod';
import { ValidationErrorType, PolygonPartsChunkValidationResult, PolygonPartValidationErrorsType } from '@map-colonies/raster-shared';
import { faker } from '@faker-js/faker';
import { ValidationErrorCollector } from '../../../src/models/ingestion/validationErrorCollector';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { loggerMock } from '../mocks/telemetryMock';
import { METADATA_ERROR_SEPARATOR } from '../../../src/models/ingestion/constants';
import { createFakeShpFeatureProperties } from '../mocks/fakeFeatures';

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
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
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

      collector.addVerticesErrors(features, chunkId, maxVerticesAllowed);

      expect(collector.hasErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.vertices).toBe(2);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(2);
      expect(featuresWithErrors[0].properties.e_vertices).toBeDefined();
      expect(featuresWithErrors[1].properties.e_vertices).toBeDefined();
    });

    it('should handle features with missing metadata gracefully', () => {
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
      const chunkId = 1;
      const { ep90, ...rest } = { ...createFakeShpFeatureProperties() };
      const featureProperties = { ...rest, vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) };
      const featureWithoutId: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: featureProperties, // Missing 'ep90' property
      };

      collector.addVerticesErrors([featureWithoutId], chunkId, maxVerticesAllowed);

      expect(collector.hasErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.vertices).toBe(1);
      expect(errorCounts.metadata).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_vertices).toBeDefined();
      expect(featuresWithErrors[0].properties.e_metadata).toBeDefined();
    });

    it('should increment error counter and be reflected in getErrorCounts', () => {
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
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

      collector.addVerticesErrors(features, chunkId, maxVerticesAllowed);

      const countsAfter = collector.getErrorCounts();
      expect(countsAfter.vertices).toBe(2);
    });
  });

  describe('addMetadataError', () => {
    it('should add metadata validation errors from Zod issues', () => {
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

      collector.addMetadataError(zodIssues, feature, chunkId);

      expect(collector.hasErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.metadata).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_metadata).toBeDefined();
      expect(featuresWithErrors[0].properties.e_metadata).toContain(`${zodIssues[0].message}${METADATA_ERROR_SEPARATOR}${zodIssues[1].message}`);
    });
    it('should be reflected in error counts and hasErrors', () => {
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

      expect(collector.hasErrors()).toBe(false);
      const countsBefore = collector.getErrorCounts();
      expect(countsBefore.metadata).toBe(0);

      collector.addMetadataError(zodIssues, feature, chunkId);

      expect(collector.hasErrors()).toBe(true);
      const countsAfter = collector.getErrorCounts();
      expect(countsAfter.metadata).toBe(1);
    });
  });

  describe('addValidationErrors', () => {
    it('should handle unknown error types gracefully', () => {
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

      collector.addValidationErrors(validationResult, [feature], chunkId);

      expect(collector.hasErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.unknown).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_unknown).toBeDefined();
      expect(featuresWithErrors[0].properties.e_unknown).toBe('UNKNOWN_ERROR_TYPE');
    });

    it('should handle mix of known and unknown error types', () => {
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

      collector.addValidationErrors(validationResult, [feature], chunkId);

      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(1);
      expect(errorCounts.resolution).toBe(1);
      expect(errorCounts.unknown).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors[0].properties.e_validity).toBeDefined();
      expect(featuresWithErrors[0].properties.e_res).toBeDefined();
      expect(featuresWithErrors[0].properties.e_unknown).toBeDefined();
    });

    it('should add  validation errors from validation result', () => {
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

      collector.addValidationErrors(validationResult, [feature], chunkId);

      expect(collector.hasErrors()).toBe(true);
      const errorCounts = collector.getErrorCounts();
      expect(errorCounts.geometryValidity).toBe(1);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);
      expect(featuresWithErrors[0].properties.e_validity).toBeDefined();
    });

    it('should handle multiple error types for single feature', () => {
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

      collector.addValidationErrors(validationResult, [feature], chunkId);

      expect(collector.hasErrors()).toBe(true);
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

      collector.addValidationErrors(validationResult, [feature1, feature2], chunkId);

      expect(collector.hasErrors()).toBe(true);
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

    it('should update small holes and check threshold when small holes are present', () => {
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

      collector.addValidationErrors(validationResult, [feature], chunkId);

      const thresholds = collector.getThresholdsInfo();
      const errorCounts = collector.getErrorCounts();

      expect(errorCounts.smallHoles).toBe(validationResult.parts.length);
      expect(thresholds.smallHoles.count).toBe(smallHoles);
      expect(thresholds.smallHoles.exceeded).toBe(true);
    });

    it('should update small geometries threshold when small geometries are present', () => {
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

      collector.addValidationErrors(validationResult, features, chunkId);

      const thresholds = collector.getThresholdsInfo();
      const errorCounts = collector.getErrorCounts();

      expect(errorCounts.smallGeometries).toBe(smallGeometriesCount);
      expect(thresholds.smallGeometries.exceeded).toBe(true);
    });

    it('should be reflected in error counts', () => {
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

      collector.addValidationErrors(validationResult, [feature], chunkId);

      const countsAfter = collector.getErrorCounts();
      expect(countsAfter.geometryValidity).toBe(1);
      expect(countsAfter.resolution).toBe(1);
    });
  });

  describe('hasErrors', () => {
    it('should return false when no errors collected', () => {
      const errorCounts = collector.getErrorCounts();

      expect(collector.hasErrors()).toBe(false);
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

    test.each([
      {
        description: 'vertices errors',
        setup: () => {
          const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
          const feature: Feature<Geometry, unknown> = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [] },
            properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
          };
          collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
        },
      },
      {
        description: 'metadata errors',
        setup: () => {
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
          collector.addMetadataError(zodIssues, feature, 1);
        },
      },
      {
        description: 'validation errors',
        setup: () => {
          const feature: Feature<Polygon, { id: string }> = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [[[]]] },
            properties: createFakeShpFeatureProperties(),
          };
          const validationResult: PolygonPartsChunkValidationResult = {
            parts: [{ id: feature.properties.id, errors: [ValidationErrorType.GEOMETRY_VALIDITY] }],
            smallHolesCount: 0,
          };
          collector.addValidationErrors(validationResult, [feature], 1);
        },
      },
    ])('should return true after adding $description', ({ setup }) => {
      expect(collector.hasErrors()).toBe(false);
      setup();
      expect(collector.hasErrors()).toBe(true);
    });
  });

  describe('getFeaturesWithErrorProperties', () => {
    it('should return empty array when no errors', () => {
      const features = collector.getFeaturesWithErrorProperties();
      expect(features).toEqual([]);
    });

    test.each([
      {
        description: 'vertices error properties',
        setup: () => {
          const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
          const feature: Feature<Geometry, unknown> = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [] },
            properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
          };
          collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
        },
        expectedProperty: 'e_vertices',
      },
      {
        description: 'metadata error properties',
        setup: () => {
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
          collector.addMetadataError(zodIssues, feature, 1);
        },
        expectedProperty: 'e_metadata',
      },
      {
        description: 'geometry validity error properties',
        setup: () => {
          const feature: Feature<Polygon, { id: string }> = {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [[[]]] },
            properties: createFakeShpFeatureProperties(),
          };
          const validationResult: PolygonPartsChunkValidationResult = {
            parts: [{ id: feature.properties.id, errors: [ValidationErrorType.GEOMETRY_VALIDITY] }],
            smallHolesCount: 0,
          };
          collector.addValidationErrors(validationResult, [feature], 1);
        },
        expectedProperty: 'e_validity',
      },
    ])('should return features with $description', ({ setup, expectedProperty }) => {
      setup();
      const features = collector.getFeaturesWithErrorProperties();
      expect(features).toHaveLength(1);
      expect(features[0].properties[expectedProperty]).toBeDefined();
    });

    it('should preserve original feature properties', () => {
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
      const originalProperties = { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) };
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: originalProperties,
      };

      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);

      const featuresWithErrors = collector.getFeaturesWithErrorProperties();
      expect(featuresWithErrors).toHaveLength(1);

      // Verify error property was added
      expect(featuresWithErrors[0].properties.e_vertices).toBeDefined();

      // Verify all original properties are preserved
      Object.keys(originalProperties).forEach((key) => {
        expect(featuresWithErrors[0].properties[key]).toEqual(originalProperties[key as keyof typeof originalProperties]);
      });
    });
  });

  describe('getErrorCounts', () => {
    it('should return initial zero counts', () => {
      const counts = collector.getErrorCounts();
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
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
      const chunkId = 1;

      // Add vertices error
      const verticesFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };
      collector.addVerticesErrors([verticesFeature], chunkId, maxVerticesAllowed);

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
      collector.addMetadataError(zodIssues, metadataFeature, chunkId);

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
      collector.addValidationErrors(validationResult, [validationFeature], chunkId);

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
      const thresholds = collector.getThresholdsInfo();
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

      collector.addValidationErrors(validationResult, features, 1);

      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(true);
    });

    it('should update when small holes threshold is exceeded', () => {
      const totalFeatures = 100;
      const smallHolesCount = 10; // 10% of total features

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

      collector.addValidationErrors(validationResult, [feature], 1);

      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallHoles.count).toBe(smallHolesCount);
      expect(thresholds.smallHoles.exceeded).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return both error counts and thresholds', () => {
      const stats = collector.getStatistics();
      expect(stats).toHaveProperty('errorsCount');
      expect(stats).toHaveProperty('thresholds');
    });
  });

  describe('setShapefileStats', () => {
    it('should affect threshold calculations', () => {
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

      collector.addValidationErrors(validationResult, features, 1);

      const thresholds = collector.getThresholdsInfo();
      expect(thresholds.smallGeometries.exceeded).toBe(true);

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

      collector2.addValidationErrors(validationResult2, smallFeatureSet, 1);

      const thresholds2 = collector2.getThresholdsInfo();
      expect(thresholds2.smallGeometries.exceeded).toBe(false);
    });
  });

  describe('clear', () => {
    it('should reset all errors, counts, thresholds, and shapefile stats', () => {
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
      const chunkId = 1;
      const totalFeatures = 100;
      const smallGeometriesCount = 10;

      // Set shapefile stats
      collector.setShapefileStats({ totalFeatures, totalVertices: 5000 });

      // Add vertices error
      const verticesFeature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };
      collector.addVerticesErrors([verticesFeature], chunkId, maxVerticesAllowed);

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
      collector.addMetadataError(zodIssues, metadataFeature, chunkId);

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
      collector.addValidationErrors(validationResult, features, chunkId);

      // Verify errors, counts, and thresholds before clear
      expect(collector.hasErrors()).toBe(true);
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

      // Clear
      collector.clear();

      // Verify all errors are reset
      expect(collector.hasErrors()).toBe(false);
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
});
