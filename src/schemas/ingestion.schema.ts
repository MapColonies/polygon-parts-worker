import { baseAdditionalParamsSchema, ingestionBaseJobParamsSchema } from '@map-colonies/raster-shared';

export const ingestionJobParamsSchema = ingestionBaseJobParamsSchema.extend({
  additionalParams: baseAdditionalParamsSchema,
});
