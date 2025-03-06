import { z } from 'zod';
import { VALIDATIONS } from '@map-colonies/mc-model-types';
import { PolygonPart, RasterProductTypes } from '@map-colonies/raster-shared';

export const ingestionNewRequestBodySchema = z.object({
  productId: z.string().regex(new RegExp(VALIDATIONS.productId.pattern)),
  productType: z.nativeEnum(RasterProductTypes),
  catalogId: z.string(),
  productVersion: z.string().regex(new RegExp(VALIDATIONS.productVersion.pattern)),
  partsData: z.custom<PolygonPart>().array(),
});
