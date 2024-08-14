import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { IFindJobsRequest, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { SERVICES } from '../../common/constants';
import { IConfig } from 'config';


@injectable()
export class JobHandler {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) { }

  public async getPolyPartsTask() : Promise<ITaskResponse<IFindJobsRequest> | undefined> {
    const taskType = 'polygon-parts'
    const pollingJobTypes = this.config.get<string[]>('forbiddenTypesForParallelIngesion');
    console.log(pollingJobTypes);

    for (const jobType of pollingJobTypes){
      this.logger.debug({ msg: `try to dequeue task of type "${taskType}" and job of type "${jobType}"`}, jobType, taskType);
      const task = await this.queueClient.dequeue<IFindJobsRequest>(jobType, taskType);
      if (task !== null ){
        this.logger.info({ msg: `dequeued task ${task.id}`, task });
        return task;
      }
    }
  }

  public async jobProccesor() {
    //TODO: to implement
  }
}
