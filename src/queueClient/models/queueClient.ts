import { Logger } from '@map-colonies/js-logger';
import { inject, singleton } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { TaskHandler as QueueHandler, JobManagerClient } from '@map-colonies/mc-priority-queue';
import { IHttpRetryConfig } from '@map-colonies/mc-utils';
import { IConfig, IQueueConfig } from '../../common/interfaces';

@singleton()
export class QueueClient {
  public readonly queueHandlerForFinalizeTasks: QueueHandler;
  public readonly jobsClient: JobManagerClient;

  public constructor(
    @inject(SERVICES.CONFIG) config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig
  ) {
    this.queueHandlerForFinalizeTasks = new QueueHandler(
      logger,
      this.queueConfig.jobType,
      this.queueConfig.jobManagerBaseUrl,
      this.queueConfig.heartbeatManagerBaseUrl,
      this.queueConfig.dequeueFinalizeIntervalMs,
      this.queueConfig.heartbeatIntervalMs,
      config.get<IHttpRetryConfig>('externalClientsConfig.httpRetry'),
      undefined,
      undefined,
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs'),
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs')
    );
    this.jobsClient = new JobManagerClient(
      logger,
      this.queueConfig.jobType,
      this.queueConfig.jobManagerBaseUrl,
      config.get<IHttpRetryConfig>('externalClientsConfig.httpRetry'),
      'jobManagerClient',
      config.get<boolean>('externalClientsConfig.disableHttpClientLogs')
    );
  }
}