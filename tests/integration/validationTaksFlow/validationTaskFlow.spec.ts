import { existsSync } from 'fs';
import nock from 'nock';
import { DependencyContainer } from 'tsyringe';
import { StatusCodes } from 'http-status-codes';
import config from 'config';
import { PolygonPartsChunkValidationResult } from '@map-colonies/raster-shared';
import { OperationStatus, TaskHandler } from '@map-colonies/mc-priority-queue';
import { ShapefileChunkReader } from '@map-colonies/mc-utils';
import { faker } from '@faker-js/faker';
import { JobProcessor } from '../../../src/models/jobProcessor';
import { getApp } from '../../../src/app';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { HANDLERS, SERVICES } from '../../../src/common/constants';
import { PolygonPartsManagerClient } from '../../../src/clients/polygonPartsManagerClient';
import { ShapefileNotFoundError } from '../../../src/common/errors';
import { JobTrackerClient } from '../../../src/clients/jobTrackerClient';
import { loggerMock, tracerMock } from '../../unit/mocks/telemetryMock';
import { createIngestionJob, createTask } from '../fixtures/testFixturesFactory';
import { HttpMockHelper } from '../mocks/httpMocks';
import { CallbackClient } from '../../../src/clients/callbackClient';
import { getActualReportErrorsCount, reportPathBuilder, setUpValidationReportsDir, tearDownValidationReportsDir } from './vlidationTaskFlow.helpers';
import { failedValidationTestCases } from './validationTaskFlow.cases';

