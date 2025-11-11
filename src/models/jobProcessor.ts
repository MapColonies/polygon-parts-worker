import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { Logger } from '@map-colonies/js-logger';
import { ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { Tracer } from '@opentelemetry/api';
import { inject, injectable } from 'tsyringe';
import { JobTrackerClient } from '../clients/jobTrackerClient';
import { SERVICES } from '../common/constants';
import { TaskMetricLabels, TaskMetrics } from '../common/otel/metrics/taskMetrics';
import { ReachedMaxTaskAttemptsError, UnrecoverableTaskError } from '../common/errors';
import { IConfig, IJobAndTaskResponse, IPermittedJobTypes, ITasksConfig } from '../common/interfaces';
import { initJobHandler } from './handlersFactory';

@injectable()
export class JobProcessor {
  private isRunning = true;
  private readonly dequeueIntervalMs: number;
  private readonly jobTypesToProcess: IPermittedJobTypes;
  private readonly taskTypesToProcess: string[];
  private readonly configuredTasks: ITasksConfig;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(SERVICES.QUEUE_CLIENT) private readonly queueClient: QueueClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(JobTrackerClient) private readonly jobTrackerClient: JobTrackerClient,
    @inject(TaskMetrics) private readonly taskMetrics: TaskMetrics
  ) {
    this.dequeueIntervalMs = this.config.get<number>('jobManagement.config.dequeueIntervalMs');
    const ingestionNew = this.config.get<string>('jobDefinitions.jobs.new.type');
    const ingestionUpdate = this.config.get<string>('jobDefinitions.jobs.update.type');
    const ingestionSwapUpdate = this.config.get<string>('jobDefinitions.jobs.swapUpdate.type');
    const exportJob = this.config.get<string>('jobDefinitions.jobs.export.type');
    this.jobTypesToProcess = { ingestionNew, ingestionUpdate, ingestionSwapUpdate, exportJob };
    this.configuredTasks = this.config.get<ITasksConfig>('jobDefinitions.tasks');
    this.taskTypesToProcess = this.setUpTaskTypesToProcess(this.configuredTasks);
  }

  @withSpanAsyncV4
  public async start(options: { runOnce?: boolean } = { runOnce: false }): Promise<void> {
    this.logger.info({ msg: 'starting polling' });
    while (this.isRunning) {
      let jobAndTask: IJobAndTaskResponse | undefined;
      try {
        this.logger.debug({ msg: 'fetching next job' });
        jobAndTask = await this.getJobAndTask();

        if (jobAndTask) {
          const { job, task } = jobAndTask;
          const labels: TaskMetricLabels = {
            jobType: job.type,
            taskType: task.type,
          };

          await this.taskMetrics.withTaskMetrics(labels, async () => {
            this.logger.info({ msg: 'processing job', jobId: job.id });
            await this.checkTaskAttempts(task);
            const jobHandler = initJobHandler(job.type, this.jobTypesToProcess);
            await jobHandler.processJob(job, task);

            this.logger.info({ msg: 'notifying job tracker and job manager on task finished', taskId: task.id });
            await this.notifyOnSuccess(job.id, task.id);
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'something went wrong';
        this.logger.error({ msg: 'error while handling job', error: errorMsg });
        if (jobAndTask && !(error instanceof ReachedMaxTaskAttemptsError)) {
          const { job, task } = jobAndTask;
          const isRecoverable = !(error instanceof UnrecoverableTaskError);
          await this.queueClient.reject(job.id, task.id, isRecoverable, errorMsg);
        }
      }
      if (options.runOnce === true) {
        this.logger.debug({ msg: 'runOnce mode - exiting after one iteration' });
        break;
      }
      await setTimeoutPromise(this.dequeueIntervalMs);
    }
  }

  public stop(): void {
    this.logger.info({ msg: 'stopping polling' });
    this.isRunning = false;
  }

  @withSpanAsyncV4
  private async getJobAndTask(): Promise<IJobAndTaskResponse | undefined> {
    const jobTypesToProcessArray = Object.values(this.jobTypesToProcess) as string[];

    for (const jobType of jobTypesToProcessArray) {
      for (const taskType of this.taskTypesToProcess) {
        this.logger.debug({ msg: `try to dequeue task of type "${taskType}" and job of type "${jobType}"` }, jobType, taskType);
        const task = await this.queueClient.dequeue(jobType, taskType);
        if (task) {
          this.logger.info({ msg: `getting task's job ${task.id}`, task });
          const job = await this.queueClient.jobManagerClient.getJob<unknown, unknown>(task.jobId);
          return { task, job };
        }
      }
    }
  }

  private setUpTaskTypesToProcess(configTasks: ITasksConfig): string[] {
    const taskTypes = [];
    for (const [, taskConfig] of Object.entries(configTasks)) {
      taskTypes.push(taskConfig.type);
    }
    return taskTypes;
  }

  private async notifyOnSuccess(jobId: string, taskId: string): Promise<void> {
    await this.queueClient.ack(jobId, taskId);
    await this.jobTrackerClient.notifyOnFinishedTask(taskId);
  }

  private getMaxTaskAttempts(taskType: string): number {
    for (const [, taskConfig] of Object.entries(this.configuredTasks)) {
      if (taskConfig.type === taskType) {
        return taskConfig.maxAttempts;
      }
    }
    throw new UnrecoverableTaskError(`task type ${taskType} is not configured`);
  }

  private async checkTaskAttempts(task: ITaskResponse<unknown>): Promise<void> {
    if (task.attempts >= this.getMaxTaskAttempts(task.type)) {
      const message = `task ${task.id} reached max attempts, rejects as unrecoverable`;
      this.logger.warn({ msg: message, taskId: task.id, attempts: task.attempts });
      await this.queueClient.reject(task.jobId, task.id, false);
      await this.jobTrackerClient.notifyOnFinishedTask(task.id);
      throw new ReachedMaxTaskAttemptsError(message);
    }
  }
}
