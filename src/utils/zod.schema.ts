import { createJobResponseSchema, ingestionNewJobParamsSchema } from '@map-colonies/raster-shared';
import type { z } from 'zod';

export const ingestionNewInitJobSchema = createJobResponseSchema(ingestionNewJobParamsSchema).describe('IngestionNewInitJobSchema');
export type IngestionNewInitJob = z.infer<typeof ingestionNewInitJobSchema>;
