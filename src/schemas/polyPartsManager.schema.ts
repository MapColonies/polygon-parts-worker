import { z } from 'zod';
import { VALIDATIONS } from '@map-colonies/mc-model-types';
import { RasterProductTypes } from '@map-colonies/raster-shared';
import { ShapefileChunk } from '@map-colonies/mc-utils';

export const ingestionNewRequestBodySchema = z.object({
  productId: z.string().regex(new RegExp(VALIDATIONS.productId.pattern)),
  productType: z.nativeEnum(RasterProductTypes),
  catalogId: z.string(),
  productVersion: z.string().regex(new RegExp(VALIDATIONS.productVersion.pattern)),
  partsDataChunk: z.custom<ShapefileChunk>(), //TODO: Define the schema for partsData (already defined in @map-colonies/raster-shared) - not using currently because working with unprocessed shapefiles(later we get processed shapefiles from client team)
});

export type IngestionNewRequestBodySchema = z.infer<typeof ingestionNewRequestBodySchema>;
