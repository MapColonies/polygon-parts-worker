import path from 'path';
import fsMock from 'mock-fs';
import { ShapefileChunk, ShapefileChunkReader } from '@map-colonies/mc-utils';
import { IJobResponse, ITaskResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { Feature, Polygon } from 'geojson';
import { PolygonPartsChunkValidationResult, ValidationErrorType } from '@map-colonies/raster-shared';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { ingestionJobHandlerInstance, configMock, mockQueueClient, mockPolygonPartsClient } from '../jobProcessor/jobProcessorSetup';
import { newJobResponseMock } from '../mocks/jobsMocks';
import { validationTask } from '../mocks/tasksMocks';
import { mockFSWithShapefiles } from '../mocks/fsMocks';
import { shapeFileMetricsMock } from '../mocks/telemetryMock';
import { ShpFeatureProperties } from '../../../src/schemas/shpFile.schema';
import { createFakeShpFeatureProperties } from '../mocks/fakeFeatures';
import { ValidationErrorCollector } from '../../../src/models/ingestion/validationErrorCollector';
import { StorageProvider } from '../../../src/common/constants';
import { init, setValue } from '../mocks/configMock';
import { S3Service } from '../../../src/common/storage/s3Service';
import { IngestionJobParams, ValidationTaskParameters } from '../../../src/common/interfaces';
import { CallbackClient } from '../../../src/clients/callbackClient';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('@map-colonies/mc-utils', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  ...jest.requireActual('@map-colonies/mc-utils'),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ShapefileChunkReader: jest.fn(),
}));

