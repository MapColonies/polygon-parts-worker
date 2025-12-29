import { accessSync } from 'fs';
import config, { IConfig } from 'config';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { Logger, LoggerOptions } from '@map-colonies/js-logger';
import { instanceCachingFactory, instancePerContainerCachingFactory } from 'tsyringe';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Registry } from 'prom-client';
import { HANDLERS, SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { IJobManagerConfig } from './common/interfaces';
import { IngestionJobHandler } from './models/ingestion/ingestionHandler';
import { ExportJobHandler } from './models/export/exportJobHandler';
import { IS3Config } from './common/storage/s3Service';

const queueClientFactory = (container: DependencyContainer): QueueClient => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const queueConfig = config.get<IJobManagerConfig>('jobManagement.config');
  const httpRetryConfig = config.get<IHttpRetryConfig>('httpRetry');
  return new QueueClient(
    logger,
    queueConfig.jobManagerBaseUrl,
    queueConfig.heartbeat.baseUrl,
    queueConfig.dequeueIntervalMs,
    queueConfig.heartbeat.intervalMs,
    httpRetryConfig
  );
};

const validateRequiredDirectories = (container: DependencyContainer): void => {
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const requiredDirectories = [
    { name: 'reportsPath', path: config.get<string>('reportsPath') },
    { name: 'ingestionSourcesDirPath', path: config.get<string>('ingestionSourcesDirPath') },
    // Add more required directories here in the future
  ];

  const missingDirectories: string[] = [];

  for (const dir of requiredDirectories) {
    try {
      accessSync(dir.path);
      logger.info({
        msg: 'Required directory exists',
        name: dir.name,
        path: dir.path,
      });
    } catch (error) {
      missingDirectories.push(`${dir.name}: ${dir.path}`);
    }
  }

  if (missingDirectories.length > 0) {
    const errorMessage = `Required directories do not exist:${missingDirectories.join(', ')}`;
    logger.fatal({ msg: errorMessage });
    throw new Error(errorMessage);
  }
};

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = (options?: RegisterOptions): DependencyContainer => {
  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');

  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });

  const metricsRegistry = new Registry();
  const tracer = trace.getTracer(SERVICE_NAME);
  const s3Config = config.get<IS3Config>('S3');

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.QUEUE_CLIENT, provider: { useFactory: instancePerContainerCachingFactory(queueClientFactory) } },
    { token: HANDLERS.NEW, provider: { useClass: IngestionJobHandler } },
    { token: HANDLERS.UPDATE, provider: { useClass: IngestionJobHandler } },
    { token: HANDLERS.SWAP, provider: { useClass: IngestionJobHandler } },
    { token: HANDLERS.EXPORT, provider: { useClass: ExportJobHandler } },
    {
      token: SERVICES.S3CONFIG,
      provider: {
        useValue: s3Config,
      },
    },
    {
      token: SERVICES.METRICS_REGISTRY,
      provider: {
        useFactory: instanceCachingFactory((container) => {
          const config = container.resolve<IConfig>(SERVICES.CONFIG);
          const useMetrics = config.get<boolean>('telemetry.metrics.enabled');
          if (useMetrics) {
            metricsRegistry.setDefaultLabels({
              app: SERVICE_NAME,
            });
            return metricsRegistry;
          }
        }),
      },
    },
    {
      token: 'onSignal',
      provider: {
        useValue: async (): Promise<void> => {
          await Promise.all([tracing.stop()]);
        },
      },
    },
  ];

  const registeredContainer = registerDependencies(dependencies, options?.override, options?.useChild);
  validateRequiredDirectories(registeredContainer);

  return registeredContainer;
};
