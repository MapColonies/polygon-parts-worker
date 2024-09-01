import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { IFindJobsRequest, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Span, Tracer } from '@opentelemetry/api';
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
    this.taskTypeToProcess = 'polygon-parts';
    this.jobTypesToProcess = this.config.get<string[]>('jobManagement.jobTypesToProcess');
    this.logContext = {
      fileName: __filename,
      class: JobProcessor.name,
    };
  }

  public async start(): Promise<void> {
    const logCtx: LogContext = { ...this.logContext, function: this.start.name };

    await this.tracer.startActiveSpan('jobManager.job start polling', async (span: Span) => {
      this.logger.info({ msg: 'starting polling', logContext: logCtx });
      while (this.isRunning) {
        try {
          this.logger.info({ msg: 'fetching task', logContext: logCtx });
          const task = await this.fetchTask();

          if (task) {
            this.logger.info({ msg: 'processing task', task, logContext: logCtx });
            await this.processJob(task);
          }
        } catch (error) {
          this.logger.error({ msg: 'Failed fetching or processing task', error, logContext: logCtx });
          await setTimeoutPromise(this.dequeueIntervalMs);
        }
      }
      span.end();
    });
  }

  public stop(): void {
    const logCtx: LogContext = { ...this.logContext, function: this.stop.name };
    this.logger.info({ msg: 'stopping polling', logContext: logCtx });
    this.isRunning = false;
  }

  private async fetchTask(): Promise<ITaskResponse<IFindJobsRequest> | undefined> {
    const polyPartsTask = await this.getPolyPartsTask();

    if (!polyPartsTask) {
      await setTimeoutPromise(this.dequeueIntervalMs);
      return;
    }
    return polyPartsTask;
  }

  private async processJob(task: ITaskResponse<IFindJobsRequest>): Promise<void> {
    //TODO
  }

  private async getPolyPartsTask(): Promise<ITaskResponse<IFindJobsRequest> | undefined> {
    for (const jobType of this.jobTypesToProcess) {
      this.logger.debug(
        { msg: `try to dequeue task of type "${this.taskTypeToProcess}" and job of type "${jobType}"` },
        jobType,
        this.taskTypeToProcess
      );
      const task = await this.queueClient.dequeue<IFindJobsRequest>(jobType, this.taskTypeToProcess);
      if (task !== null) {
        this.logger.info({ msg: `dequeued task ${task.id}`, task });
        return task;
      }
    }
  }
}
