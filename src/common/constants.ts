import { readPackageJsonSync } from '@map-colonies/read-pkg';
import { getConfig } from './config';

export const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';
export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  TRACER: Symbol('Tracer'),
  METRICS: Symbol('Metrics'),
  METRICS_REGISTRY: Symbol('MetricsRegistry'),
  S3CONFIG: Symbol('S3Config'),
  QUEUE_CLIENT: Symbol('QueueClient'),
  SHAPE_FILE_PROCESSOR: Symbol('ShapeFileProcessor'),
  TASK_METRICS: Symbol('TaskMetrics'),
  SHAPE_FILE_METRICS: Symbol('ShapeFileMetrics'),
  TRACING: Symbol('TracingManager'),
  INIT_HANDLERS: Symbol('InitHandlers'),
} satisfies Record<string, symbol>;

/* eslint-disable @typescript-eslint/naming-convention */
export const getHandlers = (): Record<'NEW' | 'UPDATE' | 'SWAP' | 'EXPORT', string> => {
  const config = getConfig();
  return {
    NEW: config.get('jobDefinitions.jobs.new.type') as unknown as string,
    UPDATE: config.get('jobDefinitions.jobs.update.type') as unknown as string,
    SWAP: config.get('jobDefinitions.jobs.swapUpdate.type') as unknown as string,
    EXPORT: config.get('jobDefinitions.jobs.export.type') as unknown as string,
  };
};

export const StorageProvider = {
  FS: 'FS',
  S3: 'S3',
} as const;

export type StorageProvider = (typeof StorageProvider)[keyof typeof StorageProvider];

export const OgrFormat = {
  GPKG: 'GPKG',
  ESRI_SHAPEFILE: 'ESRI Shapefile',
};
export type OgrFormat = (typeof OgrFormat)[keyof typeof OgrFormat];

export const S3_VALIDATION_REPORTS_FOLDER = 'validation-reports';

export const ZIP_CONTENT_TYPE = 'application/zip';

export const UTF8_ENCODING = 'utf-8';
