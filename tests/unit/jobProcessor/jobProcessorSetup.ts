import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import jsLogger from '@map-colonies/js-logger';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { IJobHandler } from '../../../src/common/interfaces';
import { NewJobHandler } from '../../../src/models/newJobHandler';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';

const mockLogger = jsLogger({ enabled: false });

const mockDequeue = jest.fn() as MockDequeue;
const mockGetJob = jest.fn() as MockGetJob;
const mockProcessJob = jest.fn() as MockProcessJob;

registerDefaultConfig();
const mockQueueClient = new QueueClient(
  mockLogger,
  configMock.get<string>('jobManagement.config.jobManagerBaseUrl'),
  configMock.get<string>('jobManagement.config.heartbeat.baseUrl'),
  configMock.get<number>('jobManagement.config.dequeueIntervalMs'),
  configMock.get<number>('jobManagement.config.heartbeat.intervalMs')
);

const mockTracer = trace.getTracer('testingTracer')
const mockHttpClient = new PolygonPartsManagerClient(mockLogger, mockTracer)

function jobProcessorInstace(): JobProcessor {
  return new JobProcessor(mockLogger, mockTracer, mockQueueClient, configMock);
}

function newJobHandlerInstace(): IJobHandler {
  return new NewJobHandler(mockLogger, mockHttpClient);
}

export { jobProcessorInstace, newJobHandlerInstace, mockHttpClient, mockDequeue, mockGetJob, configMock, mockQueueClient, mockProcessJob };

export type MockDequeue = jest.MockedFunction<(jobType: string, taskType: string) => Promise<ITaskResponse<unknown> | null>>;
export type MockGetJob = jest.MockedFunction<(jobId: string) => Promise<IJobResponse<unknown, unknown>>>;
export type MockProcessJob = jest.MockedFunction<() => Promise<void>>;

export interface JobProcessorTestContext {
  jobProcessor: JobProcessor;
  mockDequeue: MockDequeue;
  mockGetJob: MockGetJob;
  queueClient: QueueClient;
}
