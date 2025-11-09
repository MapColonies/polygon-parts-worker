import jsLogger from '@map-colonies/js-logger';
import { IJobResponse, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobTrackerClient } from '../../../src/clients/jobTrackerClient';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { shapeFileMetricsMock, taskMetricsMock } from '../mocks/telemetryMock';
import { ExportJobHandler } from '../../../src/models/export/exportJobHandler';
import { createHttpClientV2Mock } from '../mocks/httpClientV2Mock';
import { HttpClientV2 } from '../../../src/common/http/httpClientV2';

const mockLogger = jsLogger({ enabled: false });

const mockProcessJob = jest.fn() as MockProcessJob;

registerDefaultConfig();
const mockQueueClient = new QueueClient(
  mockLogger,
  configMock.get<string>('jobManagement.config.jobManagerBaseUrl'),
  configMock.get<string>('jobManagement.config.heartbeat.baseUrl'),
  configMock.get<number>('jobManagement.config.dequeueIntervalMs'),
  configMock.get<number>('jobManagement.config.heartbeat.intervalMs')
);

const mockTracer = trace.getTracer('testingTracer');
const mockHttpClientV2 = createHttpClientV2Mock() as HttpClientV2;
const mockPolygonPartsClient = new PolygonPartsManagerClient(mockLogger, configMock, mockTracer, mockHttpClientV2);
const mockJobTrackerClient = new JobTrackerClient(mockLogger, configMock, mockTracer);

function jobProcessorInstance(): JobProcessor {
  return new JobProcessor(mockLogger, mockTracer, mockQueueClient, configMock, mockJobTrackerClient, taskMetricsMock);
}

function ingestionJobJobHandlerInstance(): IngestionJobHandler {
  return new IngestionJobHandler(mockLogger, mockQueueClient, mockPolygonPartsClient, shapeFileMetricsMock, configMock);
}

function exportJobHandlerInstance(): ExportJobHandler {
  return new ExportJobHandler(mockLogger, configMock, mockPolygonPartsClient);
}

export {
  configMock,
  jobProcessorInstance,
  mockJobTrackerClient,
  mockProcessJob,
  mockQueueClient,
  ingestionJobJobHandlerInstance,
  exportJobHandlerInstance,
  mockHttpClientV2,
};

export type MockDequeue = jest.MockedFunction<(jobType: string, taskType: string) => Promise<ITaskResponse<unknown> | null>>;
export type MockGetJob = jest.MockedFunction<(jobId: string) => Promise<IJobResponse<unknown, unknown>>>;
export type MockProcessJob = jest.MockedFunction<() => Promise<void>>;

export interface JobProcessorTestContext {
  jobProcessor: JobProcessor;
  mockDequeue: MockDequeue;
  mockGetJob: MockGetJob;
  queueClient: QueueClient;
}
