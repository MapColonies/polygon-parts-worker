/* eslint-disable @typescript-eslint/no-magic-numbers */

import { get, set } from 'lodash';
import type { ConfigType } from '../../../src/common/config';

let mockConfig: Record<string, unknown> = {};
const getMock = jest.fn();
const hasMock = jest.fn();

const configMock = {
  get: getMock,
} as unknown as ConfigType;

const init = (): void => {
  getMock.mockImplementation((key: string): unknown => {
    return (get as (object: Record<string, unknown>, path: string) => unknown)(mockConfig, key);
  });
};

const setValue = (key: string | Record<string, unknown>, value?: unknown): void => {
  if (typeof key === 'string') {
    set(mockConfig, key, value);
  } else {
    mockConfig = { ...mockConfig, ...key };
  }
};

const clear = (): void => {
  mockConfig = {};
};

const setConfigValues = (values: Record<string, unknown>): void => {
  getMock.mockImplementation((key: string) => {
    const value: unknown = (get as (object: Record<string, unknown>, path: string) => unknown)(values, key);
    return value;
  });
};

const registerDefaultConfig = (): void => {
  const config = {
    telemetry: {
      logger: {
        level: 'info',
        prettyPrint: false,
      },
      tracing: {
        enabled: false,
        url: 'http://localhost:4318/v1/traces',
      },
      metrics: {
        enabled: false,
        url: 'http://localhost:4318/v1/metrics',
        interval: 5,
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 50, 250, 500],
      },
    },
    server: {
      port: 8080,
      request: {
        payload: {
          limit: '1mb',
        },
      },
      response: {
        compression: {
          enabled: true,
          options: null,
        },
      },
    },
    httpRetry: {
      attempts: 5,
      delay: 'exponential',
      shouldResetTimeout: true,
    },
    s3: {
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      endpointUrl: 'http://localhost:9000',
      bucket: 'bucket',
      sslEnabled: false,
    },
    disableHttpClientLogs: true,
    jobManagement: {
      config: {
        jobManagerBaseUrl: 'http://job-manager-test',
        heartbeat: {
          baseUrl: 'http://heart-beat-test',
          intervalMs: 3000,
        },
        jobTracker: {
          baseUrl: 'http://job-tracker-test',
        },
        dequeueIntervalMs: 3000,
      },
    },
    polygonPartsManager: {
      baseUrl: 'http://polygon-parts-manager-test',
    },
    downloadServer: {
      publicDns: 'http://localhost:8085',
      reportsDownloadPath: 'downloads/validation-reports',
    },
    reportStorageProvider: 'FS',
    gpkgsLocation: '/app/tiles_outputs/gpkgs',
    ingestionSourcesDirPath: 'tests/integration/shapeFiles',
    reportsPath: 'tests/integration/validation-reports',
    jobDefinitions: {
      tasks: {
        polygonParts: {
          type: 'polygon-parts',
          maxAttempts: 3,
        },
        validation: {
          type: 'validation',
          maxAttempts: 3,
          chunkMaxVertices: 2500,
          smallGeometriesPercentageThreshold: 5,
          smallHolesPercentageThreshold: 5,
        },
      },
      jobs: {
        new: {
          type: 'Ingestion_New',
        },
        update: {
          type: 'Ingestion_Update',
        },
        swapUpdate: {
          type: 'Ingestion_Swap_Update',
        },
        export: {
          type: 'Export',
        },
      },
    },
  };

  mockConfig = config as unknown as Record<string, unknown>;
  setConfigValues(config);
};

export { getMock, hasMock, configMock, setValue, clear, init, setConfigValues, registerDefaultConfig };
