import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { IFindJobsRequest, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Tracer } from '@opentelemetry/api';
import { SERVICES } from '../common/constants';
import { IConfig, LogContext } from '../common/interfaces';

@injectable()
export class JobProcessor {
  private isRunning = true;
  private readonly dequeueIntervalMs: number;
  private readonly logContext: LogContext;
  private readonly taskTypeToProcess: string;
  private readonly jobTypesToProcess: string[];
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) private readonly tracer: Tracer,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    this.dequeueIntervalMs = this.config.get<number>('jobManagement.config.dequeueIntervalMs');
    this.taskTypeToProcess = this.config.get<string>('jobManagement.taskTypeToProcess');
    this.jobTypesToProcess = this.config.get<string[]>('jobManagement.jobTypesToProcess');
    this.logContext = {
      fileName: __filename,
      class: JobProcessor.name,
    };
  }

  public async start(): Promise<void> {
    const logCtx: LogContext = { ...this.logContext, function: this.start.name };
    this.logger.info({ msg: 'starting polling', logContext: logCtx });

    while (this.isRunning) {
      try {
        this.logger.info({ msg: 'fetching task', logContext: logCtx });
        const task = await this.getNextPolyPartsTask();

        if (task) {
          this.logger.info({ msg: 'processing task', task, logContext: logCtx });
          await this.processTask(task);
        }
      } catch (error) {
        this.logger.error({ msg: 'error fetching or processing task', error, logContext: logCtx });
        await setTimeoutPromise(this.dequeueIntervalMs);
      }
    }
  }

  public stop(): void {
    const logCtx: LogContext = { ...this.logContext, function: this.stop.name };
    this.logger.info({ msg: 'stopping polling', logContext: logCtx });
    this.isRunning = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async processTask(task: ITaskResponse<IFindJobsRequest>): Promise<void> {
    //TODO
  }

  private async getNextPolyPartsTask(): Promise<ITaskResponse<IFindJobsRequest> | undefined> {
    for (const jobType of this.jobTypesToProcess) {
      this.logger.debug(
        { msg: `try to dequeue task of type "${this.taskTypeToProcess}" and job of type "${jobType}"` },
        jobType,
        this.taskTypeToProcess
      );
      const task = await this.queueClient.dequeue<IFindJobsRequest>(jobType, this.taskTypeToProcess);
      if (task) {
        this.logger.info({ msg: `dequeued task ${task.id}`, task });
        return task;
      }
    }
  }
}
