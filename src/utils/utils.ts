import path from 'path';
import { convertKeysToExportColumns, RoiFeatureCollection } from '@map-colonies/raster-shared';
import { v4 as uuidv4 } from 'uuid';
import { degreesPerPixelToZoomLevel, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import { ExportFeatureProperties, FindPolygonPartsResponse, ExportPolygonPartsResponse } from '../common/interfaces';

export const calculateResMeterFromDegree = (resolutionDegree: number): number => {
  const zoomLevel = degreesPerPixelToZoomLevel(resolutionDegree);
  const resMeter = zoomLevelToResolutionMeter(zoomLevel) as number;
  return resMeter;
};

export const addFeatureIds = (roi: RoiFeatureCollection): RoiFeatureCollection => {
  roi.features.forEach((feature) => {
    feature.id = uuidv4();
  });
  return roi;
};

export const manipulateFeatures = (findFeaturesResponse: FindPolygonPartsResponse, roi: RoiFeatureCollection): ExportPolygonPartsResponse => {
  const featureIdToMaxResolution = new Map(roi.features.map((feature) => [feature.id, feature.properties.maxResolutionDeg]));

  const updatedFeatures = findFeaturesResponse.features.map((feature) => {
    const properties = feature.properties;

    const maxResolution = featureIdToMaxResolution.get(properties.requestFeatureId);
    if (maxResolution === undefined) {
      throw new Error(`Feature: ${properties.requestFeatureId} doesnt have set maxResolutionDegree`);
    }

    const resolutionDegree = Math.max(properties.resolutionDegree, maxResolution);
    const resolutionMeter = calculateResMeterFromDegree(resolutionDegree);

    // Allow-list of the product-required fields (camelCase source keys). Anything not listed here
    // (e.g. jobType, catalogId, partId, sourceId, sourceResolutionMeter, requestFeatureId) is dropped.
    // Optional fields default to null so the exported column always exists (fixed schema).
    const selectedProperties = {
      id: properties.id,
      description: properties.description ?? null,
      sensors: properties.sensors,
      productId: properties.productId,
      productType: properties.productType,
      productVersion: properties.productVersion,
      imagingTimeBeginUTC: properties.imagingTimeBeginUTC,
      imagingTimeEndUTC: properties.imagingTimeEndUTC,
      ingestionDateUTC: properties.ingestionDateUTC,
      resolutionDegree,
      resolutionMeter,
      horizontalAccuracyCE90: properties.horizontalAccuracyCE90,
      countries: properties.countries ?? null,
      sourceName: properties.sourceName,
      cities: properties.cities ?? null,
    };

    // Rename camelCase -> snake_case export column names via the shared converter
    // (applies the resolutionDegree -> resolution_deg override).
    return {
      ...feature,
      properties: convertKeysToExportColumns(selectedProperties) as unknown as ExportFeatureProperties,
    };
  });

  return { ...findFeaturesResponse, features: updatedFeatures } as unknown as ExportPolygonPartsResponse;
};

export const buildUrl = (baseUrl: string, relativePath: string): string => {
  const url = new URL(baseUrl);
  url.pathname = path.posix.join(url.pathname, relativePath);
  return url.href;
};
