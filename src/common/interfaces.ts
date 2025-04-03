import { InputFiles } from '@map-colonies/mc-model-types';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import type { FeatureCollection, Polygon } from 'geojson';
import { PolygonPart, PolygonPartsPayload } from '@map-colonies/raster-shared';

type PolygonPartExtended = Omit<PolygonPart, 'footprint'> &
  Omit<PolygonPartsPayload, 'partsData'> & { requestFeatureId: string; partId: string; ingestionDateUTC: Date; id: string };
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

export interface IJobHandler<TJobParams = unknown> {
  processJob: (job: IJobResponse<TJobParams, unknown>) => Promise<void>;
}

export interface IPermittedJobTypes {
  ingestionNew: string;
  ingestionUpdate: string;
  ingestionSwapUpdate: string;
  exportJob: string;
}

export interface IngestionJobParams {
  metadata: Record<string, unknown>;
  partsData: PolygonPart[];
  inputFiles: InputFiles;
  additionalParams: Record<string, unknown>;
}

export type FindPolygonPartsResponse = FeatureCollection<Polygon, PolygonPartExtended>;

export type FindPolygonPartsResponseWithoutRequestFeatureId = FeatureCollection<Polygon, Omit<PolygonPartExtended, 'requestFeatureId'>>;
