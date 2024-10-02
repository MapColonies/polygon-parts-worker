import { container } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedTypes } from '../common/interfaces';
import { HANDLERS } from '../common/constants';
import { NewJobHandler } from './newJobHandler';

export function initJobHandler(jobHandlerType: string, permittedTypes: IPermittedTypes): IJobHandler {
  switch (jobHandlerType) {
    case permittedTypes.newType:
      return container.resolve<NewJobHandler>(HANDLERS.NEW);
  }
  throw new BadRequestError(`${jobHandlerType} job type is invalid`);
}
