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

export interface IJobAndTask{
  job: IJobResponse<unknown, unknown>;
  task: ITaskResponse<unknown>;
}

export interface IJobHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleJobInit: (job: IJobResponse<any, any>, taskId: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleJobFinalize: (job: IJobResponse<any, any>, taskId: string) => Promise<void>;
}
