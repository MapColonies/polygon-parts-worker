import z from 'zod';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import type { FeatureCollection, Polygon } from 'geojson';
import { ProcessingState } from '@map-colonies/mc-utils';
import { PartFeatureProperties, polygonPartsPayloadSchema } from '@map-colonies/raster-shared';
import { ingestionJobSchema } from '../schemas/ingestion.schema';

type PolygonPartExtended = PartFeatureProperties &
  Omit<z.infer<typeof polygonPartsPayloadSchema>, 'partsDataChunk'> & {
    requestFeatureId: string;
    partId: string;
    ingestionDateUTC: Date;
    id: string;
  };
export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface IJobManagerConfig {
  jobManagerBaseUrl: string;
  heartbeat: IHeartbeatConfig;
  dequeueIntervalMs: number;
}

export interface IHeartbeatConfig {
  baseUrl: string;
  intervalMs: number;
}

export interface IJobAndTaskResponse {
  task: ITaskResponse<unknown>;
  job: IJobResponse<unknown, unknown>;
}

export interface IJobHandler<TJobParams = unknown, TTaskParams = unknown> {
  processJob: (job: IJobResponse<TJobParams, unknown>, task: ITaskResponse<TTaskParams>) => Promise<void>;
}

export interface IPermittedJobTypes {
  ingestionNew: string;
  ingestionUpdate: string;
  ingestionSwapUpdate: string;
  exportJob: string;
}

export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type IngestionJobParams = IngestionJob['parameters'];
export type FindPolygonPartsResponse = FeatureCollection<Polygon, PolygonPartExtended>;

export type ExportPolygonPartsResponse = FeatureCollection<Polygon, Omit<PolygonPartExtended, 'requestFeatureId'>>;

//TODO: extend from base schema in raster-shared
export interface ValidationsTaskParameters {
  processingState: ProcessingState | null;
}

export interface FeatureResolutions {
  resolutionMeter: number;
  resolutionDegree: number;
}
