import { PolygonPartsPayload } from "@map-colonies/mc-model-types";
import { IJobResponse, ITaskResponse } from "@map-colonies/mc-priority-queue";

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

export interface IJobAndTask {
  job: IJobResponse<PolygonPartsPayload, unknown>;
  task: ITaskResponse<unknown>;
}

export interface JobHandler {
  processJob: (job: IJobResponse<PolygonPartsPayload, unknown>) => Promise<void>;
}
