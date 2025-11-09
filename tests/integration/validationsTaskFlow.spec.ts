import nock from 'nock';
import { DependencyContainer } from 'tsyringe';
import { TaskHandler } from '@map-colonies/mc-priority-queue';
import { ZodError } from 'zod';
import { JobProcessor } from '../../src/models/jobProcessor';
import { getApp } from '../../src/app';
import { configMock, init, registerDefaultConfig } from '../unit/mocks/configMock';
import { IngestionJobHandler } from '../../src/models/ingestion/ingestionHandler';
import { HANDLERS, SERVICES } from '../../src/common/constants';
import { PolygonPartsManagerClient } from '../../src/clients/polygonPartsManagerClient';
import { ShapefileNotFoundError } from '../../src/common/errors';
import { JobTrackerClient } from '../../src/clients/jobTrackerClient';
import { loggerMock, tracerMock } from '../unit/mocks/telemetryMock';
import { createIngestionJob, createTask } from './fixtures/testFixturesFactory';
import { HttpMockHelper } from './mocks/httpMocks';

describe('Validations Task Flow', () => {
  let testContainer: DependencyContainer;

  beforeAll(() => {
    init();
    registerDefaultConfig();
  });

  beforeEach(() => {
    const { container } = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: loggerMock } },
        { token: SERVICES.TRACER, provider: { useValue: tracerMock } },
        { token: SERVICES.CONFIG, provider: { useValue: configMock } },
      ],
    });
    testContainer = container;
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('Happy Path - Successful Validations', () => {
    test.each([HANDLERS.NEW, HANDLERS.UPDATE, HANDLERS.SWAP])('should complete validation task successfully for %s handler', async (type) => {
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/israel_137_parts_valid/ShapeMetadata.shp',
        type,
      });
      const task = createTask({ jobId: job.id });

      HttpMockHelper.mockJobManagerSearchTask(job.type, task.type, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidateSuccess();
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validatePolygonParts');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(20); // 20 chunks created from the shapefile
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });
  });

  describe('Sad Path - Validation Failures', () => {
    it('should reject task when shapefile contains invalid feature (invalid publish resolution)', async () => {
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/invalid_publish_res_shapefile/ShapeMetadata.shp',
      });
      const task = createTask({ jobId: job.id });

      HttpMockHelper.mockJobManagerSearchTask(job.type, task.type, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidateSuccess();
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      await expect(ingestionHandlerProcessJobSpy.mock.results[0].value).rejects.toThrow(ZodError);
      expect(jobTrackerNotifySpy).not.toHaveBeenCalled();
    });
  });

  describe('Bad Path', () => {
    it('should fail and reject task when shapefile is missing', async () => {
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/not-exists/ShapeMetadata.shp',
      });
      const task = createTask({ jobId: job.id });
      const isTaskRecoverable = false; // ShapefileNotFoundError is not recoverable

      HttpMockHelper.mockJobManagerSearchTask(job.type, task.type, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task); // Mock for queueClient.reject() internal call
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validatePolygonParts');
      const queueClientRejectSpy = jest.spyOn(TaskHandler.prototype, 'reject');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).not.toHaveBeenCalled();
      await expect(ingestionHandlerProcessJobSpy.mock.results[0].value).rejects.toThrow(ShapefileNotFoundError);
      expect(queueClientRejectSpy).toHaveBeenCalledWith(job.id, task.id, isTaskRecoverable, expect.any(String));
    });

    it('should reject task when max attempts are reached', async () => {
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/israel_137_parts_valid/ShapeMetadata.shp',
      });
      const task = createTask({ jobId: job.id, attempts: 5 });
      const isTaskRecoverable = false; // ReachedMaxTaskAttemptsError is not recoverable

      HttpMockHelper.mockJobManagerSearchTask(job.type, task.type, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task); // Mock for queueClient.reject() internal call
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);

      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validatePolygonParts');
      const queueClientRejectSpy = jest.spyOn(TaskHandler.prototype, 'reject');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(polygonPartsManagerValidateSpy).not.toHaveBeenCalled();
      expect(queueClientRejectSpy).toHaveBeenCalledWith(job.id, task.id, isTaskRecoverable);
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });

    it('should reject task when shapefile has no features or vertices', async () => {
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/empty_shapefile/ShapeMetadata.shp',
      });
      const task = createTask({ jobId: job.id });
      const isTaskRecoverable = true; // TODO: Empty shapefile is not recoverable(later we need to set task to unrecoverable when this error is thrown)

      HttpMockHelper.mockJobManagerSearchTask(job.type, task.type, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validatePolygonParts');
      const queueClientRejectSpy = jest.spyOn(TaskHandler.prototype, 'reject');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).not.toHaveBeenCalled(); // No chunks to process = no validation calls
      await expect(ingestionHandlerProcessJobSpy.mock.results[0].value).rejects.toThrow(/no valid features or vertices/);
      expect(queueClientRejectSpy).toHaveBeenCalledWith(job.id, task.id, isTaskRecoverable, expect.any(String));
    });
  });

  describe('Edge Cases - Recovery and Resumption', () => {
    it('should restore from last processed feature and complete remaining work', async () => {
      const filePath = 'tests/integration/shapeFiles/israel_137_parts_valid/ShapeMetadata.shp';
      const job = createIngestionJob({
        shapefilePath: filePath,
      });
      const task = createTask({
        jobId: job.id,
        processingState: { lastProcessedChunkIndex: 18, lastProcessedFeatureIndex: 135, filePath, timestamp: new Date() },
      });

      HttpMockHelper.mockJobManagerSearchTask(job.type, task.type, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidateSuccess();
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validatePolygonParts');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), {
        ...task,
        parameters: { ...task.parameters, processingState: { ...task.parameters.processingState, timestamp: expect.any(String) } },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment

      expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1); // Should process only the the last feature remaining (final chunk)
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });
  });
});
