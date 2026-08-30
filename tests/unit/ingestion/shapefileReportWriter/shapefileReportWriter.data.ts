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
