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
import { HttpClientV2 } from './common/http/httpClientV2';

//TODO: remove the following factory and use HttpClient from mc-utils when we remove the old HttpClient
const polygonPartsHttpClientFactory = (container: DependencyContainer): HttpClientV2 => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const httpRetryConfig = config.get<IHttpRetryConfig>('httpRetry');
  const baseUrl = config.get<string>('polygonPartsManager.baseUrl');
  return new HttpClientV2(logger, baseUrl, 'PolygonPartsManager', httpRetryConfig, config.get<boolean>('disableHttpClientLogs'));
};

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

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = (options?: RegisterOptions): DependencyContainer => {
  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });

  const metricsRegistry = new Registry();

  const tracer = trace.getTracer(SERVICE_NAME);

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.QUEUE_CLIENT, provider: { useFactory: instancePerContainerCachingFactory(queueClientFactory) } },
    { token: HANDLERS.NEW, provider: { useClass: IngestionJobHandler } },
    { token: HANDLERS.UPDATE, provider: { useClass: IngestionJobHandler } },
    { token: HANDLERS.SWAP, provider: { useClass: IngestionJobHandler } },
    { token: HANDLERS.EXPORT, provider: { useClass: ExportJobHandler } },
    { token: SERVICES.POLYGON_PARTS_HTTP_CLIENT, provider: { useFactory: instancePerContainerCachingFactory(polygonPartsHttpClientFactory) } },
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

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
