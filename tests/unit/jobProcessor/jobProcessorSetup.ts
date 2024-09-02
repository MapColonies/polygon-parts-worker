import { IJobResponse, ITaskResponse } from '@map-colonies/mc-priority-queue';
import jsLogger from '@map-colonies/js-logger';
import { TaskHandler as QueueClient } from '@map-colonies/mc-priority-queue';
import { trace } from '@opentelemetry/api';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock } from '../mocks/configMock';

const mockLogger = jsLogger({ enabled: false });

const mockDequeue = jest.fn() as MockDequeue;
const mockGetJob = jest.fn() as MockGetJob;

const mockQueueClient = {
    dequeue: mockDequeue,
    jobManagerClient: {
        getJob: mockGetJob,
    },
} as unknown as jest.Mocked<QueueClient>;

const jobProcessor = new JobProcessor(mockLogger, trace.getTracer('testingTracer'), queueClient, configMock);
export {
    jobProcessor,
    mockDequeue,
    mockGetJob,
    configMock,
    mockQueueClient,
};

export type MockDequeue = jest.MockedFunction<(jobType: string, taskType: string) => Promise<ITaskResponse<unknown> | null>>;
export type MockGetJob = jest.MockedFunction<(jobId: string) => Promise<IJobResponse<unknown, unknown>>>;

export interface JobProcessorTestContext {
    jobProcessor: JobProcessor;
    mockDequeue: MockDequeue;
    mockGetJob: MockGetJob;
    queueClient: QueueClient;
}