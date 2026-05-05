import { readPackageJsonSync } from '@map-colonies/read-pkg';
import { getConfig, type ConfigType } from './config';

const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';
const DEFAULT_SERVER_PORT = 80;

const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
const SERVICES = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  TRACER: Symbol('Tracer'),
  METRICS_REGISTRY: Symbol('MetricsRegistry'),
  S3CONFIG: Symbol('S3Config'),
  QUEUE_CLIENT: Symbol('QueueClient'),
  SHAPE_FILE_PROCESSOR: Symbol('ShapeFileProcessor'),
  TASK_METRICS: Symbol('TaskMetrics'),
  SHAPE_FILE_METRICS: Symbol('ShapeFileMetrics'),
  TRACING: Symbol('TracingManager'),
} satisfies Record<string, symbol>;

const StorageProvider = {
  FS: 'FS',
  S3: 'S3',
} as const;

type StorageProviderType = (typeof StorageProvider)[keyof typeof StorageProvider];

const OgrFormat = {
  GPKG: 'GPKG',
  ESRI_SHAPEFILE: 'ESRI Shapefile',
};

type OgrFormatType = (typeof OgrFormat)[keyof typeof OgrFormat];

const S3_VALIDATION_REPORTS_FOLDER = 'validation-reports';

const ZIP_CONTENT_TYPE = 'application/zip';

const UTF8_ENCODING = 'utf-8';

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

function getHandlerTokens(config: ConfigType): HandlerTokens {
  const jobs = config.get('jobDefinitions.jobs') as unknown as JobDefinitionsJobs;
  return {
    NEW: jobs.new.type,
    UPDATE: jobs.update.type,
    SWAP: jobs.swapUpdate.type,
    EXPORT: jobs.export.type,
  };
}

function getHandlers(): HandlerTokens {
  return getHandlerTokens(getConfig());
}
/* eslint-enable @typescript-eslint/naming-convention */

export {
  DEFAULT_SERVER_PORT,
  IGNORED_INCOMING_TRACE_ROUTES,
  IGNORED_OUTGOING_TRACE_ROUTES,
  OgrFormat,
  S3_VALIDATION_REPORTS_FOLDER,
  SERVICES,
  SERVICE_NAME,
  StorageProvider,
  type OgrFormatType,
  type StorageProviderType,
  UTF8_ENCODING,
  ZIP_CONTENT_TYPE,
  getHandlers,
  getHandlerTokens,
};
