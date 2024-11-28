import { PolygonPartsPayload, PolygonPartsEntityName } from '@map-colonies/mc-model-types';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';

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
  job: JobProfile;
}

export interface IJobHandler {
  processJob: (job: IJobResponse<PolygonPartsPayload, unknown>) => Promise<PolygonPartsEntityName>;
}

export interface IPermittedJobTypes {
  ingestionNew: string;
  ingestionUpdate: string;
  ingestionSwapUpdate: string;
}
export type PolygonPartsPayloadAndAdditionalParams = PolygonPartsPayload & { additionalParams: Record<string, unknown> };

export type JobProfile = IJobResponse<PolygonPartsPayloadAndAdditionalParams, unknown>;
