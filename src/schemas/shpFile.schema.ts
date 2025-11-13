import { bboxSchema, multiPolygonSchema, polygonSchema } from '@map-colonies/raster-shared';
import { z } from 'zod';
import { commaSeparatedStringSchema, flexibleDateCoerce } from './common.schema';

export const shpFeaturePropertiesSchema = z.object({
  id: z.string(),
  sourceId: z
    .string()
    .nullish()
    .transform((val) => val ?? undefined),
  updateDate: flexibleDateCoerce,
  sensors: commaSeparatedStringSchema,
  desc: z
    .string()
    .nullish()
    .transform((val) => val ?? undefined),
  sourceRes: z.coerce.number().positive({ message: 'Source resolution must be positive' }),
  ep90: z.coerce.number().int().positive({ message: 'EP90 must be a positive integer' }),
  cities: commaSeparatedStringSchema,
  countries: commaSeparatedStringSchema,
  publishRes: z.coerce.number().positive({ message: 'Publish resolution must be a positive integer' }),
  classify: z.string(),
  sourceName: z.string(),
  scale: z.coerce
    .number()
    .min(1, { message: 'Scale must be a positive number' })
    .nullish()
    .transform((val) => val ?? undefined),
});

export type ShpFeatureProperties = z.infer<typeof shpFeaturePropertiesSchema>;

export const shpFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.string().or(z.number()).optional(),
  geometry: polygonSchema.or(multiPolygonSchema),
  properties: shpFeaturePropertiesSchema,
  bbox: bboxSchema.optional(),
});
