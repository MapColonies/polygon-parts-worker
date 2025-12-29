import { ValidationAggregatedErrors } from '@map-colonies/raster-shared';
import { faker } from '@faker-js/faker';
import { Feature, Polygon } from 'geojson';
import { createFakeShpFeatureProperties } from '../../mocks/fakeFeatures';

export const createFakeFeatureWithErrors = (): Feature<Polygon, Record<string, unknown>> => {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [faker.location.longitude(), faker.location.latitude()],
          [faker.location.longitude(), faker.location.latitude()],
          [faker.location.longitude(), faker.location.latitude()],
          [faker.location.longitude(), faker.location.latitude()],
          [faker.location.longitude(), faker.location.latitude()],
        ],
      ],
    },
    properties: {
      ...createFakeShpFeatureProperties(),
      /* eslint-disable @typescript-eslint/naming-convention */
      e_vertices: faker.lorem.sentence(),
      e_metadata: faker.lorem.sentence(),
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  };
};

export const createFakeFeaturesWithErrors = (count: number): Feature<Polygon, Record<string, unknown>>[] => {
  return Array.from({ length: count }, () => createFakeFeatureWithErrors());
};

export const createFakeErrorsSummary = (): ValidationAggregatedErrors => {
  return {
    errorsCount: {
      geometryValidity: faker.number.int({ min: 0, max: 10 }),
      metadata: faker.number.int({ min: 0, max: 10 }),
      vertices: faker.number.int({ min: 0, max: 10 }),
      resolution: faker.number.int({ min: 0, max: 10 }),
      smallHoles: faker.number.int({ min: 0, max: 10 }),
      smallGeometries: faker.number.int({ min: 0, max: 10 }),
      unknown: faker.number.int({ min: 0, max: 10 }),
    },
    thresholds: {
      smallGeometries: {
        exceeded: faker.datatype.boolean(),
      },
      smallHoles: {
        exceeded: faker.datatype.boolean(),
        count: faker.number.int({ min: 0, max: 10 }),
      },
    },
  };
};
