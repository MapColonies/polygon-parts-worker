import { container } from 'tsyringe';
import { JobHandler } from '../common/interfaces';
import { HANDLERS } from '../common/constants';
import { NewJobHandler } from './newLayerHandler';

export function initJobHandler(jobHandlerType: string): JobHandler {
  switch (jobHandlerType) {
    case 'Ingestion_New':
      return container.resolve<NewJobHandler>(HANDLERS.NEW);
  }
  throw new Error(`Bad request,${jobHandlerType} job type is invalid`);
}
