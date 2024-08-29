import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { IFindJobsRequest, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { SERVICES } from '../common/constants';
import { IConfig } from '../common/interfaces';


@injectable()
export class JobProcessor {
    private isRunning = true;

    public constructor(
        @inject(SERVICES.LOGGER) private readonly logger: Logger,
        @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
        @inject(SERVICES.CONFIG) private readonly config: IConfig,
    ) { }

    public start(): void {
        this.logger.info({ msg: 'starting polling' });
        while (this.isRunning) {
            this.getPolyPartsTask();
        }
    }

    public stop(): void {
        this.logger.info({ msg: 'stopping polling' });
        this.isRunning = false;
    }

    private async getPolyPartsTask(): Promise<ITaskResponse<IFindJobsRequest> | undefined> {
        const taskType = 'polygon-parts';
        const jobTypesToProcess = this.config.get<string[]>('jobManagement.jobTypesToProcess');

        for (const jobType of jobTypesToProcess) {
            this.logger.debug({ msg: `try to dequeue task of type "${taskType}" and job of type "${jobType}"` }, jobType, taskType);
            const task = await this.queueClient.dequeue<IFindJobsRequest>(jobType, taskType);
            if (task !== null) {
                this.logger.info({ msg: `dequeued task ${task.id}`, task });
                return task;
            }
        }
    }
}