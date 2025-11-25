import { z } from 'zod';
import { bboxSchema, multiPolygonSchema, PolygonPartsFeatureCollection, polygonSchema, INGESTION_VALIDATIONS } from '@map-colonies/raster-shared';
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
  sourceRes: z.coerce
    .number({ message: 'Source resolution meter should be a number' })
    .min(INGESTION_VALIDATIONS.resolutionMeter.min, {
      message: `Source resolution meter should not be less than ${INGESTION_VALIDATIONS.resolutionMeter.min}`,
    })
    .max(INGESTION_VALIDATIONS.resolutionMeter.max, {
      message: `Source resolution meter should not be larger than ${INGESTION_VALIDATIONS.resolutionMeter.max}`,
    }),
  ep90: z.coerce
    .number({ message: 'Horizontal accuracy CE90 should be a number' })
    .min(INGESTION_VALIDATIONS.horizontalAccuracyCE90.min, {
      message: `Horizontal accuracy CE90 should not be less than ${INGESTION_VALIDATIONS.horizontalAccuracyCE90.min}`,
    })
    .max(INGESTION_VALIDATIONS.horizontalAccuracyCE90.max, {
      message: `Horizontal accuracy CE90 should not be larger than ${INGESTION_VALIDATIONS.horizontalAccuracyCE90.max}`,
    }),
  cities: commaSeparatedStringSchema,
  countries: commaSeparatedStringSchema,
  publishRes: z.coerce
    .number({ message: 'Publish resolution meter should be a number' })
    .min(INGESTION_VALIDATIONS.resolutionMeter.min, {
      message: `Publish resolution meter should not be less than ${INGESTION_VALIDATIONS.resolutionMeter.min}`,
    })
    .max(INGESTION_VALIDATIONS.resolutionMeter.max, {
      message: `Publish resolution meter should not be larger than ${INGESTION_VALIDATIONS.resolutionMeter.max}`,
    }),
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
  geometry: z.any(),
  properties: exceededVerticesFeaturePropertiesSchema,
});

export type PolygonPartFeature = PolygonPartsFeatureCollection['features'][number];
