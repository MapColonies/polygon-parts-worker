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
