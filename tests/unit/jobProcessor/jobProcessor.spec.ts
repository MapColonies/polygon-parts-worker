import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { jobProcessorInstace, mockProcessJob, mockQueueClient } from '../jobProcessor/jobProcessorSetup';
import { newJobResponseMock } from '../mocks/jobsMocks';
import { initTaskForIngestionNew } from '../mocks/tasksMocks';


jest.mock<typeof import("../../../src/models/handlersFactory")>('../../../src/models/handlersFactory', () => {
  return {
    initJobHandler: () => {
      return {
        processJob: async () => {
          await mockProcessJob();
        }
      }
    }
  }
})

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
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${taskType}/startPending`;
      const jobManagerUrlGetJobPath = `/jobs/${initTaskForIngestionNew.jobId}`;
      const heartbeatPath = `/heartbeat/${newJobResponseMock.id}`;

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(200, initTaskForIngestionNew).persist();
      nock(jobManagerBaseUrl).get(jobManagerUrlGetJobPath).query({ shouldReturnTasks: false }).reply(200, newJobResponseMock).persist();
      nock(heartbeatBaseUrl).post(heartbeatPath).reply(200, 'ok').persist();


      const resultPromise = jobProcessor.start();
      jobProcessor.stop();

      expect.assertions(2);
      await expect(resultPromise).resolves.not.toThrow();
      expect(mockProcessJob).toHaveBeenCalledTimes(1);
      await mockQueueClient.heartbeatClient.stop(initTaskForIngestionNew.id);

    });

    it('should fail to fetch task', async () => {
      const jobType = 'Ingestion_New';
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(502).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      await resultPromise;

      expect(mockProcessJob).not.toHaveBeenCalled();
    });

    it('should not find  task', async () => {
      const jobType = 'Ingestion_New';
      const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(404).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      const result = await resultPromise;

      expect(result).toBeUndefined();
    });
  });
});
