/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ProductType, Transparency } from '@map-colonies/mc-model-types';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';
import { ExportJobParams, IngestionJobParams } from '../../../src/common/interfaces';

const newJobResponseMock: IJobResponse<IngestionJobParams, unknown> = {
  id: '321d495f-e6e4-45cc-b301-4ebc4e894f03',
  resourceId: 'polygonPartsTest7',
  version: '1.0',
  type: 'Ingestion_New',
  description: 'polygonPart job for test',
  parameters: {
    metadata: {
      srs: '4326',
      grid: '2x1',
      region: ['hkjhjk'],
      srsName: 'WGS84GEO',
      catalogId: 'a4f05d9e-01ff-4418-b819-8869cab6ee5d',
      productId: 'hkhjk',
      displayPath: '2b549bc0-0381-492a-8f55-28a19cd98e38',
      productName: 'hjkhjk',
      productType: ProductType.ORTHOPHOTO,
      producerName: 'IDFMU',
      tileMimeType: 'image/png',
      transparency: Transparency.TRANSPARENT,
      classification: '5',
      tileOutputFormat: 'PNG',
      layerRelativePath: 'a4f05d9e-01ff-4418-b819-8869cab6ee5d/2b549bc0-0381-492a-8f55-28a19cd98e38',
    },
    partsData: [
      {
        sensors: ['jkljkl'],
        sourceId: 'dghfghfg',
        footprint: {
          type: 'Polygon',
          coordinates: [
            [
              [34.48728335834858, 31.531266394350354],
              [34.48727176862647, 31.53023901883512],
              [34.48762525514584, 31.530456349213623],
              [34.48847130484714, 31.530910765642957],
              [34.488013510830655, 31.531547932783027],
              [34.48728335834858, 31.531266394350354],
            ],
          ],
        },
        sourceName: 'dhgfhg',
        resolutionMeter: 0.037,
        resolutionDegree: 3.35276126861572e-7,
        imagingTimeEndUTC: new Date('2024-11-19T13:31:00.000Z'),
        imagingTimeBeginUTC: new Date('2024-11-17T13:31:00.000Z'),
        sourceResolutionMeter: 70000,
        horizontalAccuracyCE90: 49,
      },
    ],
    inputFiles: {
      fileNames: ['sample_2.5cm_geo.gpkg'],
      originDirectory: 'test_dir',
    },
    additionalParams: {
      jobTrackerServiceURL: 'http://raster-core-dev-job-tracker-service',
    },
  } as IngestionJobParams,
  status: OperationStatus.PENDING,
  percentage: 0,
  reason: '',
  domain: 'string',
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

const exportJobResponseMock: IJobResponse<ExportJobParams, unknown> = {
  id: '70c29b11-1bfd-4e43-a76a-ca3ab5d7b511',
  resourceId: 'SOME_NAME',
  version: '1.0',
  type: 'Export',
  description: 'This is roi exporting example',
  parameters: {
    additionalParams: {
      fileNamesTemplates: {
        dataURI: 'test1-source.gpkg',
        metadataURI: 'test1-source.json',
      },
      packageRelativePath: 'dcb0cb4ae42344616d0de9d47fa4b90c/test.gpkg',
      relativeDirectoryPath: 'dcb0cb4ae42344616d0de9d47fa4b90c',
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
            },
          },
        ],
      },
      callbacks: [],
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

const nonExistentGpkgExportJobMock: IJobResponse<ExportJobParams, unknown> = {
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

export {
  updatedJobRequest,
  newJobResponseMock,
  exportJobResponseMock,
  failTaskRequest,
  nonExistentGpkgExportJobMock as nonExistingGpkgExportJobMock,
};
