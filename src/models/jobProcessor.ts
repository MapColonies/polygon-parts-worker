import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { Logger } from '@map-colonies/js-logger';
import { ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { Tracer } from '@opentelemetry/api';
import { inject, injectable } from 'tsyringe';
import { JobTrackerClient } from '../clients/jobTrackerClient';
import { SERVICES } from '../common/constants';
import { ReachedMaxTaskAttemptsError } from '../common/errors';
import { IConfig, IJobAndTaskResponse, IPermittedJobTypes } from '../common/interfaces';
import { initJobHandler } from './handlersFactory';

@injectable()
export class JobProcessor {
  private isRunning = true;
  private readonly dequeueIntervalMs: number;
  private readonly taskTypeToProcess: string;
  private readonly jobTypesToProcess: IPermittedJobTypes;
  private readonly maxTaskAttempts: number;
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(JobTrackerClient) private readonly jobTrackerClient: JobTrackerClient
  ) {
    this.dequeueIntervalMs = this.config.get<number>('jobManagement.config.dequeueIntervalMs');
    this.taskTypeToProcess = this.config.get<string>('jobDefinitions.tasks.polygonParts.type');
    const ingestionNew = this.config.get<string>('jobDefinitions.jobs.new.type');
    const ingestionUpdate = this.config.get<string>('jobDefinitions.jobs.update.type');
    const ingestionSwapUpdate = this.config.get<string>('jobDefinitions.jobs.swapUpdate.type');
    const exportJob = this.config.get<string>('jobDefinitions.jobs.export.type');
    this.jobTypesToProcess = { ingestionNew, ingestionUpdate, ingestionSwapUpdate, exportJob };
    this.maxTaskAttempts = this.config.get<number>('jobDefinitions.tasks.maxAttempts');
  }

  @withSpanAsyncV4
  public async start(): Promise<void> {
    this.logger.info({ msg: 'starting polling' });

    while (this.isRunning) {
      let jobAndTask: IJobAndTaskResponse | undefined;
      try {
        this.logger.debug({ msg: 'fetching next job' });
        jobAndTask = await this.getJobAndTask();

        if (jobAndTask) {
          const { task, job } = jobAndTask;
          this.logger.info({ msg: 'processing job', jobId: job.id });
          await this.checkTaskAttempts(task);
          const jobHandler = initJobHandler(job.type, this.jobTypesToProcess);
          await jobHandler.processJob(job);

          this.logger.info({ msg: 'notifying job tracker and job manager on task finished', taskId: task.id });
          await this.notifyOnSuccess(job.id, task.id);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'something went wrong';
        this.logger.error({ msg: 'error while handling job', error: errorMsg });
        if (jobAndTask && !(error instanceof ReachedMaxTaskAttemptsError)) {
          const { job, task } = jobAndTask;
          const isResettable = true;
          await this.queueClient.reject(job.id, task.id, isResettable, errorMsg);
        }
      }
      await setTimeoutPromise(this.dequeueIntervalMs);
    }
  }

  @withSpanAsyncV4
  private async getJobAndTask(): Promise<IJobAndTaskResponse | undefined> {
    const jobTypesToProcessArray = Object.values(this.jobTypesToProcess) as string[];

    for (const jobType of jobTypesToProcessArray) {
      this.logger.debug(
        { msg: `try to dequeue task of type "${this.taskTypeToProcess}" and job of type "${jobType}"` },
        jobType,
        this.taskTypeToProcess
      );
      const task = await this.queueClient.dequeue(jobType, this.taskTypeToProcess);
      if (task) {
        this.logger.info({ msg: `getting task's job ${task.id}`, task });
        const job = await this.queueClient.jobManagerClient.getJob<unknown, unknown>(task.jobId);
        return { task, job } as IJobAndTaskResponse;
      }
    }
  }

  public stop(): void {
    this.logger.info({ msg: 'stopping polling' });
    this.isRunning = false;
  }

  private async notifyOnSuccess(jobId: string, taskId: string): Promise<void> {
    await this.queueClient.ack(jobId, taskId);
    await this.jobTrackerClient.notifyOnFinishedTask(taskId);
  }

  private async checkTaskAttempts(task: ITaskResponse<unknown>): Promise<void> {
    if (task.attempts >= this.maxTaskAttempts) {
      const message = `task ${task.id} reached max attempts, rejects as unrecoverable`;
      this.logger.warn({ msg: message, taskId: task.id, attempts: task.attempts });
      await this.queueClient.reject(task.jobId, task.id, false);
      await this.jobTrackerClient.notifyOnFinishedTask(task.id);
      throw new ReachedMaxTaskAttemptsError(message);
    }
  }
}
