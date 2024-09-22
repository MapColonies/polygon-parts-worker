
import { JobHandler } from "../common/interfaces";
import { NewJobHandler } from "./newLayerHandler"

  export function initJobHandler(jobHandlerType: string): JobHandler {
    switch (jobHandlerType) {
      case ('Ingestion_New'):
        return new NewJobHandler();
    }
    throw new Error(`Bad request,${jobHandlerType} job type is invalid`)
  }
