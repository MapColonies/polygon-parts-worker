/* eslint-disable @typescript-eslint/no-magic-numbers */
import { faker } from '@faker-js/faker';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { CallbackResponse, RasterProductTypes } from '@map-colonies/raster-shared';

export const ingestionJobTypes = ['Ingestion_New', 'Ingestion_Update', 'Swath_Update'] as const;
export const callbackResponse: CallbackResponse<unknown> = {
  jobId: faker.string.uuid(),
  taskId: faker.string.uuid(),
  status: faker.helpers.enumValue(OperationStatus),
  jobType: faker.helpers.arrayElement(ingestionJobTypes),
  /* eslint-disable @typescript-eslint/no-magic-numbers */
  productId: faker.string.alpha(10),
  /* eslint-enable @typescript-eslint/no-magic-numbers */
  productType: faker.helpers.enumValue(RasterProductTypes),
  version: '1.0',
  taskType: 'validation',
};
