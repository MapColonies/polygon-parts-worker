import { container } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedJobTypes } from '../common/interfaces';
import { HANDLERS } from '../common/constants';
import { NewJobHandler } from './newJobHandler';

export function initJobHandler(jobHandlerType: string, jobDefinitions: IPermittedJobTypes): IJobHandler {
  switch (jobHandlerType) {
    case jobDefinitions.ingestionNew:
      return container.resolve<NewJobHandler>(HANDLERS.NEW);
  }
  throw new BadRequestError(`${jobHandlerType} job type is invalid`);
}
