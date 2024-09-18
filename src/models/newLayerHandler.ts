import { inject, injectable } from "tsyringe";
import { IJobResponse } from "@map-colonies/mc-priority-queue";
import { Logger } from "@map-colonies/js-logger";
import { Tracer } from "@opentelemetry/api";
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { NewRasterLayer } from "@map-colonies/mc-model-types";
import { IConfig, IJobHandler } from "../common/interfaces";
import { SERVICES } from "../common/constants";


@injectable()
export class NewJobHandler implements IJobHandler {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
  }
  public async handleJobInit(job: IJobResponse<NewRasterLayer, unknown>, taskId: string): Promise<void> {
  }

  public async handleJobFinalize(job: IJobResponse<NewRasterLayer, unknown>, taskId: string): Promise<void> {
    const logger = this.logger.child({ jobId: job.id, taskId });
    logger.info({ msg: `handling ${job.type} job with "finalize"` });
    await Promise.reject('not implemented');
  }
}