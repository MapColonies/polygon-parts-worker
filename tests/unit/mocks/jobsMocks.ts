/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ProductType, Transparency } from '@map-colonies/mc-model-types';
import { OperationStatus } from '@map-colonies/mc-priority-queue';
import { JobParams, JobResponse } from '../../../src/common/interfaces';

const newJobResponseMock: JobResponse = {
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
  } as JobParams,
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

const failTaskRequest = {
  status: OperationStatus.FAILED,
};

export { updatedJobRequest, newJobResponseMock, failTaskRequest };
