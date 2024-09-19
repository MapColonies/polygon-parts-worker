import { inject, injectable } from "tsyringe";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { Logger } from "@map-colonies/js-logger";
import { Tracer } from "@opentelemetry/api";
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { NewRasterLayer } from "@map-colonies/mc-model-types";
import { IConfig } from "../common/interfaces";
import { SERVICES } from "../common/constants";
import { JobHandlerFactory } from "./handlersManager";


@injectable()
export class NewJobHandler extends JobHandlerFactory {
  public constructor(config: IConfig
  ) {
    super(config);
  }

  public processJob(job: IJobResponse<unknown, unknown>): void {
    throw new Error("Method not implemented.");
  }

}