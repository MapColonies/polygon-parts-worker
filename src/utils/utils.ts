import { RoiFeatureCollection } from '@map-colonies/raster-shared';
import { v4 as uuidv4 } from 'uuid';
import { FindPolygonPartsResponse, FindPolygonPartsResponseWithoutRequestFeatureId } from '../common/interfaces';

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
    const maxResolution = featureIdToMaxResolution.has(requestFeatureId) ? featureIdToMaxResolution.get(requestFeatureId) : undefined;

    if (!maxResolution) {
      throw new Error('Handle No ');
    }

    return {
      ...feature,
      properties: {
        ...restProperties,
        resolutionDegree: Math.min(featureResolution, maxResolution),
      },
    };
  });

  return { ...findFeaturesResponse, features: updatedFeatures };
};
