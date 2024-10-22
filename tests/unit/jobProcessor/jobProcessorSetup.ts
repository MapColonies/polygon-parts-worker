import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import jsLogger from '@map-colonies/js-logger';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { IJobHandler } from '../../../src/common/interfaces';
import { NewJobHandler } from '../../../src/models/newJobHandler';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';
import { UpdateJobHandler } from '../../../src/models/updateJobHandler';
import { JobTrackerClient } from '../../../src/clients/jobTrackerClient';

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
const mockPolygonPartsClient = new PolygonPartsManagerClient(mockLogger, mockTracer);
const mockJobTrackerClient = new JobTrackerClient(mockLogger, mockTracer);

function jobProcessorInstance(): JobProcessor {
  return new JobProcessor(mockLogger, mockTracer, mockQueueClient, configMock, mockJobTrackerClient);
}

function newJobHandlerInstance(): IJobHandler {
  return new NewJobHandler(mockLogger, mockPolygonPartsClient);
}

function updateJobHandlerInstance(): IJobHandler {
  return new UpdateJobHandler(mockLogger, mockPolygonPartsClient);
}

export { jobProcessorInstance, newJobHandlerInstance, updateJobHandlerInstance, configMock, mockQueueClient, mockProcessJob, mockJobTrackerClient };

export type MockDequeue = jest.MockedFunction<(jobType: string, taskType: string) => Promise<ITaskResponse<unknown> | null>>;
export type MockGetJob = jest.MockedFunction<(jobId: string) => Promise<IJobResponse<unknown, unknown>>>;
export type MockProcessJob = jest.MockedFunction<() => Promise<void>>;

export interface JobProcessorTestContext {
  jobProcessor: JobProcessor;
  mockDequeue: MockDequeue;
  mockGetJob: MockGetJob;
  queueClient: QueueClient;
}
