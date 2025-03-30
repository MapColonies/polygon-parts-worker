import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { v4 as uuidv4 } from 'uuid';
import { degreesPerPixelToZoomLevel, zoomLevelToResolutionMeter } from '@map-colonies/mc-utils';
import { FindPolygonPartsResponse, FindPolygonPartsResponseWithoutRequestFeatureId } from '../common/interfaces';

const calculateResMeterFromDegree = (resolutionDegree: number): number => {
  const resDegreeZoomLevel = degreesPerPixelToZoomLevel(resolutionDegree);
  const resMeter = zoomLevelToResolutionMeter(resDegreeZoomLevel) as number;
  return resMeter;
};

export const addFeatureIds = (roi: RoiFeatureCollection): RoiFeatureCollection => {
  roi.features.forEach((feature) => {
    feature.id = uuidv4();
  });
  return roi;
};

export const manipulateFeatures = (
  findFeaturesResponse: FindPolygonPartsResponse,
  roi: RoiFeatureCollection
): FindPolygonPartsResponseWithoutRequestFeatureId => {
  const featureIdToMaxResolution = new Map(roi.features.map((feature) => [feature.id, feature.properties.maxResolutionDeg]));

  const updatedFeatures = findFeaturesResponse.features.map((feature) => {
    const { requestFeatureId, ...restProperties } = feature.properties; // Extract & omit requestFeatureId
    const featureResolution = feature.properties.resolutionDegree;

    const maxResolution = featureIdToMaxResolution.get(requestFeatureId);
    if (maxResolution === undefined) {
      throw new Error(`Feature: ${requestFeatureId} doesnt have set maxResolutionDegree`);
    }

    const resolutionDegree = Math.max(featureResolution, maxResolution);
    const resolutionMeter = calculateResMeterFromDegree(resolutionDegree);

    return {
      ...feature,
      properties: {
        ...restProperties,
        resolutionDegree: resolutionDegree,
        resolutionMeter: resolutionMeter,
      },
    };
  });

  return { ...findFeaturesResponse, features: updatedFeatures };
};
