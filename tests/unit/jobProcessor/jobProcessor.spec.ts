import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { newJobResponseMock, updatedJobRequest } from '../mocks/jobsMocks';
import { initTaskForIngestionNew } from '../mocks/tasksMocks';
import * as handlersFactory from '../../../src/models/handlersFactory';

const initJobHandlerMock = jest.fn();

initJobHandlerMock.mockImplementation(() => {
  return {
    processJob: async () => {
      return mockProcessJob();
    },
  };
});

jest.mock<typeof handlersFactory>('../../../src/models/handlersFactory', () => {
  return {
    initJobHandler: initJobHandlerMock,
  };
});

// eslint-disable-next-line import/first
import { jobProcessorInstance, mockProcessJob, mockQueueClient, mockJobTrackerClient } from '../jobProcessor/jobProcessorSetup';

describe('JobProcessor', () => {
  let jobProcessor: JobProcessor;

  beforeEach(() => {
    jobProcessor = jobProcessorInstance();
    jest.clearAllMocks();
    registerDefaultConfig();
  });

  afterEach(() => {
    jest.clearAllTimers();
    nock.cleanAll();
  });

  describe('start', () => {
    const jobManagerBaseUrl = configMock.get<string>('jobManagement.config.jobManagerBaseUrl');
    const jobTrackerBaseUrl = configMock.get<string>('jobManagement.config.jobTracker.baseUrl');
    const heartbeatBaseUrl = configMock.get<string>('jobManagement.config.heartbeat.baseUrl');
    const taskType = configMock.get<string>('jobDefinitions.tasks.polygonParts.type');
    const jobType = configMock.get<string>('jobDefinitions.jobs.new.type');

    it('should successfully fetch new poly parts task and process it', async () => {
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${taskType}/startPending`;
      const jobManagerUrlGetJobPath = `/jobs/${initTaskForIngestionNew.jobId}`;
      const jobManagerAckPath = `/jobs/${initTaskForIngestionNew.jobId}/tasks/${initTaskForIngestionNew.id}`;
      const jobTrackerNotifyPath = `/tasks/${initTaskForIngestionNew.id}/notify`;

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(200, initTaskForIngestionNew).persist();
      nock(jobManagerBaseUrl).get(jobManagerUrlGetJobPath).query({ shouldReturnTasks: false }).reply(200, newJobResponseMock).persist();
      nock(jobManagerBaseUrl).put(jobManagerUrlGetJobPath, JSON.stringify(updatedJobRequest)).reply(200).persist();
      nock(jobManagerBaseUrl).put(jobManagerAckPath).reply(200, 'ok').persist();
      nock(jobTrackerBaseUrl).post(jobTrackerNotifyPath).reply(200, 'ok').persist();

      const ackSpy = jest.spyOn(mockQueueClient, 'ack');
      const notifyOnFinishedTaskSpy = jest.spyOn(mockJobTrackerClient, 'notifyOnFinishedTask');

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();

      await expect(resultPromise).resolves.not.toThrow();
      expect(mockProcessJob).toHaveBeenCalledTimes(1);
      expect(ackSpy).toHaveBeenCalledTimes(1);
      expect(notifyOnFinishedTaskSpy).toHaveBeenCalledTimes(1);
      expect.assertions(4);
    });

    it('should fail to fetch task', async () => {
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(502).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      await resultPromise;

      expect(mockProcessJob).not.toHaveBeenCalled();
    });

    it('should not find task', async () => {
      const jobManagerUrlPath = `/tasks/${jobType}/${taskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerUrlPath).reply(404).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      const result = await resultPromise;

      expect(result).toBeUndefined();
    });

    it('should find task, fail processing it, reject it, and increase attempt', async () => {
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${taskType}/startPending`;
      const jobManagerUrlGetJobPath = `/jobs/${initTaskForIngestionNew.jobId}`; //jobID
      const heartbeatPath = `/heartbeat/${initTaskForIngestionNew.id}`; //taskID
      const invalidJobResponseMock = { ...newJobResponseMock, jobType: 'invalidType' };
      const errorMsg = 'failed to process job';
      initJobHandlerMock.mockImplementation(() => {
        return {
          processJob: () => {
            throw new Error(errorMsg);
          },
        };
      });

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(200, initTaskForIngestionNew).persist();
      nock(jobManagerBaseUrl).get(jobManagerUrlGetJobPath).query({ shouldReturnTasks: false }).reply(200, invalidJobResponseMock).persist();
      nock(heartbeatBaseUrl).post(heartbeatPath).reply(200, 'ok').persist();
      const rejectSpy = jest.spyOn(mockQueueClient, 'reject');

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();

      await expect(resultPromise).rejects.toThrow();
      expect(rejectSpy).toHaveBeenCalledWith(invalidJobResponseMock.id, initTaskForIngestionNew.id, true, errorMsg);
    });
  });
});
