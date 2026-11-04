import { ValidationAggregatedErrors } from '@map-colonies/raster-shared';
import { faker } from '@faker-js/faker';

export const emptyErrorsSummary: ValidationAggregatedErrors = {
  errorsCount: { geometryValidity: 0, metadata: 0, vertices: 0, resolution: 0, smallHoles: 0, smallGeometries: 0, unknown: 0 },
  thresholds: { smallGeometries: { exceeded: false }, smallHoles: { exceeded: false, count: 0 }, resolution: { exceeded: false } },
};

export const errorsSummaryWithErrors: ValidationAggregatedErrors = {
  errorsCount: { geometryValidity: 2, metadata: 1, vertices: 0, resolution: 0, smallHoles: 0, smallGeometries: 0, unknown: 0 },
  thresholds: { smallGeometries: { exceeded: false }, smallHoles: { exceeded: false, count: 4 }, resolution: { exceeded: false } },
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
      resolution: {
        exceeded: faker.datatype.boolean(),
      },
    },
  };
};
