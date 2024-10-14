import { z } from 'zod';
import { ProductType, PolygonPart } from '@map-colonies/mc-model-types';
import { VALIDATIONS } from '@map-colonies/mc-model-types';

export const ingestionNewRequestBodySchema = z.object({
  productId: z.string().regex(new RegExp(VALIDATIONS.productId.pattern)),
  productType: z.nativeEnum(ProductType),
  catalogId: z.string(),
  productVersion: z.string().regex(new RegExp(VALIDATIONS.productVersion.pattern)),
  partsData: z.custom<PolygonPart>().array(),
});
