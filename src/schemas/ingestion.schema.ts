import { baseAdditionalParamsSchema, createJobResponseSchema, ingestionBaseJobParamsSchema } from '@map-colonies/raster-shared';

const ingestionJobParamsSchema = ingestionBaseJobParamsSchema.extend({
  additionalParams: baseAdditionalParamsSchema,
});

export const ingestionJobSchema = createJobResponseSchema(ingestionJobParamsSchema).describe('IngestionBaseJobSchema');
