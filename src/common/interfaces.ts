import { InputFiles, PolygonPart } from '@map-colonies/mc-model-types';
import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import { FeatureCollection } from 'geojson';

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

export interface JobParams {
  metadata: Record<string, unknown>;
  partsData: PolygonPart[];
  inputFiles: InputFiles;
  additionalParams: Record<string, unknown>;
}

export interface ExportJobParams {
  additionalParams: {
    fileNamesTemplates: {
      dataURI: string;
      metadataURI: string;
    };
    relativeDirectoryPath: string;
    packageRelativePath: string;
  };
  exportInputParams: {
    roi: FeatureCollection;
    crs: 'EPSG:4326';
    callbacks?: {
      url: string;
      roi: FeatureCollection;
    }[];
  };
}
