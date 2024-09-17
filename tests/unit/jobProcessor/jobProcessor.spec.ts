import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { jobProcessor } from '../jobProcessor/jobProcessorSetup';
import { initTaskForIngestionNew } from '../mocks/tasksMocks';

describe('JobProcessor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        registerDefaultConfig();
    });

    afterEach(() => {
        jest.clearAllTimers();
        nock.cleanAll();
    });

    describe('start', () => {
        const dequeueIntervalMs = configMock.get<number>('jobManagement.config.dequeueIntervalMs');
        const jobManagerBaseUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
        const heartbeatBaseUrl = configMock.get<string>('jobManagement.config.heartbeat.baseUrl');
        const taskType = configMock.get<string>('jobManagement.taskTypeToProcess');

        it('should successfully fetch new poly parts task and process it', async () => {
            const jobType = 'Ingestion_New';
            const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;
            const heartbeatPath = `/heartbeat/${initTaskForIngestionNew.id}`

            nock(jobManagerBaseUrl)
                .post(jobManagerurlPath)
                .reply(200, initTaskForIngestionNew).persist();
            nock(heartbeatBaseUrl).post(heartbeatPath).reply(200, 'ok').persist();

            const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

            const resultPromise = jobProcessor.start();
            jest.advanceTimersByTime(dequeueIntervalMs);
            jobProcessor.stop();
            await resultPromise;


            expect(processTaskSpy).toHaveBeenCalledWith(initTaskForIngestionNew);
        });
    });
});
