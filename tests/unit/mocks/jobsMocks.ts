/* eslint-disable @typescript-eslint/no-magic-numbers */
import { PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { IJobResponse, OperationStatus } from '@map-colonies/mc-priority-queue';

export const newJobResponseMock: IJobResponse<PolygonPartsPayload, unknown> = {
  id: '321d495f-e6e4-45cc-b301-4ebc4e894f03',
  resourceId: 'polygonPartsTest7',
  version: '1.0',
  type: 'Ingestion_New',
  description: 'polygonPart job for test',
  parameters: {
    partsData: [
      {
        cities: ['string'],
        sensors: ['string'],
        coordinates: [
          [
            [
              35.096758731934955,
              32.840683800982745
            ],
            [
              35.06439307418452,
              32.840683800982745
            ],
            [
              35.06439307418452,
              32.811336871233905
            ],
            [
              35.096758731934955,
              32.811336871233905
            ],
            [
              35.096758731934955,
              32.840683800982745
            ]
          ]
        ],
        sourceId: 'string',
        countries: ['Israel'],
        sourceName: 'thisIsSourceName',
        description: 'string',
        resolutionMeter: 78271.52,
        resolutionDegree: 0.703125,
        imagingTimeEndUTC: '2024-09-24T14:06:43.706Z' as unknown as Date,
        imagingTimeBeginUTC: '2024-09-24T14:06:43.706Z' as unknown as Date,
        sourceResolutionMeter: 78271.52,
        horizontalAccuracyCE90: 4000,
      },
    ],
  } as unknown as PolygonPartsPayload,
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
