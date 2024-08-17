export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface IQueueConfig {
  jobManagerBaseUrl: string;
  heartbeatManagerBaseUrl: string;
  dequeueFinalizeIntervalMs: number;
  heartbeatIntervalMs: number;
  jobType: string;
  tilesTaskType: string;
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