describe('Validation Task Flow', () => {
  const reportsDirPath = config.get<string>('reportsPath');
  const maxVertices = config.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');

  let shpReader: ShapefileChunkReader;
  let testContainer: DependencyContainer;
  let taskTypesToProcess: string[];

  beforeAll(async () => {
    await setUpValidationReportsDir(reportsDirPath);
    shpReader = new ShapefileChunkReader({ maxVerticesPerChunk: maxVertices });
  });

  beforeEach(() => {
    const { container } = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: loggerMock } },
        { token: SERVICES.TRACER, provider: { useValue: tracerMock } },
        { token: SERVICES.CONFIG, provider: { useValue: config } },
      ],
    });
    testContainer = container;
    const validationTaskType = config.get<string>('jobDefinitions.tasks.validation.type');
    const polygonPartsTaskType = config.get<string>('jobDefinitions.tasks.polygonParts.type');
    taskTypesToProcess = [validationTaskType, polygonPartsTaskType];
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await tearDownValidationReportsDir(reportsDirPath);
  });

  describe('Happy Path - Successful Validation', () => {
    test.each([HANDLERS.NEW, HANDLERS.UPDATE, HANDLERS.SWAP])('should complete validation task successfully for %s handler', async (type) => {
      const job = createIngestionJob({
        shapefilePath: '/valid/137_parts_valid/ShapeMetadata.shp',
        type,
      });

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [],
        smallHolesCount: 0,
      };
      const expectedReportPath = reportPathBuilder(reportsDirPath, job.id);

      const task = createTask({ jobId: job.id });

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidate(validationResult);
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');

      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      expect(existsSync(expectedReportPath)).toBe(false); // Report file should not be created in happy path
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(8); // 8 chunks created from the shapefile
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });

    it('should complete validation task successfully for shapefile with producer data', async () => {
      const job = createIngestionJob({
        shapefilePath: '/valid/producer_shapefile/ShapeMetadata.shp',
      });

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [],
        smallHolesCount: 0,
      };
      const expectedReportPath = reportPathBuilder(reportsDirPath, job.id);

      const task = createTask({ jobId: job.id });

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidate(validationResult);
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      expect(existsSync(expectedReportPath)).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1); // Only 1 chunk created from the shapefile
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });
  });

  describe('Sad Path - Validation Failures', () => {
    test.each(failedValidationTestCases)('should create report with $description', async (testCase) => {
      const jobId = faker.string.uuid();
      const task = createTask({ jobId });
      const job = createIngestionJob({
        shapefilePath: testCase.shapefilePath,
        callbackUrls: ['http://callback-url.com/task-completed'],
        jobId,
        tasks: [task],
      });

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidate(testCase.ppManagerValidationResult);
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockCallbackClientSend(StatusCodes.OK, job.parameters.callbackUrls);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const callbackClientSendSpy = jest.spyOn(CallbackClient.prototype, 'send');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      const actualErrorsCount = await getActualReportErrorsCount({
        reader: shpReader,
        reportDirPath: reportsDirPath,
        jobId: job.id,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
      expect(actualErrorsCount).toEqual(testCase.expectedErrorsCount);
      expect(callbackClientSendSpy).toHaveBeenCalledWith(
        job.parameters.callbackUrls,
        expect.objectContaining({ jobId: job.id, taskId: task.id, status: OperationStatus.COMPLETED })
      );
    });
  });

  describe('Bad Path', () => {
    it('should fail and reject task when shapefile is missing', async () => {
      const jobId = faker.string.uuid();
      const task = createTask({ jobId });
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/not-exists/ShapeMetadata.shp',
        jobId,
        tasks: [task],
      });
      const isTaskRecoverable = false; // ShapefileNotFoundError is not recoverable

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task); // Mock for queueClient.reject() internal call
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
      const queueClientRejectSpy = jest.spyOn(TaskHandler.prototype, 'reject');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).not.toHaveBeenCalled();
      await expect(ingestionHandlerProcessJobSpy.mock.results[0].value).rejects.toThrow(ShapefileNotFoundError);
      expect(queueClientRejectSpy).toHaveBeenCalledWith(job.id, task.id, isTaskRecoverable, expect.any(String));
    });

    it('should fail and reject task when one of the shapefile files is missing', async () => {
      const jobId = faker.string.uuid();
      const task = createTask({ jobId });
      const job = createIngestionJob({
        shapefilePath: '/missing_dbf/ShapeMetadata.shp',
        jobId,
        tasks: [task],
      });
      const isTaskRecoverable = false; // ShapefileNotFoundError is not recoverable

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task); // Mock for queueClient.reject() internal call
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
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
      const jobId = faker.string.uuid();
      const task = createTask({ jobId, attempts: 5 });
      const job = createIngestionJob({
        shapefilePath: '/valid/137_parts_valid/ShapeMetadata.shp',
        jobId,
        tasks: [task],
      });
      const isTaskRecoverable = false; // ReachedMaxTaskAttemptsError is not recoverable

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task); // Mock for queueClient.reject() internal call
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
      const queueClientRejectSpy = jest.spyOn(TaskHandler.prototype, 'reject');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(polygonPartsManagerValidateSpy).not.toHaveBeenCalled();
      expect(queueClientRejectSpy).toHaveBeenCalledWith(job.id, task.id, isTaskRecoverable, expect.any(String));
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    }, 1000000);

    it('should reject task when shapefile has no features or vertices', async () => {
      const jobId = faker.string.uuid();
      const task = createTask({ jobId });
      const job = createIngestionJob({
        shapefilePath: '/fatal/empty_shapefile/ShapeMetadata.shp',
        jobId,
        tasks: [task],
      });
      const isTaskRecoverable = true; // TODO: Empty shapefile is not recoverable(later we need to set task to unrecoverable when this error is thrown)

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
      const queueClientRejectSpy = jest.spyOn(TaskHandler.prototype, 'reject');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(polygonPartsManagerValidateSpy).not.toHaveBeenCalled(); // No chunks to process = no validation calls
      await expect(ingestionHandlerProcessJobSpy.mock.results[0].value).rejects.toThrow(/no valid features or vertices/);
      expect(queueClientRejectSpy).toHaveBeenCalledWith(job.id, task.id, isTaskRecoverable, expect.any(String));
    });

    it('should send callback for unrecoverable task failure', async () => {
      const jobId = faker.string.uuid();
      const task = createTask({ jobId, attempts: 2 });
      const job = createIngestionJob({
        shapefilePath: 'tests/integration/shapeFiles/not-exists/ShapeMetadata.shp',
        callbackUrls: ['http://callback-url.com/task-completed'],
        jobId,
        tasks: [task],
      });

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task); // Mock for queueClient.reject() internal call
      HttpMockHelper.mockJobManagerRejectTask(job.id, task);
      HttpMockHelper.mockCallbackClientSend(StatusCodes.OK, job.parameters.callbackUrls);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const callbackClientSendSpy = jest.spyOn(CallbackClient.prototype, 'send');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      await expect(ingestionHandlerProcessJobSpy.mock.results[0].value).rejects.toThrow(ShapefileNotFoundError);
      expect(callbackClientSendSpy).toHaveBeenCalledWith(
        job.parameters.callbackUrls,
        expect.objectContaining({ jobId: job.id, taskId: task.id, status: OperationStatus.FAILED })
      );
    });

    it('should complete task successfully even when callback fails', async () => {
      const jobId = faker.string.uuid();
      const task = createTask({ jobId });
      const job = createIngestionJob({
        shapefilePath: '/valid/producer_shapefile/ShapeMetadata.shp',
        callbackUrls: ['http://callback-url.com/task-completed'],
        jobId,
        tasks: [task],
      });

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [],
        smallHolesCount: 0,
      };

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidate(validationResult);
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);
      HttpMockHelper.mockCallbackClientSend(StatusCodes.INTERNAL_SERVER_ERROR, job.parameters.callbackUrls);

      // Mock callback to fail with network error

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const callbackClientSendSpy = jest.spyOn(CallbackClient.prototype, 'send');
      const processor = testContainer.resolve(JobProcessor);

      // Should not throw even though callback fails
      await expect(processor.start({ runOnce: true })).resolves.not.toThrow();

      expect(callbackClientSendSpy).toHaveBeenCalledWith(
        job.parameters.callbackUrls,
        expect.objectContaining({ jobId: job.id, taskId: task.id, status: OperationStatus.COMPLETED })
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(expect.objectContaining({ ...job, expirationDate: expect.any(String) }), task);
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });
  });

  describe('Edge Cases - Recovery and Resumption', () => {
    it('should restore from last processed feature and complete remaining work', async () => {
      const jobId = faker.string.uuid();
      const filePath = '/valid/137_parts_valid/ShapeMetadata.shp';

      const task = createTask({
        jobId,
        processingState: { lastProcessedChunkIndex: 18, lastProcessedFeatureIndex: 135, filePath, timestamp: new Date() },
      });

      const job = createIngestionJob({
        shapefilePath: filePath,
        jobId,
        tasks: [task],
      });

      const validationResult: PolygonPartsChunkValidationResult = {
        parts: [],
        smallHolesCount: 0,
      };

      HttpMockHelper.mockJobManagerUpdateJob(job.id, { status: OperationStatus.IN_PROGRESS });
      HttpMockHelper.mockJobManagerSearchTasks(job.type, taskTypesToProcess, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job);
      HttpMockHelper.mockPolygonPartsValidate(validationResult);
      HttpMockHelper.mockJobManagerUpdateTask(job.id, task.id);
      HttpMockHelper.mockJobTrackerFinishTask(task.id);
      HttpMockHelper.mockJobManagerGetTaskById(job.id, task.id, task);
      HttpMockHelper.mockJobManagerGetJob(job.id, job, true);

      const ingestionHandlerProcessJobSpy = jest.spyOn(IngestionJobHandler.prototype, 'processJob');
      const polygonPartsManagerValidateSpy = jest.spyOn(PolygonPartsManagerClient.prototype, 'validate');
      const jobTrackerNotifySpy = jest.spyOn(JobTrackerClient.prototype, 'notifyOnFinishedTask');
      const processor = testContainer.resolve(JobProcessor);

      await processor.start({ runOnce: true });

      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(ingestionHandlerProcessJobSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ...job,
          expirationDate: expect.any(String),
          tasks: [
            expect.objectContaining({
              ...task,
              parameters: expect.objectContaining({
                ...task.parameters,
                processingState: expect.objectContaining({
                  ...task.parameters.processingState,
                  timestamp: expect.any(String),
                }),
              }),
            }),
          ],
        }),
        expect.objectContaining({
          ...task,
          parameters: expect.objectContaining({
            ...task.parameters,
            processingState: expect.objectContaining({
              ...task.parameters.processingState,
              timestamp: expect.any(String),
            }),
          }),
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment

      expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1); // Should process only the the last feature remaining (final chunk)
      expect(jobTrackerNotifySpy).toHaveBeenCalledWith(task.id);
    });
  });
});
