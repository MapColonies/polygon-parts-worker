import { inject, injectable } from "tsyringe";
import { partSchema, PolygonPartsPayload } from "@map-colonies/mc-model-types";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { Logger } from "@map-colonies/js-logger";
import { BadRequestError } from "@map-colonies/error-types";
import { IJobHandler } from "../common/interfaces";
import { PolygonPartsManagerClient } from "../clients/polygonPartsManagerClient";
import { SERVICES } from "../common/constants";
import { ingestionNewRequestBodySchema } from "../schemas/polyPartsManager.schema";


@injectable()
export class UpdateJobHandler implements IJobHandler {
    public constructor(
        @inject(SERVICES.LOGGER) private readonly logger: Logger,
        @inject(PolygonPartsManagerClient) private readonly polygonPartsManager: PolygonPartsManagerClient
    ) { }

    public async processJob(job: IJobResponse<PolygonPartsPayload, unknown>, isSwap?: boolean): Promise<void> {
        if (typeof isSwap === 'undefined') {
            throw new BadRequestError('isSwap parameter is required for update jobs');
        }
        
        const requestBody = {
            productId: job.id,
            productType: job.productType,
            catalogId: job.internalId,
            productVersion: job.version,
            partsData: job.parameters.partsData,
        };

        try {
            requestBody.partsData.forEach((part) => {
                partSchema.parse(part);
            });
            const validatedRequestBody: PolygonPartsPayload = ingestionNewRequestBodySchema.parse(requestBody);

            this.logger.info('creating new polygon part', validatedRequestBody);
            await this.polygonPartsManager.updatePolygonParts(validatedRequestBody, isSwap);
        } catch (error) {
            this.logger.error({ msg: 'error while processing job', error });
            throw error;
        }
    }
}