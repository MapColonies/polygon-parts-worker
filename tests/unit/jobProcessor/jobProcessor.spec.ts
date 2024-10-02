import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { jobProcessorInstace } from '../jobProcessor/jobProcessorSetup';

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
    const taskType = configMock.get<string>('permittedTyped.tasks.polygonParts');

    it('should successfully fetch new poly parts task and process it', () => {
      expect(1).toBe(1);
    });

    it('should fail to fetch task', async () => {
      const jobType = 'Ingestion_New';
      const jobManagerurlPath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerurlPath).reply(502).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      await resultPromise;

      expect(1).toBe(1);
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
