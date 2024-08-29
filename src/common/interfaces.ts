export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface IJobManagerConfig {
  jobManagerBaseUrl: string;
  heartbeat: IHeartbeatConfig;
  dequeueIntervalMs: number;
}

export interface LogContext {
  fileName: string;
  class?: string;
  function?: string;
}

export interface IHeartbeatConfig {
  baseUrl: string;
  intervalMs: number;
}
