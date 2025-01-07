import { IJobResponse, IUpdateJobBody } from '@map-colonies/mc-priority-queue';
import { PolygonPartsEntityName } from '@map-colonies/mc-model-types';
import { JobParams } from '../../../src/common/interfaces';

export const polygonPartsEntity = { polygonPartsEntityName: 'blue_marble_orthophoto' };

export const getUpdatedJobParams = (job: IJobResponse<JobParams, unknown>, polygonPartsEntity: PolygonPartsEntityName): IUpdateJobBody<JobParams> => {
  const newAdditionalParameters = { ...job.parameters.additionalParams, ...polygonPartsEntity };
  const newParameters = { ...job.parameters, additionalParams: { ...newAdditionalParameters } };
  return { parameters: newParameters };
};
