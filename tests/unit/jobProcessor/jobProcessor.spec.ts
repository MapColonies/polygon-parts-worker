import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { jobProcessorInstace, mockQueueClient } from '../jobProcessor/jobProcessorSetup';
import { initTaskForIngestionNew } from '../mocks/tasksMocks';

describe('JobProcessor', () => {
  let jobProcessor: JobProcessor;

  beforeEach(() => {
    jobProcessor = jobProcessorInstace();
    jest.clearAllMocks();
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
  });

  describe('start', () => {
    const jobManagerBaseUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
    const heartbeatBaseUrl = configMock.get<string>('jobManagement.config.heartbeat.baseUrl');
    const taskType = configMock.get<string>('jobManagement.taskTypeToProcess');

    it('should successfully fetch new poly parts task and process it', async () => {
      const jobType = 'Ingestion_New';
      const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;
      const heartbeatPath = `/heartbeat/${initTaskForIngestionNew.id}`;

      nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(200, initTaskForIngestionNew).persist();
      nock(heartbeatBaseUrl).post(heartbeatPath).reply(200, 'ok').persist();

      const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      await resultPromise;

      expect(processTaskSpy).toHaveBeenCalledWith(initTaskForIngestionNew);
      await mockQueueClient.heartbeatClient.stop(initTaskForIngestionNew.id);
    });

    it('should fail to fetch task', async () => {
      const jobType = 'Ingestion_New';
      const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(502).persist();

      const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      await resultPromise;

      expect(processTaskSpy).not.toHaveBeenCalled();
    });

    it('should not find  task', async () => {
      const jobType = 'Ingestion_New';
      const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(404).persist();

      const processTaskSpy = jest.spyOn(jobProcessor as unknown as { processTask: JobProcessor['processTask'] }, 'processTask');

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      const result = await resultPromise;

      expect(processTaskSpy).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
