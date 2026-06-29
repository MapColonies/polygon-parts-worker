import { accessSync } from 'fs';
import { getOtelMixin } from '@map-colonies/tracing-utils';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import { jsLogger } from '@map-colonies/js-logger';
import type { Logger } from '@map-colonies/js-logger';
import { instancePerContainerCachingFactory } from 'tsyringe';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import type { IHttpRetryConfig } from '@map-colonies/mc-utils';
import { InstanceType } from '@map-colonies/raster-shared';
import { Registry } from 'prom-client';
import { HANDLER_TOKENS, SERVICES, SERVICE_NAME } from './common/constants';
import { getTracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import type { IJobManagerConfig } from './common/interfaces';
import { IngestionJobHandler } from './models/ingestion/ingestionHandler';
import { ExportJobHandler } from './models/export/exportJobHandler';
import type { IS3Config } from './common/storage/s3Service';
import { getConfig, type ConfigType } from './common/config';

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

const validateRequiredDirectories = (container: DependencyContainer, instanceType: InstanceType): void => {
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const requiredDirectories =
    instanceType === InstanceType.INGESTION
      ? [
          { name: 'reportsPath', path: config.get('reportsPath') as string },
          { name: 'ingestionSourcesDirPath', path: config.get('ingestionSourcesDirPath') as string },
        ]
      : [{ name: 'gpkgsLocation', path: config.get('gpkgsLocation') as string }];

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

const getInstanceType = (config: ConfigType): InstanceType => {
  const instanceType = config.get('instanceType') as string;
  const allowed = Object.values(InstanceType) as string[];
  if (!allowed.includes(instanceType)) {
    throw new Error(`invalid instanceType '${instanceType}', must be one of: ${allowed.join(', ')}`);
  }
  return instanceType as InstanceType;
};

const getHandlerDependencies = (instanceType: InstanceType): InjectionObject<unknown>[] => {
  if (instanceType === InstanceType.INGESTION) {
    return [{ token: HANDLER_TOKENS.INGESTION, provider: { useClass: IngestionJobHandler } }];
  }
  return [{ token: HANDLER_TOKENS.EXPORT, provider: { useClass: ExportJobHandler } }];
};

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const configInstance = getConfig();
  const instanceType = getInstanceType(configInstance);

  const loggerConfig = configInstance.get('telemetry.logger');
  const logger = await jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });

  const metricsRegistry = new Registry();
  const tracer = trace.getTracer(SERVICE_NAME);
  const s3Config = configInstance.get('S3') as IS3Config;

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: configInstance } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METRICS, provider: { useValue: metricsRegistry } },
    { token: SERVICES.QUEUE_CLIENT, provider: { useFactory: instancePerContainerCachingFactory(queueClientFactory) } },
    ...getHandlerDependencies(instanceType),
    {
      token: SERVICES.S3CONFIG,
      provider: {
        useValue: s3Config,
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
  validateRequiredDirectories(registeredContainer, instanceType);

  return registeredContainer;
};
