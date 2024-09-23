import { z } from 'zod';
import { ProductType, PolygonPart } from "@map-colonies/mc-model-types";
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

export const newRequestBodySchema = z.object({
    productId: z.string(),
    productType: z.nativeEnum(ProductType),
    catalogId: z.string(),
    productVersion: z.string(),
    partsData: z.custom<PolygonPart>().array(),
})
    .openapi({ description: 'Poly Parts Manger "new" request schema', ref: 'newRequest' });
