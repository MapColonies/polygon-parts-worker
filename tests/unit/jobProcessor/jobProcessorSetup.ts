import { IJobResponse, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobTrackerClient } from '../../../src/clients/jobTrackerClient';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { loggerMock, shapeFileMetricsMock, taskMetricsMock } from '../mocks/telemetryMock';
import { ExportJobHandler } from '../../../src/models/export/exportJobHandler';
import { ValidationErrorCollector } from '../../../src/models/ingestion/validationErrorCollector';

const mockProcessJob = jest.fn() as MockProcessJob;

registerDefaultConfig();
const mockQueueClient = new QueueClient(
  loggerMock,
  configMock.get<string>('jobManagement.config.jobManagerBaseUrl'),
  configMock.get<string>('jobManagement.config.heartbeat.baseUrl'),
  configMock.get<number>('jobManagement.config.dequeueIntervalMs'),
  configMock.get<number>('jobManagement.config.heartbeat.intervalMs')
);

const mockTracer = trace.getTracer('testingTracer');
const mockPolygonPartsClient = new PolygonPartsManagerClient(loggerMock, configMock, mockTracer);
const mockJobTrackerClient = new JobTrackerClient(loggerMock, configMock, mockTracer);

const mockValidationErrorCollector = new ValidationErrorCollector(loggerMock, configMock);

function jobProcessorInstance(): JobProcessor {
  return new JobProcessor(loggerMock, mockTracer, mockQueueClient, configMock, mockJobTrackerClient, taskMetricsMock);
}

function ingestionJobJobHandlerInstance(): IngestionJobHandler {
  mockPolygonPartsClient.validate = jest.fn().mockResolvedValue(undefined);
  return new IngestionJobHandler(loggerMock, mockQueueClient, mockPolygonPartsClient, mockValidationErrorCollector, shapeFileMetricsMock, configMock);
}

function exportJobHandlerInstance(): ExportJobHandler {
  return new ExportJobHandler(loggerMock, configMock, mockPolygonPartsClient);
}

export {
  configMock,
  jobProcessorInstance,
  mockJobTrackerClient,
  mockProcessJob,
  mockQueueClient,
  ingestionJobJobHandlerInstance,
  exportJobHandlerInstance,
  mockPolygonPartsClient,
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