describe('IngestionJobHandler', () => {
  let ingestionJobHandler: IngestionJobHandler;
  const mockReadAndProcess = jest.fn();
  const mockGetShapefileStats = jest.fn();
  const ingestionSourcePath = configMock.get<string>('ingestionSourcesDirPath');
  const absoluteShapefilePath = path.join(ingestionSourcePath, newJobResponseMock.parameters.inputFiles.metadataShapefilePath);
  const jobManagerClientUpdateJobSpy = jest.spyOn(mockQueueClient.jobManagerClient, 'updateJob').mockResolvedValue(undefined);

  beforeEach(() => {
    mockFSWithShapefiles(absoluteShapefilePath);
    ingestionJobHandler = ingestionJobHandlerInstance();

    // Mock ShapefileChunkReader
    (ShapefileChunkReader as jest.Mock).mockImplementation(() => ({
      readAndProcess: mockReadAndProcess,
      getShapefileStats: mockGetShapefileStats.mockReturnValue(undefined),
    }));
  });

  afterEach(() => {
    fsMock.restore();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct dependencies', () => {
      expect(ingestionJobHandler).toBeDefined();
      expect(ingestionJobHandler).toBeInstanceOf(IngestionJobHandler);
    });

    it('should set maxChunkMaxVertices from config', () => {
      const expectedMaxVertices = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
      expect(expectedMaxVertices).toBe(ingestionJobHandler['chunkMaxVertices']);
    });
  });

  describe('processJob', () => {
    describe('successful processing', () => {
      it('should successfully process a job and validation task with valid shapefile containing single chunk', async () => {
        mockReadAndProcess.mockResolvedValue(undefined);

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);
        expect(jobManagerClientUpdateJobSpy).toHaveBeenCalledWith(newJobResponseMock.id, { status: OperationStatus.IN_PROGRESS });
        expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
        expect(mockReadAndProcess).toHaveBeenCalledWith(
          absoluteShapefilePath,
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            process: expect.any(Function),
          })
        );
      });

      it('should successfully process a job and validation task with valid shapefile containing multiple chunks', async () => {
        // Mock readAndProcess to simulate processing multiple chunks
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate processing 3 chunks
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await chunkProcessor.process({
            id: 3,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
        expect(mockReadAndProcess).toHaveBeenCalledWith(
          absoluteShapefilePath,
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            process: expect.any(Function),
          })
        );
      });

      it('should process all chunks sequentially', async () => {
        const processOrder: number[] = [];

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          processOrder.push(1);

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          processOrder.push(2);

          await chunkProcessor.process({
            id: 3,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          processOrder.push(3);
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(processOrder).toEqual([1, 2, 3]);
      });

      it('should send all polygon parts to polygon parts manager', async () => {
        const mockValidFeature: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
          properties: createFakeShpFeatureProperties(),
        };

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [mockValidFeature],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [mockValidFeature],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
        });

        const polygonPartsManagerValidateSpy = jest.spyOn(mockPolygonPartsClient, 'validate');

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        // Should call validate for each chunk
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(2);
      });

      it('should update task parameters with processing state after each chunk', async () => {
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate state manager saveState callback being called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const stateManager = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].stateManager as {
            saveState: (state: { progress?: { percentage: number } }) => Promise<void>;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 33.33 } });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 66.67 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(mockUpdateTask).toHaveBeenCalled();
      });

      it('should record metrics for each chunk processed', async () => {
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate metrics collector onChunkMetrics callback being called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const metricsCollector = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].metricsCollector as {
            onChunkMetrics: (metrics: unknown) => void;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          metricsCollector.onChunkMetrics({
            chunkId: 1,
            verticesCount: 500,
            featuresCount: 0,
          });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 600,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          metricsCollector.onChunkMetrics({
            chunkId: 2,
            verticesCount: 600,
            featuresCount: 0,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(shapeFileMetricsMock.recordChunk).toHaveBeenCalledTimes(2);
      });

      it('should handle shapefile with skipped features', async () => {
        const maxVerticesPerChunk = configMock.get<number>('jobDefinitions.tasks.validation.chunkMaxVertices');
        const mockValidFeature: Feature<Polygon> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
              ],
            ],
          },
          properties: createFakeShpFeatureProperties(),
        };

        const chunk: ShapefileChunk = {
          id: 1,
          verticesCount: 500,
          features: [mockValidFeature],
          skippedFeatures: [
            {
              properties: createFakeShpFeatureProperties(),
              type: 'Feature',
              geometry: {
                coordinates: [
                  [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                ],
                type: 'Polygon',
              },
            },
          ],
          skippedVerticesCount: 5,
        };

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process(chunk);
        });

        const polygonPartsManagerValidateSpy = jest.spyOn(mockPolygonPartsClient, 'validate');
        const addVerticesErrorsSpy = jest.spyOn(ValidationErrorCollector.prototype, 'addVerticesErrors');

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);
        expect(addVerticesErrorsSpy).toHaveBeenCalledWith(chunk.skippedFeatures, chunk.id, maxVerticesPerChunk);
        // Should still process valid features despite skipped ones
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1);
      });

      describe('error handling', () => {
        it('should throw error if critical error occurs', async () => {
          const mockError = new Error();

          mockReadAndProcess.mockRejectedValue(mockError);

          await expect(ingestionJobHandler.processJob(newJobResponseMock, validationTask)).rejects.toThrow();
        });
      });
    });

    describe('storage management', () => {
      describe('when storage provider is FS', () => {
        it('should not upload to S3', async () => {
          setValue('reportStorageProvider', StorageProvider.FS);

          mockReadAndProcess.mockResolvedValue(undefined);
          const s3ServiceUploadSpy = jest.spyOn(S3Service.prototype, 'uploadFiles');
          await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

          expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
          expect(s3ServiceUploadSpy).not.toHaveBeenCalled();
        });
      });

      describe('when storage provider is S3', () => {
        it('should upload to S3', async () => {
          // Arrange
          setValue('reportStorageProvider', StorageProvider.S3);
          init();

          ingestionJobHandler = ingestionJobHandlerInstance(); // re-instantiate to pick up new config

          mockReadAndProcess.mockResolvedValue(undefined);
          const s3ServiceUploadSpy = jest.spyOn(S3Service.prototype, 'uploadFiles').mockResolvedValue(['s3://bucket/report.rar']);
          jest
            .spyOn(ingestionJobHandler['shapefileReportWriter'], 'finalize')
            .mockResolvedValue({ fileName: 'report.rar', path: '/local/path/report.rar', fileSize: 1024 });

          // Act
          await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

          // Assert
          expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
          expect(s3ServiceUploadSpy).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('shapefile validation', () => {
      it.each([
        { extension: '.shp', description: '.shp file' },
        { extension: '.shx', description: '.shx file' },
        { extension: '.dbf', description: '.dbf file' },
        { extension: '.prj', description: '.prj file' },
        { extension: '.cpg', description: '.cpg file' },
      ])('should throw ShapefileNotFoundError when $description is missing', async ({ extension }) => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        const basePath = shapefilePath.replace(/\.shp$/, '');

        // Mock all files except the one we're testing
        const allExtensions = ['.shp', '.shx', '.dbf', '.prj', '.cpg'];
        const filesToMock = allExtensions.filter((ext) => ext !== extension);

        const mockFiles: Record<string, string> = {};
        filesToMock.forEach((ext) => {
          mockFiles[basePath + ext] = 'mock content';
        });

        fsMock(mockFiles);

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationTask)).rejects.toThrow();
      });

      it('should throw ShapefileNotFoundError when multiple required files are missing', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        const basePath = shapefilePath.replace(/\.shp$/, '');

        // Mock only .prj file (all required files missing)
        fsMock({
          [basePath + '.prj']: 'mock content',
        });

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationTask)).rejects.toThrow();
      });
    });

    describe('feature validation and mapping', () => {
      it('should successfully map valid shapefile features to polygon parts', async () => {
        const mockValidFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [34.5, 31.5],
                [34.6, 31.5],
                [34.6, 31.6],
                [34.5, 31.6],
                [34.5, 31.5],
              ],
            ],
          },
          properties: createFakeShpFeatureProperties(),
        } as unknown as Feature<Polygon, ShpFeatureProperties>;

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [mockValidFeature],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
        });

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationTask)).resolves.not.toThrow();
        const polygonPartsManagerValidateSpy = jest.spyOn(mockPolygonPartsClient, 'validate');

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1);
      });

      it('should record metadata errors when chunk contains invalid features', async () => {
        const mockInvalidFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [34.5, 31.5],
                [34.6, 31.5],
                [34.6, 31.6],
                [34.5, 31.6],
                [34.5, 31.5],
              ],
            ],
          },
          // Missing required properties
          properties: {
            id: '123',
          },
        };

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [mockInvalidFeature] as Feature<Polygon, ShpFeatureProperties>[],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
        });
        const addMetadataErrorsSpy = jest.spyOn(ValidationErrorCollector.prototype, 'addMetadataError');

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);
        expect(addMetadataErrorsSpy).toHaveBeenCalledTimes(1);
      });

      it('should record geometry errors when chunk contains features with invalid geometry', async () => {
        const featureId = '1';
        const mockInvalidGeometryFeature: Feature<Polygon, unknown> = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [0, 0],
                [0, 0],
                [0, 0],
                [0, 0],
              ],
            ],
          },
          properties: { ...createFakeShpFeatureProperties(), id: featureId },
        };

        const validationErrors: PolygonPartsChunkValidationResult = {
          parts: [{ id: featureId, errors: [ValidationErrorType.GEOMETRY_VALIDITY] }],
          smallHolesCount: 0,
        };

        const chunk: ShapefileChunk = {
          id: 1,
          verticesCount: 500,
          features: [mockInvalidGeometryFeature] as Feature<Polygon, ShpFeatureProperties>[],
          skippedFeatures: [],
          skippedVerticesCount: 0,
        };

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process(chunk);
        });
        const addGeometryErrorsSpy = jest.spyOn(ValidationErrorCollector.prototype, 'addValidationErrors');

        mockPolygonPartsClient.validate = jest.fn().mockResolvedValue(validationErrors);

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(addGeometryErrorsSpy).toHaveBeenCalledWith(validationErrors, [mockInvalidGeometryFeature], chunk.id);
      });
    });

    describe('state management', () => {
      it('should load initial processing state from task parameters', async () => {
        mockReadAndProcess.mockResolvedValue(undefined);

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        // Verify that ShapefileChunkReader was initialized with stateManager that loads from task
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const stateManager = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].stateManager as {
          loadState: () => unknown;
        };

        // The loadState function should return the task's processingState
        expect(stateManager.loadState()).toBe(validationTask.parameters.processingState);
      });

      it('should save processing state after each chunk', async () => {
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate state manager saveState callback being called after processing chunks
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const stateManager = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].stateManager as {
            saveState: (state: { progress?: { percentage: number } }) => Promise<void>;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 50 } });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 100 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(mockUpdateTask).toHaveBeenCalled();
      });

      it('should update task percentage based on progress', async () => {
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate state manager saveState callback being called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const stateManager = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].stateManager as {
            saveState: (state: { progress?: { percentage: number } }) => Promise<void>;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 75.5 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(mockUpdateTask).toHaveBeenCalledWith(
          newJobResponseMock.id,
          validationTask.id,
          expect.objectContaining({
            percentage: 76, // Should round 75.5 to 76
          })
        );
      });

      it('should round percentage to integer when updating task', async () => {
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate state manager saveState callback being called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const stateManager = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].stateManager as {
            saveState: (state: { progress?: { percentage: number } }) => Promise<void>;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 33.33 } });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          await stateManager.saveState({ progress: { percentage: 66.67 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        // Should round to integers
        expect(mockUpdateTask).toHaveBeenNthCalledWith(
          1,
          newJobResponseMock.id,
          validationTask.id,
          expect.objectContaining({
            percentage: 33, // Should round 33.33 to 33
          })
        );

        expect(mockUpdateTask).toHaveBeenNthCalledWith(
          2,
          newJobResponseMock.id,
          validationTask.id,
          expect.objectContaining({
            percentage: 67, // Should round 66.67 to 67
          })
        );
      });
    });

    describe('metrics collection', () => {
      it('should record chunk metrics during processing', async () => {
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate metrics collector onChunkMetrics callback being called
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const metricsCollector = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].metricsCollector as {
            onChunkMetrics: (metrics: { chunkId: number; verticesCount: number; featuresCount: number }) => void;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          metricsCollector.onChunkMetrics({
            chunkId: 1,
            verticesCount: 500,
            featuresCount: 0,
          });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 600,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          metricsCollector.onChunkMetrics({
            chunkId: 2,
            verticesCount: 600,
            featuresCount: 0,
          });

          await chunkProcessor.process({
            id: 3,
            verticesCount: 450,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });
          metricsCollector.onChunkMetrics({
            chunkId: 3,
            verticesCount: 450,
            featuresCount: 0,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        // Should record metrics for each chunk
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(shapeFileMetricsMock.recordChunk).toHaveBeenCalledTimes(3);

        // Verify the metrics recorded
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(shapeFileMetricsMock.recordChunk).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            chunkId: 1,
            verticesCount: 500,
            featuresCount: 0,
          })
        );

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(shapeFileMetricsMock.recordChunk).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            chunkId: 2,
            verticesCount: 600,
            featuresCount: 0,
          })
        );

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(shapeFileMetricsMock.recordChunk).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            chunkId: 3,
            verticesCount: 450,
            featuresCount: 0,
          })
        );
      });

      it('should record file metrics after processing completes', async () => {
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate metrics collector onFileMetrics callback being called after all chunks are processed
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const metricsCollector = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].metricsCollector as {
            onFileMetrics: (metrics: { totalChunks: number; totalVertices: number; totalFeatures: number; processingTime: number }) => void;
          };

          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 600,
            features: [],
            skippedFeatures: [],
            skippedVerticesCount: 0,
          });

          // After all chunks are processed, call onFileMetrics
          metricsCollector.onFileMetrics({
            totalChunks: 2,
            totalVertices: 1100,
            totalFeatures: 0,
            processingTime: 1500,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationTask);

        expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('callback handling', () => {
    it('should send success callback when job is processed successfully and callback array exist', async () => {
      const jobWithCallbacks: IJobResponse<IngestionJobParams, ValidationTaskParameters> = {
        ...newJobResponseMock,
        parameters: {
          ...newJobResponseMock.parameters,
          callbackUrls: ['http://callback.url/notify'],
        },
      };

      const sendSuccessCallbackSpy = jest.spyOn(CallbackClient.prototype, 'send');

      mockReadAndProcess.mockResolvedValue(undefined);

      await ingestionJobHandler.processJob(jobWithCallbacks, validationTask);

      expect(sendSuccessCallbackSpy).toHaveBeenCalledWith(
        jobWithCallbacks.parameters.callbackUrls,
        expect.objectContaining({
          status: OperationStatus.COMPLETED,
        })
      );
    });

    it('should send error callback when task reaches max attempts and callback array exist', async () => {
      const mockError = new Error();
      const taskMaxAttempts = configMock.get<number>('jobDefinitions.tasks.validation.maxAttempts');

      const maxAttemptsTask: ITaskResponse<ValidationTaskParameters> = {
        ...validationTask,
        attempts: taskMaxAttempts,
      };

      const jobWithCallbacks: IJobResponse<IngestionJobParams, ValidationTaskParameters> = {
        ...newJobResponseMock,
        parameters: {
          ...newJobResponseMock.parameters,
          callbackUrls: ['http://callback.url/notify'],
        },
      };

      const sendErrorCallbackSpy = jest.spyOn(CallbackClient.prototype, 'send');

      mockReadAndProcess.mockRejectedValue(mockError);

      const action = ingestionJobHandler.processJob(jobWithCallbacks, maxAttemptsTask);

      await expect(action).rejects.toThrow();
      expect(sendErrorCallbackSpy).toHaveBeenCalledWith(
        jobWithCallbacks.parameters.callbackUrls,
        expect.objectContaining({
          status: OperationStatus.FAILED,
        })
      );
    });
  });
});
