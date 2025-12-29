import { faker } from '@faker-js/faker';
import {
  CORE_VALIDATIONS,
  INGESTION_VALIDATIONS,
  PartFeatureProperties,
  PolygonPartsFeatureCollection,
  PolygonPartsPayload,
  RasterProductTypes,
} from '@map-colonies/raster-shared';
import { Feature, MultiPolygon, Polygon } from 'geojson';
import { ingestionJobTypes } from '../callbackClient/callbackClient.data';

const SUPPORTED_GEOMETRIES = ['Polygon', 'MultiPolygon'] satisfies (Polygon['type'] | MultiPolygon['type'])[];

export const createFakePolygonPartsPayload = (numberOfFeatures: number): PolygonPartsPayload => {
  return {
    catalogId: faker.string.uuid(),
    jobType: faker.helpers.arrayElement(ingestionJobTypes),
    partsData: createFakePolygonPartsFeatureCollection(numberOfFeatures),
    productId: faker.string.alpha({ length: 10 }),
    productType: faker.helpers.enumValue(RasterProductTypes),
    productVersion: '1.0',
  };
};

export const createFakePolygonPartsFeatureCollection = (numberOfFeatures: number): PolygonPartsFeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: numberOfFeatures }, () => createFakePolygonPartsFeature()),
  };
};

export const createFakePolygonPartsFeature = (): Feature<Polygon | MultiPolygon, PartFeatureProperties> => {
  return {
    type: 'Feature',
    geometry: {
      type: faker.helpers.arrayElement(SUPPORTED_GEOMETRIES),
      coordinates: [[]],
    },
    properties: createFakePolygonPartsFeatureProperties(),
  };
};

export const createFakePolygonPartsFeatureProperties = (): PartFeatureProperties => {
  return {
    id: faker.number.int().toString(),
    sourceId: faker.string.alpha({ length: { min: 1, max: 5 } }),
    cities: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.location.city()),
    sensors: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.string.alpha({ length: { min: 2, max: 10 } })),
    countries: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.location.country()),
    sourceName: faker.string.alpha({ length: { min: 3, max: 8 } }),
    horizontalAccuracyCE90: faker.number.int({
      min: INGESTION_VALIDATIONS.horizontalAccuracyCE90.min,
      max: INGESTION_VALIDATIONS.horizontalAccuracyCE90.max,
    }),
    resolutionDegree: faker.number.float({ min: CORE_VALIDATIONS.resolutionDeg.min, max: CORE_VALIDATIONS.resolutionDeg.max }),
    resolutionMeter: faker.number.int({ min: INGESTION_VALIDATIONS.resolutionMeter.min, max: INGESTION_VALIDATIONS.resolutionMeter.max }),
    imagingTimeBeginUTC: faker.date.past(),
    imagingTimeEndUTC: faker.date.past(),
    sourceResolutionMeter: faker.number.int({ min: INGESTION_VALIDATIONS.resolutionMeter.min, max: INGESTION_VALIDATIONS.resolutionMeter.max }),
    description: faker.lorem.sentence({ min: 1, max: 3 }),
  };
};
