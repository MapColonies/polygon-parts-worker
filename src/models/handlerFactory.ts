import { container } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedJobTypes } from '../common/interfaces';
import { getHandlerTokens, SERVICES } from '../common/constants';
import type { ConfigType } from '../common/config';
import { IngestionJobHandler } from './ingestion/ingestionHandler';
import { ExportJobHandler } from './export/exportJobHandler';

export function initJobHandler(jobHandlerType: string, permittedTypes: IPermittedJobTypes): IJobHandler {
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const handlers = getHandlerTokens(config);

  switch (jobHandlerType) {
    case permittedTypes.ingestionNew:
      return container.resolve<IngestionJobHandler>(handlers.NEW) as IJobHandler;
    case permittedTypes.ingestionUpdate:
      return container.resolve<IngestionJobHandler>(handlers.UPDATE) as IJobHandler;
    case permittedTypes.ingestionSwapUpdate:
      return container.resolve<IngestionJobHandler>(handlers.SWAP) as IJobHandler;
    /* istanbul ignore next */
    case permittedTypes.exportJob:
      return container.resolve<ExportJobHandler>(handlers.EXPORT) as IJobHandler;
  }
  throw new BadRequestError(`${jobHandlerType} job type is invalid`);
}
