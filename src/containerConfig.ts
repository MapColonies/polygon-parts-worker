import { accessSync } from 'fs';
import { getOtelMixin } from '@map-colonies/tracing-utils';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import { jsLogger } from '@map-colonies/js-logger';
import type { Logger } from '@map-colonies/js-logger';
import { instanceCachingFactory, instancePerContainerCachingFactory } from 'tsyringe';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import type { IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Registry } from 'prom-client';
import { getHandlerTokens, SERVICES, SERVICE_NAME } from './common/constants';
import { getTracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import type { IJobManagerConfig } from './common/interfaces';
import { IngestionJobHandler } from './models/ingestion/ingestionHandler';
import { ExportJobHandler } from './models/export/exportJobHandler';
import type { IS3Config } from './common/storage/s3Service';
import { getConfig, type ConfigType } from './common/config';

interface LoggerBootstrapConfig {
  level: string;
  prettyPrint: boolean;
  opentelemetryOptions?: Record<string, unknown>;
}

const queueClientFactory = (container: DependencyContainer): QueueClient => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const queueConfig = config.get('jobManagement.config') as unknown as IJobManagerConfig;
  const httpRetryConfig = config.get('httpRetry') as IHttpRetryConfig;
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
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const requiredDirectories = [
    { name: 'reportsPath', path: config.get('reportsPath') as string },
    { name: 'ingestionSourcesDirPath', path: config.get('ingestionSourcesDirPath') as string },
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
    } catch {
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

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const configInstance = getConfig();
  const handlerTokens = getHandlerTokens(configInstance);

  const loggerConfig = configInstance.get('telemetry.logger') as LoggerBootstrapConfig;
  const logger = await jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });

  const metricsRegistry = new Registry();
  const tracer = trace.getTracer(SERVICE_NAME);
  const s3Config = configInstance.get('S3') as IS3Config;

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: configInstance } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.QUEUE_CLIENT, provider: { useFactory: instancePerContainerCachingFactory(queueClientFactory) } },
    { token: handlerTokens.NEW, provider: { useClass: IngestionJobHandler } },
    { token: handlerTokens.UPDATE, provider: { useClass: IngestionJobHandler } },
    { token: handlerTokens.SWAP, provider: { useClass: IngestionJobHandler } },
    { token: handlerTokens.EXPORT, provider: { useClass: ExportJobHandler } },
    {
      token: SERVICES.S3CONFIG,
      provider: {
        useValue: s3Config,
      },
    },
    {
      token: SERVICES.METRICS_REGISTRY,
      provider: {
        useFactory: instanceCachingFactory((c) => {
          const cfg = c.resolve<ConfigType>(SERVICES.CONFIG);
          const useMetrics = cfg.get('telemetry.metrics.enabled') as unknown as boolean;
          if (useMetrics) {
            metricsRegistry.setDefaultLabels({
              app: SERVICE_NAME,
            });
            return metricsRegistry;
          }
          return undefined;
        }),
      },
    },
    {
      token: 'onSignal',
      provider: {
        useValue: {
          useValue: async (): Promise<void> => {
            await Promise.all([getTracing().stop()]);
          },
        },
      },
    },
  ];

  const registeredContainer = registerDependencies(dependencies, options?.override, options?.useChild);
  validateRequiredDirectories(registeredContainer);

  return registeredContainer;
};
