import { Feature, Geometry, Polygon } from 'geojson';
import { ZodIssue } from 'zod';
import { ValidationErrorType, PolygonPartsChunkValidationResult } from '@map-colonies/raster-shared';
import { faker } from '@faker-js/faker';
import { ValidationErrorCollector } from '../../../../src/models/ingestion/validationErrorCollector';
import { configMock } from '../../mocks/configMock';
import { createFakeShpFeatureProperties } from '../../mocks/fakeFeatures';

export const hasCriticalErrorsTestCases = [
  {
    description: 'vertices errors',
    setup: (collector: ValidationErrorCollector): void => {
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      const feature: Feature<Geometry, unknown> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { ...createFakeShpFeatureProperties(), vertices: faker.number.int({ min: maxVerticesAllowed + 1 }) },
      };
      collector.addVerticesErrors([feature], 1, maxVerticesAllowed);
    },
    expectedCritical: true,
  },
  {
    description: 'metadata errors',
    setup: (collector: ValidationErrorCollector): void => {
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
    expectedCritical: true,
  },
  {
    description: 'geometry validity errors',
    setup: (collector: ValidationErrorCollector): void => {
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
    expectedCritical: true,
  },
  {
    description: 'resolution errors',
    setup: (collector: ValidationErrorCollector): void => {
      const feature: Feature<Polygon, { id: string }> = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[]]] },
        properties: createFakeShpFeatureProperties(),
      };
      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [{ id: feature.properties.id, errors: [ValidationErrorType.RESOLUTION] }],
        smallHolesCount: 0,
      };
      collector.addValidationErrors(validationResult, [feature], 1);
    },
    expectedCritical: true,
  },
];

export const getFeaturesWithErrorPropertiesTestCases = [
  {
    description: 'vertices error properties',
    setup: (collector: ValidationErrorCollector): void => {
      const maxVerticesAllowed = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
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
    setup: (collector: ValidationErrorCollector): void => {
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
    setup: (collector: ValidationErrorCollector): void => {
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
];
