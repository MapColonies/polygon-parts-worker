import { container } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedJobTypes } from '../common/interfaces';
import { HANDLERS } from '../common/constants';
import { IngestionJobHandler } from './ingestion/ingestionHandler';
import { ExportJobHandler } from './export/exportJobHandler';

export function initJobHandler(jobHandlerType: string, permittedTypes: IPermittedJobTypes): IJobHandler {
  switch (jobHandlerType) {
    case permittedTypes.ingestionNew:
      return container.resolve<IngestionJobHandler>(HANDLERS.NEW) as IJobHandler;
    case permittedTypes.ingestionUpdate:
      return container.resolve<IngestionJobHandler>(HANDLERS.UPDATE) as IJobHandler;
    case permittedTypes.ingestionSwapUpdate:
      return container.resolve<IngestionJobHandler>(HANDLERS.SWAP) as IJobHandler;
    case permittedTypes.exportJob:
      return container.resolve<ExportJobHandler>(HANDLERS.EXPORT) as IJobHandler;
  }
  throw new BadRequestError(`${jobHandlerType} job type is invalid`);
}
