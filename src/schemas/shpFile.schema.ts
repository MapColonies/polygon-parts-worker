import { bboxSchema, multiPolygonSchema, PolygonPartsFeatureCollection, polygonSchema } from '@map-colonies/raster-shared';
import { any, z } from 'zod';
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

export const featureIdSchema = shpFeaturePropertiesSchema.pick({ id: true });

export const exceededVerticesFeaturePropertiesSchema = shpFeaturePropertiesSchema.extend({ vertices: z.number().int().positive() });

export const shpFeatureBaseSchema = z.object({
  type: z.literal('Feature'),
  id: z.string().or(z.number()).optional(),
  bbox: bboxSchema.optional(),
});

export const shpFeatureSchema = shpFeatureBaseSchema.extend({
  geometry: polygonSchema.or(multiPolygonSchema),
  properties: shpFeaturePropertiesSchema,
});

export type ShpFeature = z.infer<typeof shpFeatureSchema>;

export const exceededVerticesShpFeatureSchema = shpFeatureBaseSchema.extend({
  geometry: any(),
  properties: exceededVerticesFeaturePropertiesSchema,
});

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export type PolygonPartFeature = PolygonPartsFeatureCollection['features'][0];
