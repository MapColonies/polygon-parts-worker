import { InputFiles, PolygonPart } from '@map-colonies/mc-model-types';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import type { FeatureCollection, Polygon } from 'geojson';
import { PolygonPartsPayload } from '@map-colonies/raster-shared';
import type { NullableRecordValues, ReplaceValuesOfType } from './types';

interface CommonPayload extends Omit<PolygonPartsPayload, 'partsData'>, PolygonPart {}
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

export interface CommonRecord extends InsertPartData {
  readonly id: string;
  readonly ingestionDateUTC: Date;
}
/**
 * Properties of part data for insertion
 */
export interface InsertPartData extends Readonly<Omit<CommonPayload, 'countries' | 'cities' | 'sensors'>> {
  readonly countries?: string;
  readonly cities?: string;
  readonly sensors: string;
}

export type FindPolygonPartsResponse = FeatureCollection<
  Polygon,
  ReplaceValuesOfType<
    NullableRecordValues<
      Omit<CommonRecord, 'countries' | 'cities' | 'footprint' | 'sensors'> & {
        readonly countries?: string[];
        readonly cities?: string[];
        readonly sensors: string[];
        requestFeatureId: string;
      }
    >,
    Date,
    string
  >
>;

// Type without requestFeatureId
export type FindPolygonPartsResponseWithoutRequestFeatureId = FeatureCollection<
  Polygon,
  Omit<FindPolygonPartsResponse['features'][number]['properties'], 'requestFeatureId'>
>;
