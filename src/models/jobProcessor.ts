import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { SERVICES } from '../common/constants';
import { IConfig, IJobAndTaskResponse, IPermittedJobTypes } from '../common/interfaces';
import { JobTrackerClient } from '../clients/jobTrackerClient';
import { initJobHandler } from './handlersFactory';

@injectable()
export class JobProcessor {
  private isRunning = true;
  private readonly dequeueIntervalMs: number;
  private readonly taskTypeToProcess: string;
  private readonly jobTypesToProcess: IPermittedJobTypes;
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
    this.jobTypesToProcess = { ingestionNew, ingestionUpdate, ingestionSwapUpdate };
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
          const jobHandler = initJobHandler(job.type, this.jobTypesToProcess);
          await jobHandler.processJob(job);
          await this.queueClient.ack(job.id, task.id);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'something went wrong';
        this.logger.error({ msg: 'error while handling job', error: errorMsg });
        if (jobAndTask) {
          const { job, task } = jobAndTask;
          const isResettable = true;
          await this.queueClient.reject(job.id, task.id, isResettable, errorMsg);
        }
      } finally {
        if (jobAndTask) {
          const taskId = jobAndTask.task.id;
          this.logger.info({ msg: 'notifying job tracker on task finished', taskId: taskId });
          await this.jobTrackerClient.notifyOnFinishedTask(taskId);
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
        const job = await this.queueClient.jobManagerClient.getJob<PolygonPartsPayload, unknown>(task.jobId);
        return { task, job } as IJobAndTaskResponse;
      }
    }
  }

  public stop(): void {
    this.logger.info({ msg: 'stopping polling' });
    this.isRunning = false;
  }
}
