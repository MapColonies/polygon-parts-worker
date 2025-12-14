import path from 'path';
import * as fsAsync from 'fs/promises';
import fs from 'fs';
import { faker } from '@faker-js/faker';
import { IJobResponse } from '@map-colonies/mc-priority-queue';
import { ValidationAggregatedErrors } from '@map-colonies/raster-shared';
import ogr2ogr from 'ogr2ogr';
import { OgrFormat } from '../../../../src/common/constants';
import { ShapefileReportWriter } from '../../../../src/models/ingestion/shapefileReportWriter';
import { newJobResponseMock } from '../../mocks/jobsMocks';
import { validationTask } from '../../mocks/tasksMocks';
import { IngestionJobParams, ValidationTaskParameters } from '../../../../src/common/interfaces';
import { ShapefileFinalizationParams } from '../../../../src/models/ingestion/types';
import { loggerMock } from '../../mocks/telemetryMock';
import { configMock, registerDefaultConfig } from '../../mocks/configMock';
import { createFakeErrorsSummary, createFakeFeaturesWithErrors } from './shapefileReportWriter.data';
import { writeChunkTestCases } from './shapefileReportWriter.cases';

jest.mock('ogr2ogr');
jest.mock('fs/promises');

describe('ShapefileReportWriter', () => {
  let writer: ShapefileReportWriter;

  beforeEach(() => {
    jest.clearAllMocks();
    registerDefaultConfig();
    writer = new ShapefileReportWriter(loggerMock, configMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('writeChunk', () => {
    it.each(writeChunkTestCases)('should $description', async ({ chunkId, featureCount, fileExists, expectedOptions }) => {
      // Arrange
      const features = createFakeFeaturesWithErrors(featureCount);
      const jobId = faker.string.uuid();
      const reportsPath = configMock.get<string>('jobDefinitions.tasks.validation.reportsPath');
      const expectedOutputPath = path.join(reportsPath, jobId);
      const expectedShpPath = `${expectedOutputPath}/report.shp`;

      if (fileExists) {
        (fsAsync.access as jest.Mock).mockResolvedValue(undefined);
      } else {
        (fsAsync.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      }

      const mockOgr2ogrResult = { cmd: 'ogr2ogr command' };
      (ogr2ogr as unknown as jest.Mock).mockResolvedValue(mockOgr2ogrResult);

      // Act
      await writer.writeChunk(features, jobId, chunkId);

      // Assert
      expect(fsAsync.access).toHaveBeenCalledWith(expectedShpPath);
      expect(ogr2ogr).toHaveBeenCalledTimes(1);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const ogr2ogrCall = (ogr2ogr as unknown as jest.Mock).mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const [geojson, options] = ogr2ogrCall;

      expect(geojson).toEqual({
        type: 'FeatureCollection',
        features,
      });

      expect(options).toEqual({
        format: OgrFormat.ESRI_SHAPEFILE,
        destination: expectedOutputPath,
        options: expectedOptions,
      });
    });

    it('should throw error when ogr2ogr fails', async () => {
      // Arrange
      const features = createFakeFeaturesWithErrors(2);
      const jobId = faker.string.uuid();
      const chunkId = 1;
      const expectedError = new Error('ogr2ogr conversion failed');

      (fsAsync.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      (ogr2ogr as unknown as jest.Mock).mockRejectedValue(expectedError);

      // Act
      const action = writer.writeChunk(features, jobId, chunkId);

      // Assert
      await expect(action).rejects.toThrow(expectedError);
    });
  });

  describe('finalize', () => {
    it('should return null when no shapefile exists', async () => {
      // Arrange
      const jobId = faker.string.uuid();
      const params: ShapefileFinalizationParams = {
        job: { id: jobId } as IJobResponse<IngestionJobParams, ValidationTaskParameters>,
        taskId: faker.string.uuid(),
        errorSummary: {} as ValidationAggregatedErrors,
        hasCriticalErrors: false,
      };

      const reportsPath = configMock.get<string>('jobDefinitions.tasks.validation.reportsPath');
      const expectedOutputPath = path.join(reportsPath, jobId);
      const expectedShpPath = `${expectedOutputPath}/report.shp`;

      (fsAsync.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Act
      const result = await writer.finalize(params);

      // Assert
      expect(result).toBeNull();
      expect(fsAsync.access).toHaveBeenCalledWith(expectedShpPath);
    });

    it('should return null when shapefile exists but no critical errors', async () => {
      // Arrange
      const jobId = faker.string.uuid();
      const params: ShapefileFinalizationParams = {
        job: { id: jobId } as IJobResponse<IngestionJobParams, ValidationTaskParameters>,
        taskId: faker.string.uuid(),
        errorSummary: {} as ValidationAggregatedErrors,
        hasCriticalErrors: false,
      };

      const reportsPath = configMock.get<string>('jobDefinitions.tasks.validation.reportsPath');
      const expectedOutputPath = path.join(reportsPath, jobId);
      const expectedShpPath = `${expectedOutputPath}/report.shp`;

      // Shapefile exists
      (fsAsync.access as jest.Mock).mockResolvedValue(undefined);
      (fsAsync.unlink as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await writer.finalize(params);

      // Assert
      expect(result).toBeNull();
      expect(fsAsync.access).toHaveBeenCalledWith(expectedShpPath);

      // Verify cleanup was called for all shapefile components
      expect(fsAsync.unlink).toHaveBeenCalled();
      const unlinkCalls = (fsAsync.unlink as jest.Mock).mock.calls;
      expect(unlinkCalls.length).toBeGreaterThan(0);
    });

    it('should create zipped report when critical errors exist', async () => {
      // Arrange
      const jobId = newJobResponseMock.id;
      const taskId = validationTask.id;

      const errorSummary: ValidationAggregatedErrors = createFakeErrorsSummary();

      const params: ShapefileFinalizationParams = {
        job: newJobResponseMock,
        taskId,
        errorSummary,
        hasCriticalErrors: true,
      };

      const reportsPath = configMock.get<string>('jobDefinitions.tasks.validation.reportsPath');
      const expectedOutputPath = path.join(reportsPath, jobId);
      const expectedShpPath = `${expectedOutputPath}/report.shp`;
      const expectedQmdPath = path.join(expectedOutputPath, 'report.qmd');

      // Shapefile exists
      (fsAsync.access as jest.Mock).mockResolvedValue(undefined);
      (fsAsync.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fsAsync.unlink as jest.Mock).mockResolvedValue(undefined);

      const mockWriteStream = {
        on: jest.fn().mockImplementation(function (this: unknown, event: string, callback: () => void) {
          if (event === 'close') {
            callback();
          }
          return mockWriteStream;
        }),
        end: jest.fn(),
      };

      jest.spyOn(fs, 'createWriteStream').mockReturnValue(mockWriteStream as unknown as fs.WriteStream);

      // Act
      const result = await writer.finalize(params);

      // Assert

      // Verify shapefile exists check
      expect(fsAsync.access).toHaveBeenCalledWith(expectedShpPath);

      // Verify QMD file was created with correct content
      expect(fsAsync.writeFile).toHaveBeenCalledWith(expectedQmdPath, expect.any(String), 'utf-8');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const qmdContent = (fsAsync.writeFile as jest.Mock).mock.calls[0][1] as string;
      expect(qmdContent).toContain(`<identifier>${taskId}</identifier>`);
      expect(qmdContent).toContain(`<parentidentifier>${jobId}</parentidentifier>`);
      expect(qmdContent).toContain('<type>Ingestion_New</type>');

      // Verify cleanup was called
      expect(fsAsync.unlink).toHaveBeenCalled();

      // Verify result
      expect(result).not.toBeNull();
      expect(result?.fileName).toContain('_report_');
      expect(result?.fileName).toContain('.zip');
      expect(result?.path).toContain(jobId);
    });

    it('should throw error when finalization fails', async () => {
      // Arrange
      const jobId = newJobResponseMock.id;
      const params: ShapefileFinalizationParams = {
        job: newJobResponseMock,
        taskId: validationTask.id,
        errorSummary: createFakeErrorsSummary(),
        hasCriticalErrors: true,
      };

      const reportsPath = configMock.get<string>('jobDefinitions.tasks.validation.reportsPath');
      const expectedOutputPath = path.join(reportsPath, jobId);
      const expectedShpPath = `${expectedOutputPath}/report.shp`;

      // Shapefile exists
      (fsAsync.access as jest.Mock).mockResolvedValue(undefined);

      // Mock writeFile to fail when creating QMD
      const expectedError = new Error('Failed to write QMD file');
      (fsAsync.writeFile as jest.Mock).mockRejectedValue(expectedError);

      // Act
      const action = writer.finalize(params);

      // Assert
      await expect(action).rejects.toThrow(expectedError);
      expect(fsAsync.access).toHaveBeenCalledWith(expectedShpPath);
      expect(fsAsync.writeFile).toHaveBeenCalled();
    });
  });
});
