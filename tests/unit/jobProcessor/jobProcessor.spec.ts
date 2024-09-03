import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { jobProcessor, mockDequeue, mockQueueClient } from '../jobProcessor/jobProcessorSetup';
import { initTaskForIngestionNew } from '../mocks/tasksMocks';

describe('JobProcessor', () => {
    // beforeAll(() => {
    //     jest.useFakeTimers();
    //   });

    //   afterAll(() => {
    //     jest.useRealTimers();
    //   });

    beforeEach(() => {
        jest.clearAllMocks();
        registerDefaultConfig();
    });

    //   afterEach(() => {
    //     jest.clearAllTimers();
    //     nock.cleanAll();
    //   });

    describe('start', () => {
        it('should successfully fetch new poly parts task and process it', async () => {
            const jobManagerBaseUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
            const heartbeatBaseUrl = configMock.get<string>('jobManagement.config.heartbeat.baseUrl');
            const taskType = configMock.get<string>('jobManagement.taskTypeToProcess');
            const jobType = 'Ingestion_New';
            const urlPath = `/tasks/${jobType}/${taskType}/startPending`;

            nock(jobManagerBaseUrl)
                .post(urlPath,
                    {})
                .reply(200, initTaskForIngestionNew);
            nock(heartbeatBaseUrl).post(`/heartbeat/${initTaskForIngestionNew.id}`).reply(200, 'ok').persist();

            const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

            const result = await jobProcessor.start();

            expect(processTaskSpy).toHaveBeenCalledWith(result);
        }, 41561651);
    });
});
