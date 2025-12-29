import { PolygonPartsChunkValidationResult } from '@map-colonies/raster-shared';
import { ErrorsCount } from '../../../src/models/ingestion/types';

const defaultExpectedErrorsCount: ErrorsCount = {
  vertices: 0,
  metadata: 0,
  geometryValidity: 0,
  resolution: 0,
  smallGeometries: 0,
  smallHoles: 0,
  unknown: 0,
};

export interface FailedValidationTestCase {
  description: string;
  shapefilePath: string;
  expectedErrorsCount: ErrorsCount;
  ppManagerValidationResult: PolygonPartsChunkValidationResult;
}

export const failedValidationTestCases: FailedValidationTestCase[] = [
  {
    description: 'Metadata error',
    shapefilePath: '/invalid/metadata_error/invalid_publish_res_shapefile/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [],
      smallHolesCount: 0,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, metadata: 1 },
  },
  {
    description: 'Vertices error',
    shapefilePath: '/invalid/vertices_error/3205_vertices/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [],
      smallHolesCount: 0,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, vertices: 1 },
  },
  {
    description: 'Geometry validity error(Self-intersecting)',
    shapefilePath: '/invalid/geometry_validity_error/self_intersecting/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [{ id: '1', errors: ['Geometry_Validity'] }],
      smallHolesCount: 0,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, geometryValidity: 1 },
  },
  {
    description: 'Small geometries error',
    shapefilePath: '/invalid/external_shapefile_validation/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [{ id: '1', errors: ['Small_Geometry'] }],
      smallHolesCount: 0,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, smallGeometries: 1 },
  },
  {
    description: 'Small holes error',
    shapefilePath: '/invalid/external_shapefile_validation/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [{ id: '1', errors: ['Small_Holes'] }],
      smallHolesCount: 100,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, smallHoles: 1 },
  },
  {
    description: 'Resolution error',
    shapefilePath: '/invalid/external_shapefile_validation/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [{ id: '1', errors: ['Resolution'] }],
      smallHolesCount: 0,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, resolution: 1 },
  },
  {
    description: 'Unknown error',
    shapefilePath: '/invalid/external_shapefile_validation/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [{ id: '1', errors: ['Unknown'] }],
      smallHolesCount: 0,
    },
    expectedErrorsCount: { ...defaultExpectedErrorsCount, unknown: 1 },
  },
  {
    description: 'Multiple errors(metadata+vertices)',
    shapefilePath: '/invalid/metadata_vertices_error/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [],
      smallHolesCount: 50,
    },
    expectedErrorsCount: {
      ...defaultExpectedErrorsCount,
      metadata: 1,
      vertices: 1,
    },
  },
  {
    description: 'Multiple errors(PolygonPartsManager errors)',
    shapefilePath: '/invalid/external_shapefile_validation/ShapeMetadata.shp',
    ppManagerValidationResult: {
      parts: [{ id: '1', errors: ['Resolution', 'Small_Geometry', 'Small_Holes', 'Geometry_Validity', 'Unknown'] }],
      smallHolesCount: 200,
    },
    expectedErrorsCount: {
      ...defaultExpectedErrorsCount,
      resolution: 1,
      smallGeometries: 1,
      geometryValidity: 1,
      smallHoles: 1,
      unknown: 1,
    },
  },
];
