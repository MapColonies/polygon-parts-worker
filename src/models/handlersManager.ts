import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { inject } from "tsyringe";
import { Logger } from "@map-colonies/js-logger";
import { Tracer } from "@opentelemetry/api";
import { IConfig } from "../common/interfaces";
import { SERVICES } from "../common/constants";
import { NewJobHandler } from "./newLayerHandler"

export abstract class JobHandlerFactory {
  //public readonly aviliableJobTypes: string[];
  private readonly config: IConfig;

  public constructor(
    config: IConfig
  ) {
    this.config = config;
    //this.aviliableJobTypes = this.config.get<string[]>('jobManagement.jobTypesToProcess');
  }

  public initJobHandler(jobHandlerType: string): JobHandlerFactory {
    switch (jobHandlerType) {
      case ('Ingestion_New'):
        return new NewJobHandler(this.config);
    }
    throw new Error(`Bad request,${jobHandlerType} job type is invalid`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public abstract processJob(job: IJobResponse<unknown, unknown>): void;
}
