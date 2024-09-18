import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { SERVICES } from '../common/constants';
import { IConfig } from '../common/interfaces';

@injectable()
export class JobProcessor {
  private isRunning = true;
  private readonly dequeueIntervalMs: number;
  private readonly taskTypeToProcess: string;
  private readonly jobTypesToProcess: string[];
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public tracer: Tracer,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    this.dequeueIntervalMs = this.config.get<number>('jobManagement.config.dequeueIntervalMs');
    this.taskTypeToProcess = this.config.get<string>('jobManagement.taskTypeToProcess');
    this.jobTypesToProcess = this.config.get<string[]>('jobManagement.jobTypesToProcess');
  }

  @withSpanAsyncV4
  public async start(): Promise<void> {
    this.logger.info({ msg: 'starting polling' });

    while (this.isRunning) {
      try {
        this.logger.debug({ msg: 'fetching task' });
        const task = await this.getTask();

        if (task) {
          this.logger.info({ msg: 'processing task', taskId: task.id });
          await this.processTask(task);
        }
      } catch (error) {
        this.logger.error({ msg: 'error fetching or processing task', error });
        await setTimeoutPromise(this.dequeueIntervalMs);
      }
    }
  }

  @withSpanAsyncV4
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async processTask(task: ITaskResponse<unknown>): Promise<void> {
    //TODO
  }

  @withSpanAsyncV4
  private async getTask(): Promise<ITaskResponse<unknown> | undefined> {
    for (const jobType of this.jobTypesToProcess) {
      this.logger.debug(
        { msg: `try to dequeue task of type "${this.taskTypeToProcess}" and job of type "${jobType}"` },
        jobType,
        this.taskTypeToProcess
      );
      const task = await this.queueClient.dequeue(jobType, this.taskTypeToProcess);
      if (task) {
        this.logger.info({ msg: `dequeued task ${task.id}`, task });
        return task;
      }
    }
  }

  public stop(): void {
    this.logger.info({ msg: 'stopping polling' });
    this.isRunning = false;
  }
}
