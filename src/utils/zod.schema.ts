import { createJobResponseSchema, ingestionNewJobParamsSchema } from '@map-colonies/raster-shared';
import { z } from 'zod';

export const ingestionNewInitJobSchema = createJobResponseSchema(ingestionNewJobParamsSchema).describe('IngestionNewInitJobSchema');
export type IngestionNewInitJob = z.infer<typeof ingestionNewInitJobSchema>;
export const polygonPartsEntityNameSchema = z
  .string()
  .min(1, 'polygonPartsEntityName cannot be an empty string')
  .describe('Polygon parts entity name must be a non-empty string');
// Use Zod schema to validate the entity name - this will throw a ZodError if invalid
