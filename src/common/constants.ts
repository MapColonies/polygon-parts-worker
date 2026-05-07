import { readPackageJsonSync } from '@map-colonies/read-pkg';
import { getConfig, type ConfigType } from './config';

/* Job handler DI tokens: resolve from config after init — do not read config at module load time. */
/* eslint-disable @typescript-eslint/naming-convention */
interface JobDefinitionsJobs {
  new: { type: string };
  update: { type: string };
  swapUpdate: { type: string };
  export: { type: string };
}

interface HandlerTokens {
  NEW: string;
  UPDATE: string;
  SWAP: string;
  EXPORT: string;
}

export const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';
export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

export const SERVICES = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  TRACER: Symbol('Tracer'),
  METRICS: Symbol('Metrics'),
  S3CONFIG: Symbol('S3Config'),
  QUEUE_CLIENT: Symbol('QueueClient'),
  SHAPE_FILE_PROCESSOR: Symbol('ShapeFileProcessor'),
  TASK_METRICS: Symbol('TaskMetrics'),
  SHAPE_FILE_METRICS: Symbol('ShapeFileMetrics'),
  TRACING: Symbol('TracingManager'),
} satisfies Record<string, symbol>;

export const StorageProvider = {
  FS: 'FS',
  S3: 'S3',
} as const;

export type StorageProviderType = (typeof StorageProvider)[keyof typeof StorageProvider];

export const OgrFormat = {
  GPKG: 'GPKG',
  ESRI_SHAPEFILE: 'ESRI Shapefile',
};

export type OgrFormatType = (typeof OgrFormat)[keyof typeof OgrFormat];

export const S3_VALIDATION_REPORTS_FOLDER = 'validation-reports';

export const ZIP_CONTENT_TYPE = 'application/zip';

export const UTF8_ENCODING = 'utf-8';

export function getHandlerTokens(config: ConfigType): HandlerTokens {
  const jobs = config.get('jobDefinitions.jobs') as unknown as JobDefinitionsJobs;
  return {
    NEW: jobs.new.type,
    UPDATE: jobs.update.type,
    SWAP: jobs.swapUpdate.type,
    EXPORT: jobs.export.type,
  };
}

export function getHandlers(): HandlerTokens {
  return getHandlerTokens(getConfig());
}
/* eslint-enable @typescript-eslint/naming-convention */
