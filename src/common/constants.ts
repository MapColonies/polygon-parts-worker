import { readPackageJsonSync } from '@map-colonies/read-pkg';
import config from 'config';

export const SERVICE_NAME = readPackageJsonSync().name ?? 'unknown_service';
export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

/* eslint-disable @typescript-eslint/naming-convention */
export const SERVICES = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
  TRACER: Symbol('Tracer'),
  METER: Symbol('Meter'),
  METRICS_REGISTRY: Symbol('MetricsRegistry'),
  QUEUE_CLIENT: Symbol('QueueClient'),
  SHAPE_FILE_PROCESSOR: Symbol('ShapeFileProcessor'),
  TASK_METRICS: Symbol('TaskMetrics'),
  SHAPE_FILE_METRICS: Symbol('ShapeFileMetrics'),
  TRACING: Symbol('TracingManager'),
  POLYGON_PARTS_HTTP_CLIENT: Symbol('PolygonPartsHttpClient'),
} satisfies Record<string, symbol>;

/* eslint-disable @typescript-eslint/naming-convention */
export const HANDLERS = {
  NEW: config.get<string>('jobDefinitions.jobs.new.type'),
  UPDATE: config.get<string>('jobDefinitions.jobs.update.type'),
  SWAP: config.get<string>('jobDefinitions.jobs.swapUpdate.type'),
  EXPORT: config.get<string>('jobDefinitions.jobs.export.type'),
} satisfies Record<string, string>;
