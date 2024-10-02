import { readPackageJsonSync } from '@map-colonies/read-pkg';

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
  QUEUE_CLIENT: Symbol('QueueClient'),
} satisfies Record<string, symbol>;

/* eslint-disable @typescript-eslint/naming-convention */
export const HANDLERS = {
  NEW: Symbol('Ingestion_New'),
  UPDATE: Symbol('Ingestion_Update'),
  SWAP: Symbol('Ingestion_Swap_Update'),
  REMOVE: Symbol('Remove_Layer'),
} satisfies Record<string, symbol>;
