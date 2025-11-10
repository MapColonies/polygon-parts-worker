/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ProductType } from '@map-colonies/mc-model-types';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { ExportJobParameters, RASTER_DOMAIN } from '@map-colonies/raster-shared';
import { IngestionJobParams } from '../../../src/common/interfaces';

const newJobResponseMock: IJobResponse<IngestionJobParams, unknown> = {
  id: '321d495f-e6e4-45cc-b301-4ebc4e894f03',
  resourceId: 'polygonPartsTest7',
  version: '1.0',
  type: 'Ingestion_New',
  description: 'polygonPart job for test',
  parameters: {
    ingestionResolution: 0.0006866455078125,
    inputFiles: {
      gpkgFilesPath: ['/data/polygonPartsTest/gpkgFiles'],
      metadataShapefilePath: '/data/polygonPartsTest/metadataShapefile.shp',
      productShapefilePath: '/data/polygonPartsTest/productShapefile.shp',
    },
    additionalParams: {
      jobTrackerServiceURL: 'http://raster-core-dev-job-tracker-service',
      polygonPartsEntityName: undefined,
    },
  },
  status: OperationStatus.PENDING,
  percentage: 0,
  reason: '',
  domain: RASTER_DOMAIN,
  isCleaned: false,
  priority: 0,
  expirationDate: new Date('2025-09-24T13:38:04.553Z'),
  internalId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  producerName: 'stringg',
  productName: 'strings',
  productType: 'Orthophoto',
  additionalIdentifiers: 'string',
  taskCount: 1,
  completedTasks: 0,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 1,
  abortedTasks: 0,
  created: '2024-09-25T08:19:26.156Z',
  updated: '2024-09-25T08:19:26.156Z',
};

const updatedAdditionalParams = { ...newJobResponseMock.parameters.additionalParams, polygonPartsEntityName: 'blue_marble_orthophoto' };

const updatedJobRequest = {
  parameters: {
    ...newJobResponseMock.parameters,
    additionalParams: updatedAdditionalParams,
  },
};

const exportJobResponseMock: IJobResponse<ExportJobParameters, unknown> = {
  id: '70c29b11-1bfd-4e43-a76a-ca3ab5d7b511',
  resourceId: 'SOME_NAME',
  version: '1.0',
  type: 'Export',
  description: 'This is roi exporting example',
  parameters: {
    additionalParams: {
      fileNamesTemplates: {
        packageName: 'exported_data_package',
      },
      packageRelativePath: 'dcb0cb4ae42344616d0de9d47fa4b90c/test.gpkg',
      relativeDirectoryPath: 'dcb0cb4ae42344616d0de9d47fa4b90c',
      gpkgEstimatedSize: 1111,
      outputFormatStrategy: 'mixed',
      targetFormat: 'JPEG',
      jobTrackerServiceURL: 'jobTrackerUrl',
      polygonPartsEntityName: 'some_name_orthophoto',
    },
    exportInputParams: {
      crs: 'EPSG:4326',
      roi: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [34.85671849225366, 32.306563240778644],
                  [34.858090125180894, 32.30241218787266],
                  [34.862337900781455, 32.30263664191864],
                  [34.86154145051941, 32.30708703329364],
                  [34.85671849225366, 32.306563240778644],
                ],
              ],
            },
            properties: {
              maxResolutionDeg: 0.703125,
              minResolutionDeg: 0.703125,
            },
          },
        ],
      },
      callbackUrls: [],
    },
  },
  status: OperationStatus.IN_PROGRESS,
  percentage: 0,
  reason: '',
  domain: '',
  isCleaned: false,
  priority: 0,
  expirationDate: new Date('2025-01-02T14:00:02.826Z'),
  internalId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
  producerName: 'SOME_NAME',
  productName: 'SOME_NAME',
  productType: ProductType.ORTHOPHOTO,
  additionalIdentifiers: '',
  taskCount: 1,
  completedTasks: 0,
  failedTasks: 0,
  expiredTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 1,
  abortedTasks: 0,
  created: '2025-01-02T14:00:02.826Z',
  updated: '2025-01-02T14:00:02.826Z',
};

const nonExistingGpkgExportJobMock: IJobResponse<ExportJobParameters, unknown> = {
  ...exportJobResponseMock,
  parameters: {
    ...exportJobResponseMock.parameters,
    additionalParams: {
      ...exportJobResponseMock.parameters.additionalParams,
      packageRelativePath: 'non/existent.gpkg',
    },
  },
};

const failTaskRequest = {
  status: OperationStatus.FAILED,
};

export { updatedJobRequest, newJobResponseMock, exportJobResponseMock, failTaskRequest, nonExistingGpkgExportJobMock };
