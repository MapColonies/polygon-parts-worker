// src/common/telemetry/metrics/taskMetrics.ts
import { singleton, inject } from 'tsyringe';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { Logger } from '@map-colonies/js-logger';
import { IConfig } from 'config';
import { SERVICES } from '../../constants';

export interface TaskMetricLabels {
  jobType: string;
  taskType: string;
  status?: OperationStatus;
  errorType?: string;
}

@singleton()
export class TaskMetrics {
  // Task processing metrics
  private tasksProcessedCounter?: Counter;
  private tasksProcessingDuration?: Histogram;
  private tasksSuccessCounter?: Counter;
  private tasksFailureCounter?: Counter;

  // Gauge metrics
  private activeTasksGauge?: Gauge;

  // Configuration
  private readonly taskBuckets: number[];
  private readonly metricsEnabled: boolean;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS_REGISTRY) private readonly registry?: Registry
  ) {
    this.metricsEnabled = this.config.get<boolean>('telemetry.metrics.enabled');
    this.taskBuckets = this.config.get<number[]>('telemetry.metrics.buckets');

    if (this.registry && this.metricsEnabled) {
      this.initializeMetrics();
      this.logger.info('Task metrics initialized');
    }
  }

  // === Task Processing ===
  public recordTaskProcessing(duration: number, labels: TaskMetricLabels): void {
    if (!this.metricsEnabled) {
      return;
    }

    try {
      const { jobType, taskType, status = OperationStatus.COMPLETED } = labels;

      // Record duration
      this.tasksProcessingDuration?.observe({ jobType, taskType, status }, duration);

      // Increment processed counter
      this.tasksProcessedCounter?.inc({ jobType, taskType });

      // Increment status-specific counters
      if (status === OperationStatus.COMPLETED) {
        this.tasksSuccessCounter?.inc({ jobType, taskType });
      } else if (status === OperationStatus.FAILED) {
        this.tasksFailureCounter?.inc({ jobType, taskType, errorType: labels.errorType ?? 'UnknownError' });
      }
    } catch (error) {
      this.logger.error('Failed to record task processing metrics', { error, labels });
    }
  }

  // === Active Tasks Management ===
  public incrementActiveTasks(labels: Pick<TaskMetricLabels, 'jobType' | 'taskType'>): void {
    if (!this.metricsEnabled) {
      return;
    }

    try {
      this.activeTasksGauge?.inc(labels);
    } catch (error) {
      this.logger.error('Failed to increment active tasks gauge', { error, labels });
    }
  }

  public decrementActiveTasks(labels: Pick<TaskMetricLabels, 'jobType' | 'taskType'>): void {
    if (!this.metricsEnabled) {
      return;
    }

    try {
      this.activeTasksGauge?.dec(labels);
    } catch (error) {
      this.logger.error('Failed to decrement active tasks gauge', { error, labels });
    }
  }

  // === Utility Methods ===
  public async withTaskMetrics<T>(labels: Pick<TaskMetricLabels, 'jobType' | 'taskType'>, fn: () => Promise<T>): Promise<T> {
    if (!this.metricsEnabled) {
      return fn();
    }

    const startTime = Date.now();
    this.incrementActiveTasks(labels);

    try {
      const result = await fn();
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds

      this.recordTaskProcessing(duration, { ...labels, status: OperationStatus.COMPLETED });
      return result;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

      this.recordTaskProcessing(duration, {
        ...labels,
        status: OperationStatus.FAILED,
        errorType,
      });

      throw error;
    } finally {
      this.decrementActiveTasks(labels);
    }
  }

  private initializeMetrics(): void {
    this.tasksProcessedCounter = new Counter({
      name: 'polygon_parts_tasks_processed_total',
      help: 'Total number of tasks processed',
      labelNames: ['jobType', 'taskType'],
      registers: [this.registry!],
    });

    this.tasksProcessingDuration = new Histogram({
      name: 'polygon_parts_tasks_processing_duration_seconds',
      help: 'Duration of task processing in seconds',
      labelNames: ['jobType', 'taskType', 'status'],
      registers: [this.registry!],
      buckets: this.taskBuckets,
    });

    this.tasksSuccessCounter = new Counter({
      name: 'polygon_parts_tasks_success_total',
      help: 'Counter for the number of tasks that succeeded',
      labelNames: ['jobType', 'taskType'],
      registers: [this.registry!],
    });

    this.tasksFailureCounter = new Counter({
      name: 'polygon_parts_tasks_failure_total',
      help: 'Number of failed tasks',
      labelNames: ['jobType', 'taskType', 'errorType'],
      registers: [this.registry!],
    });

    this.activeTasksGauge = new Gauge({
      name: 'polygon_parts_active_tasks',
      help: 'Number of currently active tasks',
      labelNames: ['jobType', 'taskType'],
      registers: [this.registry!],
    });
  }
}
