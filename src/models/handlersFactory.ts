import { container } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedJobTypes } from '../common/interfaces';
import { HANDLERS } from '../common/constants';
import { NewJobHandler } from './newJobHandler';
import { UpdateJobHandler } from './updateJobHandler';

export function initJobHandler(jobHandlerType: string, permittedTypes: IPermittedJobTypes): IJobHandler {
  switch (jobHandlerType) {
    case permittedTypes.ingestionNew:
      return container.resolve<NewJobHandler>(HANDLERS.NEW);
    case permittedTypes.ingestionUpdate:
      return container.resolve<UpdateJobHandler>(HANDLERS.UPDATE);
    case permittedTypes.ingestionSwapUpdate:
      return container.resolve<UpdateJobHandler>(HANDLERS.SWAP);
  }
  throw new BadRequestError(`${jobHandlerType} job type is invalid`);
}
