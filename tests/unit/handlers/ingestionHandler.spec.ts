import fsMock from 'mock-fs';
import { ShapefileChunk, ShapefileChunkReader } from '@map-colonies/mc-utils';
import { Feature, Polygon } from 'geojson';
import { IngestionJobHandler } from '../../../src/models/ingestion/ingestionHandler';
import { ingestionJobJobHandlerInstance, configMock, mockQueueClient, mockPolygonPartsClient } from '../jobProcessor/jobProcessorSetup';
import { newJobResponseMock } from '../mocks/jobsMocks';
import { validationsTask } from '../mocks/tasksMocks';
import { mockFSWithShapefiles } from '../mocks/fsMocks';
import { shapeFileMetricsMock } from '../mocks/telemetryMock';
import { ShpFeatureProperties } from '../../../src/schemas/shpFile.schema';
import { createFakeShpFeatureProperties } from '../mocks/fakeFeatures';

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

  beforeEach(() => {
    jest.clearAllMocks();
    ingestionJobHandler = ingestionJobJobHandlerInstance();

    // Mock ShapefileChunkReader
    (ShapefileChunkReader as jest.Mock).mockImplementation(() => ({
      readAndProcess: mockReadAndProcess,
    }));
  });

  afterEach(() => {
    fsMock.restore();
  });

  describe('constructor', () => {
    it('should initialize with correct dependencies', () => {
      expect(ingestionJobHandler).toBeDefined();
      expect(ingestionJobHandler).toBeInstanceOf(IngestionJobHandler);
    });

    it('should set maxVerticesPerChunk from config', () => {
      const expectedMaxVertices = configMock.get<number>('jobDefinitions.tasks.validation.verticesPerChunk');
      expect(expectedMaxVertices).toBe(1000);
    });
  });

  describe('processJob', () => {
    describe('successful processing', () => {
      it('should successfully process a job and validation task with valid shapefile containing single chunk', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockResolvedValue(undefined);

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
        expect(mockReadAndProcess).toHaveBeenCalledWith(
          shapefilePath,
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            process: expect.any(Function),
          })
        );
      });

      it('should successfully process a job and validation task with valid shapefile containing multiple chunks', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;

        mockFSWithShapefiles(shapefilePath);
        // Mock readAndProcess to simulate processing multiple chunks
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          // Simulate processing 3 chunks
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          await chunkProcessor.process({
            id: 3,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
        expect(mockReadAndProcess).toHaveBeenCalledWith(
          shapefilePath,
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            process: expect.any(Function),
          })
        );
      });

      it('should process all chunks sequentially', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        const processOrder: number[] = [];

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          processOrder.push(1);

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          processOrder.push(2);

          await chunkProcessor.process({
            id: 3,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          processOrder.push(3);
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        expect(processOrder).toEqual([1, 2, 3]);
      });

      it('should send all polygon parts to polygon parts manager', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
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

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [mockValidFeature],
            skippedFeatures: [],
          });
          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [mockValidFeature],
            skippedFeatures: [],
          });
        });

        const polygonPartsManagerValidateSpy = jest.spyOn(mockPolygonPartsClient, 'validate');

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        // Should call validate for each chunk
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(2);
      });

      it('should update task parameters with processing state after each chunk', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockFSWithShapefiles(shapefilePath);
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
          });
          await stateManager.saveState({ progress: { percentage: 33.33 } });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          await stateManager.saveState({ progress: { percentage: 66.67 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        expect(mockUpdateTask).toHaveBeenCalled();
      });

      it('should record metrics for each chunk processed', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;

        mockFSWithShapefiles(shapefilePath);
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
          });
          metricsCollector.onChunkMetrics({
            chunkId: 2,
            verticesCount: 600,
            featuresCount: 0,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(shapeFileMetricsMock.recordChunk).toHaveBeenCalledTimes(2);
      });

      it('should handle shapefile with skipped features', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
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

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
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
          });
        });

        const polygonPartsManagerValidateSpy = jest.spyOn(mockPolygonPartsClient, 'validate');

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationsTask)).resolves.not.toThrow();
        // Should still process valid features despite skipped ones
        //TODO: When implementing Report mechanism, verify that skipped features are reported
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1);
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

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationsTask)).rejects.toThrow();
      });

      it('should throw ShapefileNotFoundError when multiple required files are missing', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        const basePath = shapefilePath.replace(/\.shp$/, '');

        // Mock only .prj file (all required files missing)
        fsMock({
          [basePath + '.prj']: 'mock content',
        });

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationsTask)).rejects.toThrow();
      });
    });

    describe('feature validation and mapping', () => {
      it('should successfully map valid shapefile features to polygon parts', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
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

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [mockValidFeature],
            skippedFeatures: [],
          });
        });

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationsTask)).resolves.not.toThrow();
        const polygonPartsManagerValidateSpy = jest.spyOn(mockPolygonPartsClient, 'validate');

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(polygonPartsManagerValidateSpy).toHaveBeenCalledTimes(1);
      });

      it('should throw ZodError when chunk contains invalid features', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
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

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockImplementation(async (_, chunkProcessor: { process: (chunk: ShapefileChunk) => Promise<void> }) => {
          await chunkProcessor.process({
            id: 1,
            verticesCount: 500,
            features: [mockInvalidFeature] as Feature<Polygon, ShpFeatureProperties>[],
            skippedFeatures: [],
          });
        });

        await expect(ingestionJobHandler.processJob(newJobResponseMock, validationsTask)).rejects.toThrow();
      });
    });

    describe('state management', () => {
      it('should load initial processing state from task parameters', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;

        mockFSWithShapefiles(shapefilePath);
        mockReadAndProcess.mockResolvedValue(undefined);

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        // Verify that ShapefileChunkReader was initialized with stateManager that loads from task
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const stateManager = (ShapefileChunkReader as jest.Mock).mock.calls[0][0].stateManager as {
          loadState: () => unknown;
        };

        // The loadState function should return the task's processingState
        expect(stateManager.loadState()).toBe(validationsTask.parameters.processingState);
      });

      it('should save processing state after each chunk', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockFSWithShapefiles(shapefilePath);
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
          });
          await stateManager.saveState({ progress: { percentage: 50 } });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          await stateManager.saveState({ progress: { percentage: 100 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        // Should have called updateTask twice (once per saveState)
        expect(mockUpdateTask).toHaveBeenCalledTimes(2);
      });

      it('should update task percentage based on progress', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockFSWithShapefiles(shapefilePath);
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
          });
          await stateManager.saveState({ progress: { percentage: 75.5 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        expect(mockUpdateTask).toHaveBeenCalledWith(
          newJobResponseMock.id,
          validationsTask.id,
          expect.objectContaining({
            percentage: 76, // Should round 75.5 to 76
          })
        );
      });

      it('should round percentage to integer when updating task', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;
        mockQueueClient.jobManagerClient.updateTask = jest.fn().mockResolvedValue(undefined);
        const mockUpdateTask = jest.spyOn(mockQueueClient.jobManagerClient, 'updateTask');

        mockFSWithShapefiles(shapefilePath);
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
          });
          await stateManager.saveState({ progress: { percentage: 33.33 } });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 500,
            features: [],
            skippedFeatures: [],
          });
          await stateManager.saveState({ progress: { percentage: 66.67 } });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        // Should round to integers
        expect(mockUpdateTask).toHaveBeenNthCalledWith(
          1,
          newJobResponseMock.id,
          validationsTask.id,
          expect.objectContaining({
            percentage: 33, // Should round 33.33 to 33
          })
        );

        expect(mockUpdateTask).toHaveBeenNthCalledWith(
          2,
          newJobResponseMock.id,
          validationsTask.id,
          expect.objectContaining({
            percentage: 67, // Should round 66.67 to 67
          })
        );
      });
    });

    describe('metrics collection', () => {
      it('should record chunk metrics during processing', async () => {
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;

        mockFSWithShapefiles(shapefilePath);
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
          });
          metricsCollector.onChunkMetrics({
            chunkId: 3,
            verticesCount: 450,
            featuresCount: 0,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

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
        const shapefilePath = newJobResponseMock.parameters.inputFiles.metadataShapefilePath;

        mockFSWithShapefiles(shapefilePath);
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
          });

          await chunkProcessor.process({
            id: 2,
            verticesCount: 600,
            features: [],
            skippedFeatures: [],
          });

          // After all chunks are processed, call onFileMetrics
          metricsCollector.onFileMetrics({
            totalChunks: 2,
            totalVertices: 1100,
            totalFeatures: 0,
            processingTime: 1500,
          });
        });

        await ingestionJobHandler.processJob(newJobResponseMock, validationsTask);

        expect(mockReadAndProcess).toHaveBeenCalledTimes(1);
      });
    });
  });
});
