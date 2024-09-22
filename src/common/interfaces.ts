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
  job: IJobResponse<unknown, unknown>;
  task: ITaskResponse<unknown>;
}

export interface JobHandler {
  processJob: (job: IJobResponse<unknown, unknown>) => Promise<void>;
}
