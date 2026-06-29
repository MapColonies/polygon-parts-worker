/* eslint-disable @typescript-eslint/no-magic-numbers */
import { IJobResponse, IUpdateJobBody } from '@map-colonies/mc-priority-queue';
import { RasterProductTypes } from '@map-colonies/raster-shared';
import { IngestionJobParams } from '../../../src/common/interfaces';

const getUpdatedJobParams = (job: IJobResponse<IngestionJobParams, unknown>): IUpdateJobBody<IngestionJobParams> => {
  const newAdditionalParameters = { ...job.parameters.additionalParams };
  const newParameters = { ...job.parameters, additionalParams: { ...newAdditionalParameters } };
  return { parameters: newParameters };
};

const mockGeoJsonFeature = {
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
      properties: {
        id: '35444846-507b-4de4-b7f3-d0e434b01b21',
        partId: '35444846-507b-4de4-b7f3-d0e434b09999',
        catalogId: '8b867544-2dab-43a1-be6e-f23ec83c19b4',
        productId: 'SOME_NAME',
        productType: RasterProductTypes.ORTHOPHOTO,
        sourceId: 'avi',
        sourceName: 'string',
        productVersion: '1.0',
        ingestionDateUTC: '2025-01-02T11:51:12.710Z',
        imagingTimeBeginUTC: '2024-01-28T13:47:43.427Z',
        imagingTimeEndUTC: '2024-01-28T13:47:43.427Z',
        resolutionDegree: 0.703125,
        resolutionMeter: 78271.52,
        sourceResolutionMeter: 8000,
        horizontalAccuracyCE90: 10,
        sensors: ['string'],
        countries: ['string'],
        cities: ['string'],
        description: 'string',
        requestFeatureId: '8f7e6d5c-4b3a-4e2d-9f8a-1b2c3d4e5f6a',
      },
    },
  ],
};
const sourceProperties = mockGeoJsonFeature.features[0].properties;

// Expected Layer Parts output: only the product-required fields, snake_case column names.
// roi maxResolutionDeg (0.703125) equals the feature resolutionDegree, so resolution_deg stays 0.703125.
const exportProperties = {
  id: sourceProperties.id,
  description: sourceProperties.description,
  sensors: sourceProperties.sensors,
  product_id: sourceProperties.productId,
  product_type: sourceProperties.productType,
  product_version: sourceProperties.productVersion,
  imaging_time_begin_utc: sourceProperties.imagingTimeBeginUTC,
  imaging_time_end_utc: sourceProperties.imagingTimeEndUTC,
  ingestion_date_utc: sourceProperties.ingestionDateUTC,
  resolution_deg: sourceProperties.resolutionDegree,
  resolution_meter: sourceProperties.resolutionMeter,
  horizontal_accuracy_ce90: sourceProperties.horizontalAccuracyCE90,
  countries: sourceProperties.countries,
  source_name: sourceProperties.sourceName,
  cities: sourceProperties.cities,
};

const modifiedGeoJsonFeature = {
  ...mockGeoJsonFeature,
  features: [
    {
      ...mockGeoJsonFeature.features[0],
      properties: exportProperties,
    },
  ],
};

export { getUpdatedJobParams, mockGeoJsonFeature, modifiedGeoJsonFeature };
