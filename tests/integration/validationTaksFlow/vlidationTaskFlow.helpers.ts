import path from 'path';
import { mkdir, readdir, rm } from 'fs/promises';
import admZip from 'adm-zip';
import { Feature } from 'geojson';
import {} from '../../../src/common/constants';
import { ChunkProcessor, ShapefileChunk, ShapefileChunkReader } from '@map-colonies/mc-utils';
import { SHAPEFILE_REPORT_FILE_NAME, VALIDATION_ERROR_TYPE_FORMATS } from '../../../src/models/ingestion/constants';
import { ErrorsCount } from '../../../src/models/ingestion/types';

interface GetActualReportErrorsCountParams {
  reader: ShapefileChunkReader;
  reportDirPath: string;
  jobId: string;
}

const validationErrorColumns = Object.values(VALIDATION_ERROR_TYPE_FORMATS).map((format) => format.columnName);

const COLUMN_NAME_TO_COUNT_KEY: Record<string, keyof ErrorsCount> = Object.fromEntries(
  Object.values(VALIDATION_ERROR_TYPE_FORMATS).map(({ columnName, countKey }) => [columnName, countKey])
);

const getReportFeatureCollection = async (reader: ShapefileChunkReader, reportPath: string): Promise<Feature[]> => {
  const features: Feature[] = [];
  const processor: ChunkProcessor = {
    // eslint-disable-next-line @typescript-eslint/require-await
    process: async (chunk: ShapefileChunk): Promise<void> => {
      features.push(...chunk.features, ...chunk.skippedFeatures);
    },
  };
  await reader.readAndProcess(reportPath, processor);

  return features;
};

const findAndUnzipReport = async (reportDirPath: string, jobId: string): Promise<string> => {
  const reportPath = reportPathBuilder(reportDirPath, jobId);
  const files = await readdir(reportPath);
  const zipFile = files.find((file) => file.endsWith('.zip'));

  if (zipFile === undefined) {
    throw new Error(`No zip file found in ${reportPath}`);
  }

  const zipPath = path.join(reportPath, zipFile);

  const zip = new admZip(zipPath);

  zip.extractAllTo(reportPath, true);

  const shpPath = path.join(reportPath, SHAPEFILE_REPORT_FILE_NAME);
  return shpPath;
};

const countErrorsInReport = (features: Feature[]): ErrorsCount => {
  const errorsCount: ErrorsCount = {
    vertices: 0,
    metadata: 0,
    geometryValidity: 0,
    resolution: 0,
    smallGeometries: 0,
    smallHoles: 0,
    unknown: 0,
  };

  for (const feature of features) {
    const properties = feature.properties as Record<string, unknown>;
    for (const key of validationErrorColumns) {
      const columnExist = key in properties;
      if (!columnExist) {
        continue;
      }
      const value = properties[key];
      if (value === null || value === undefined) {
        continue;
      }
      const countKey = COLUMN_NAME_TO_COUNT_KEY[key];
      errorsCount[countKey] += 1;
    }
  }

  return errorsCount;
};

export const reportPathBuilder = (baseDir: string, jobId: string): string => {
  return path.join(baseDir, jobId);
};

export const getActualReportErrorsCount = async ({ reader, reportDirPath, jobId }: GetActualReportErrorsCountParams): Promise<ErrorsCount> => {
  const reportPath = await findAndUnzipReport(reportDirPath, jobId);
  const features = await getReportFeatureCollection(reader, reportPath);
  const actualErrorsCount = countErrorsInReport(features);
  return actualErrorsCount;
};

export const setUpValidationReportsDir = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, { recursive: true });
};

export const tearDownValidationReportsDir = async (dirPath: string): Promise<void> => {
  await rm(dirPath, { recursive: true, force: true });
};
