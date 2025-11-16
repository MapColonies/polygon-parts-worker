import nock from 'nock';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { configMock, registerDefaultConfig } from '../mocks/configMock';
import { failTaskRequest, newJobResponseMock, updatedJobRequest } from '../mocks/jobsMocks';
import { initTaskForIngestionNew, reachedMaxAttemptsTask } from '../mocks/tasksMocks';
import * as handlerFactory from '../../../src/models/handlerFactory';

const initJobHandlerMock = jest.fn();

initJobHandlerMock.mockImplementation(() => {
  return {
    processJob: async () => {
      return mockProcessJob();
    },
  };
});

jest.mock<typeof handlerFactory>('../../../src/models/handlerFactory', () => {
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
    const validationTaskType = configMock.get<string>('jobDefinitions.tasks.validation.type');
    const polygonPartsTaskType = configMock.get<string>('jobDefinitions.tasks.polygonParts.type');
    const jobType = configMock.get<string>('jobDefinitions.jobs.new.type');

    it('should successfully fetch new validation task and process it', async () => {
      const jobManagerUrlValidationDequeuePath = `/tasks/${jobType}/${validationTaskType}/startPending`;
      const jobManagerUrlPolygonPartsDequeuePath = `/tasks/${jobType}/${polygonPartsTaskType}/startPending`;
      const jobManagerUrlGetJobPath = `/jobs/${initTaskForIngestionNew.jobId}`;
      const jobManagerAckPath = `/jobs/${initTaskForIngestionNew.jobId}/tasks/${initTaskForIngestionNew.id}`;
      const jobTrackerNotifyPath = `/tasks/${initTaskForIngestionNew.id}/notify`;

      nock(jobManagerBaseUrl).post(jobManagerUrlValidationDequeuePath).reply(200, initTaskForIngestionNew).persist();
      nock(jobManagerBaseUrl).post(jobManagerUrlPolygonPartsDequeuePath).reply(200, undefined).persist();
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

    it('should fail when  task reached max attempts', async () => {
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${validationTaskType}/startPending`;
      const jobManagerUrlPolygonPartsDequeuePath = `/tasks/${jobType}/${polygonPartsTaskType}/startPending`;
      const jobManagerUrlGetJobPath = `/jobs/${reachedMaxAttemptsTask.jobId}`;
      const jobManagerGetTaskPath = `/jobs/${reachedMaxAttemptsTask.jobId}/tasks/${reachedMaxAttemptsTask.id}`;
      const jobManagerRejectPath = `/jobs/${reachedMaxAttemptsTask.jobId}/tasks/${reachedMaxAttemptsTask.id}`;
      const jobTrackerNotifyPath = `/tasks/${reachedMaxAttemptsTask.id}/notify`;

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(200, reachedMaxAttemptsTask).persist();
      nock(jobManagerBaseUrl).post(jobManagerUrlPolygonPartsDequeuePath).reply(200, undefined).persist();
      nock(jobManagerBaseUrl).get(jobManagerUrlGetJobPath).query({ shouldReturnTasks: false }).reply(200, newJobResponseMock).persist();
      nock(jobManagerBaseUrl).get(jobManagerGetTaskPath).reply(200, reachedMaxAttemptsTask).persist();
      nock(jobManagerBaseUrl).put(jobManagerRejectPath, failTaskRequest).reply(200).persist();
      nock(jobTrackerBaseUrl).post(jobTrackerNotifyPath).reply(200, 'ok').persist();

      const ackSpy = jest.spyOn(mockQueueClient, 'ack');
      const rejectSpy = jest.spyOn(mockQueueClient, 'reject');
      const notifyOnFinishedTaskSpy = jest.spyOn(mockJobTrackerClient, 'notifyOnFinishedTask');

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();

      await expect(resultPromise).resolves.not.toThrow();
      expect(mockProcessJob).toHaveBeenCalledTimes(0);
      expect(ackSpy).toHaveBeenCalledTimes(0);
      expect(rejectSpy).toHaveBeenCalledWith(reachedMaxAttemptsTask.jobId, reachedMaxAttemptsTask.id, false);
      expect(rejectSpy).toHaveBeenCalledTimes(1);
      expect(notifyOnFinishedTaskSpy).toHaveBeenCalledTimes(1);
      expect.assertions(6);
    });
    it('should fail to fetch task', async () => {
      const jobManagerUrlDequeuePath = `/tasks/${jobType}/${validationTaskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerUrlDequeuePath).reply(502).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      await resultPromise;

      expect(mockProcessJob).not.toHaveBeenCalled();
    });

    it('should not find task', async () => {
      const jobManagerUrlPath = `/tasks/${jobType}/${validationTaskType}/startPending`;

      nock(jobManagerBaseUrl).post(jobManagerUrlPath).reply(404).persist();

      const resultPromise = jobProcessor.start();
      jobProcessor.stop();
      const result = await resultPromise;

      expect(result).toBeUndefined();
    });

    it('should find task, fail processing it, reject it, and increase attempt', async () => {
      const jobManagerUrlValidationDequeuePath = `/tasks/${jobType}/${validationTaskType}/startPending`;
      const jobManagerUrlPolygonPartsDequeuePath = `/tasks/${jobType}/${polygonPartsTaskType}/startPending`;
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

      nock(jobManagerBaseUrl).post(jobManagerUrlValidationDequeuePath).reply(200, initTaskForIngestionNew).persist();
      nock(jobManagerBaseUrl).post(jobManagerUrlPolygonPartsDequeuePath).reply(200, undefined).persist();
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
