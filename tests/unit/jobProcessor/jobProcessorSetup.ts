import jsLogger from '@map-colonies/js-logger';
import { PolygonPartsEntityName } from '@map-colonies/mc-model-types';
import { IJobResponse, ITaskResponse, TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobTrackerClient } from '../../../src/clients/jobTrackerClient';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { NewJobHandler } from '../../../src/models/newJobHandler';
import { UpdateJobHandler } from '../../../src/models/updateJobHandler';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { polygonPartsEntity } from '../mocks/jobProcessorResponseMock';

const mockLogger = jsLogger({ enabled: false });

const mockProcessJob = (jest.fn() as MockProcessJob).mockResolvedValue(polygonPartsEntity);

registerDefaultConfig();
const mockQueueClient = new QueueClient(
  mockLogger,
  configMock.get<string>('jobManagement.config.jobManagerBaseUrl'),
  configMock.get<string>('jobManagement.config.heartbeat.baseUrl'),
  configMock.get<number>('jobManagement.config.dequeueIntervalMs'),
  configMock.get<number>('jobManagement.config.heartbeat.intervalMs')
);

const mockTracer = trace.getTracer('testingTracer');
const mockPolygonPartsClient = new PolygonPartsManagerClient(mockLogger, configMock, mockTracer);
const mockJobTrackerClient = new JobTrackerClient(mockLogger, configMock, mockTracer);

function jobProcessorInstance(): JobProcessor {
  return new JobProcessor(mockLogger, mockTracer, mockQueueClient, configMock, mockJobTrackerClient);
}

function newJobHandlerInstance(): NewJobHandler {
  return new NewJobHandler(mockLogger, mockQueueClient, mockPolygonPartsClient);
}

function updateJobHandlerInstance(): UpdateJobHandler {
  return new UpdateJobHandler(mockLogger, mockQueueClient, mockPolygonPartsClient);
}

export { configMock, jobProcessorInstance, mockJobTrackerClient, mockProcessJob, mockQueueClient, newJobHandlerInstance, updateJobHandlerInstance };

export type MockDequeue = jest.MockedFunction<(jobType: string, taskType: string) => Promise<ITaskResponse<unknown> | null>>;
export type MockGetJob = jest.MockedFunction<(jobId: string) => Promise<IJobResponse<unknown, unknown>>>;
export type MockProcessJob = jest.MockedFunction<() => Promise<PolygonPartsEntityName>>;

export interface JobProcessorTestContext {
  jobProcessor: JobProcessor;
  mockDequeue: MockDequeue;
  mockGetJob: MockGetJob;
  queueClient: QueueClient;
}
