import { container } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedJobTypes } from '../common/interfaces';
import { HANDLER_TOKENS } from '../common/constants';
import { IngestionJobHandler } from './ingestion/ingestionHandler';
import { ExportJobHandler } from './export/exportJobHandler';

export function initJobHandler(jobHandlerType: string, permittedTypes: IPermittedJobTypes): IJobHandler {
  switch (jobHandlerType) {
    case permittedTypes.ingestionNew:
    case permittedTypes.ingestionUpdate:
    case permittedTypes.ingestionSwapUpdate:
      return container.resolve<IngestionJobHandler>(HANDLER_TOKENS.INGESTION) as IJobHandler;
    /* istanbul ignore next */
    case permittedTypes.exportJob:
      return container.resolve<ExportJobHandler>(HANDLER_TOKENS.EXPORT) as IJobHandler;
  }
  throw new BadRequestError(`${jobHandlerType} job type is invalid`);
}
