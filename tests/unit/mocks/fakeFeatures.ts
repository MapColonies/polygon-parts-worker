import { faker } from '@faker-js/faker';
import { CORE_VALIDATIONS, INGESTION_VALIDATIONS } from '@map-colonies/raster-shared';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createFakeShpFeatureProperties = () => {
  return {
    id: faker.number.int().toString(),
    sourceId: faker.string.alpha({ length: { min: 1, max: 5 } }),
    cities: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.location.city()).join(','),
    sensors: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.string.alpha({ length: { min: 2, max: 10 } })).join(','),
    countries: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.location.country()).join(','),
    desc: faker.lorem.sentence(),
    ep90: faker.number.int({
      min: INGESTION_VALIDATIONS.horizontalAccuracyCE90.min,
      max: INGESTION_VALIDATIONS.horizontalAccuracyCE90.max,
    }),
    updateDate: faker.date.past(),
    sourceRes: faker.number.int({ min: INGESTION_VALIDATIONS.resolutionMeter.min, max: INGESTION_VALIDATIONS.resolutionMeter.max }),
    publishRes: faker.number.float({ min: CORE_VALIDATIONS.resolutionDeg.min, max: CORE_VALIDATIONS.resolutionDeg.max }),
    sourceName: faker.string.alpha({ length: { min: 3, max: 8 } }),
    classify: faker.string.alpha({ length: { min: 3, max: 8 } }),
  };
};
