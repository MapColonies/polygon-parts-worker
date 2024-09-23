
import { Logger } from "@map-colonies/js-logger";
import { PolygonPartsManagerClient } from "../clients/polygonPartsManagerClient";
import { JobHandler } from "../common/interfaces";
import { NewJobHandler } from "./newLayerHandler"

  export function initJobHandler(jobHandlerType: string, logger: Logger, polygonPartsManager: PolygonPartsManagerClient): JobHandler {
    switch (jobHandlerType) {
      case ('Ingestion_New'):
        return new NewJobHandler(logger, polygonPartsManager);
    }
    throw new Error(`Bad request,${jobHandlerType} job type is invalid`)
  }
