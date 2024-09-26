import { container } from 'tsyringe';
import { IJobHandler } from '../common/interfaces';
import { HANDLERS } from '../common/constants';
import { NewJobHandler } from './newLayerHandler';

export function initJobHandler(jobHandlerType: string): IJobHandler {
  switch (jobHandlerType) {
    case 'Ingestion_New':
      return container.resolve<NewJobHandler>(HANDLERS.NEW);
  }
  throw new Error(`Bad request,${jobHandlerType} job type is invalid`);
}
