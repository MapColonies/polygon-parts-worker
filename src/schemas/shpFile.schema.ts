import { z } from 'zod';
import { bboxSchema, multiPolygonSchema, PolygonPartsFeatureCollection, polygonSchema, INGESTION_VALIDATIONS } from '@map-colonies/raster-shared';
import { commaSeparatedStringSchema, flexibleDateCoerce } from './common.schema';

const LEGACY_DATE_REPLACEMENT_MESSAGE = 'Required (replaces the legacy updateDate column)';

// Empty dbf cells arrive as null, which z.coerce.date would silently turn into 1970-01-01
const requiredFlexibleDate = z
  .custom<unknown>((val) => val !== undefined && val !== null && val !== '', { message: LEGACY_DATE_REPLACEMENT_MESSAGE, fatal: true })
  .pipe(flexibleDateCoerce);

const shpFeaturePropertiesBaseSchema = z.object({
  id: z.string(),
  sourceId: z
    .string()
    .nullish()
    .transform((val) => val ?? undefined),
  dateStart: requiredFlexibleDate,
  dateEnd: requiredFlexibleDate,
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

export const shpFeaturePropertiesSchema = shpFeaturePropertiesBaseSchema.refine((properties) => properties.dateStart <= properties.dateEnd, {
  message: 'dateStart must be earlier than or equal to dateEnd',
  path: ['dateEnd'],
});

export type ShpFeatureProperties = z.infer<typeof shpFeaturePropertiesSchema>;

export const featureIdSchema = shpFeaturePropertiesBaseSchema.pick({ id: true });

export const verticesSchema = z.object({
  vertices: z.number().int().positive(),
});

export const exceededVerticesFeaturePropertiesSchema = shpFeaturePropertiesBaseSchema.extend(verticesSchema.shape);

export const shpFeatureBaseSchema = z.object({
  type: z.literal('Feature'),
  id: z.string().or(z.number()).optional(),
  bbox: bboxSchema.optional(),
});

export const shpFeatureSchema = shpFeatureBaseSchema.extend({
  geometry: polygonSchema.or(multiPolygonSchema),
  properties: shpFeaturePropertiesSchema,
});

export const exceededVerticesShpFeatureSchema = shpFeatureBaseSchema.extend({
  geometry: z.any(),
  properties: shpFeaturePropertiesSchema,
});

export type ShpFeature = z.infer<typeof shpFeatureSchema>;

export type ExceededVerticesShpProperties = z.infer<typeof exceededVerticesFeaturePropertiesSchema>;

export type PolygonPartFeature = PolygonPartsFeatureCollection['features'][number];
