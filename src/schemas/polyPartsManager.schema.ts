import { z } from 'zod';
import { ProductType, PolygonPart } from '@map-colonies/mc-model-types';

export const ingestionNewRequestBodySchema = z
  .object({
    productId: z.string(),
    productType: z.nativeEnum(ProductType),
    catalogId: z.string(),
    productVersion: z.string(),
    partsData: z.custom<PolygonPart>().array(),
  });