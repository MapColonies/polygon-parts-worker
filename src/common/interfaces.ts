import { PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { IJobResponse } from '@map-colonies/mc-priority-queue';

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

export interface JobHandler {
  processJob: (job: IJobResponse<PolygonPartsPayload, unknown>) => Promise<void>;
}
