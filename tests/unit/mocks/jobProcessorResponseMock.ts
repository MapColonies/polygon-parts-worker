/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { IJobResponse, IUpdateJobBody } from '@map-colonies/mc-priority-queue';
import { PolygonPartsEntityName } from '@map-colonies/mc-model-types';
import { IngestionJobParams } from '../../../src/common/interfaces';

export const polygonPartsEntity = { polygonPartsEntityName: 'blue_marble_orthophoto' };

export const getUpdatedJobParams = (
  job: IJobResponse<IngestionJobParams, unknown>,
  polygonPartsEntity: PolygonPartsEntityName
): IUpdateJobBody<IngestionJobParams> => {
  const newAdditionalParameters = { ...job.parameters.additionalParams, ...polygonPartsEntity };
  const newParameters = { ...job.parameters, additionalParams: { ...newAdditionalParameters } };
  return { parameters: newParameters };
};

export const mockGeoJsonFeature = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'SOME_NAME-Orthophoto.35444846-507b-4de4-b7f3-d0e434b01b21',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [34.85149443279957, 32.30543192283443],
            [34.85149443279957, 32.29430955805424],
            [34.86824157112912, 32.29430955805424],
            [34.86824157112912, 32.30543192283443],
            [34.85149443279957, 32.30543192283443],
          ],
        ],
      },
      geometry_name: 'footprint',
      properties: {
        id: '35444846-507b-4de4-b7f3-d0e434b01b21',
        catalogId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
        productId: 'SOME_NAME',
        productType: 'Orthophoto',
        sourceId: 'avi',
        sourceName: 'string',
        productVersion: '1.0',
        ingestionDateUtc: '2025-01-02T11:51:12.710Z',
        imagingTimeBeginUtc: '2024-01-28T13:47:43.427Z',
        imagingTimeEndUtc: '2024-01-28T13:47:43.427Z',
        resolutionDegree: 0.703125,
        resolutionMeter: 8000,
        sourceResolutionMeter: 8000,
        horizontalAccuracyCe90: 10,
        sensors: 'string',
        countries: 'string',
        cities: 'string',
        description: 'string',
      },
      bbox: [34.85149443279957, 32.29430955805424, 34.86824157112912, 32.30543192283443],
    },
  ],
  totalFeatures: 1,
  numberMatched: 1,
  numberReturned: 1,
  timeStamp: '2025-01-07T14:15:55.792Z',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4326' } },
  bbox: [34.85149443279957, 32.29430955805424, 34.86824157112912, 32.30543192283443],
};
