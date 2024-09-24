import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import jsLogger from '@map-colonies/js-logger';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';

const mockLogger = jsLogger({ enabled: false });

const mockDequeue = jest.fn() as MockDequeue;
const mockGetJob = jest.fn() as MockGetJob;

registerDefaultConfig();
const mockQueueClient = new QueueClient(
  mockLogger,
  configMock.get<string>('jobManagement.config.jobManagerBaseUrl'),
  configMock.get<string>('jobManagement.config.heartbeat.baseUrl'),
  configMock.get<number>('jobManagement.config.dequeueIntervalMs'),
  configMock.get<number>('jobManagement.config.heartbeat.intervalMs')
);

const mockPolyPartsManagerClient = new PolygonPartsManagerClient(mockLogger, trace.getTracer('testingTracer'));

function jobProcessorInstace(): JobProcessor {
  return new JobProcessor(mockLogger, trace.getTracer('testingTracer'), mockQueueClient, configMock, mockPolyPartsManagerClient);
}

export { jobProcessorInstace, mockDequeue, mockGetJob, configMock, mockQueueClient };

export type MockDequeue = jest.MockedFunction<(jobType: string, taskType: string) => Promise<ITaskResponse<unknown> | null>>;
export type MockGetJob = jest.MockedFunction<(jobId: string) => Promise<IJobResponse<unknown, unknown>>>;

export interface JobProcessorTestContext {
  jobProcessor: JobProcessor;
  mockDequeue: MockDequeue;
  mockGetJob: MockGetJob;
  queueClient: QueueClient;
}
