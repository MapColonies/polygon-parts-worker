import { DependencyContainer } from 'tsyringe';
import { BadRequestError } from '@map-colonies/error-types';
import { IJobHandler, IPermittedJobTypes } from '../common/interfaces';
import { IngestionJobHandler } from './ingestion/ingestionHandler';
import { ExportJobHandler } from './export/exportJobHandler';

export function initJobHandler(container: DependencyContainer): (jobType: string, permittedTypes: IPermittedJobTypes) => IJobHandler {
  return (jobHandlerType: string, permittedTypes: IPermittedJobTypes): IJobHandler => {
    switch (jobHandlerType) {
      case permittedTypes.ingestionNew:
      case permittedTypes.ingestionUpdate:
      case permittedTypes.ingestionSwapUpdate:
        return container.resolve(IngestionJobHandler) as IJobHandler;
      // TODO: remove ignore when adding integration tests for export job handler
      /* istanbul ignore next */
      case permittedTypes.exportJob:
        return container.resolve(ExportJobHandler) as IJobHandler;
    }
    throw new BadRequestError(`${jobHandlerType} job type is invalid`);
  };
}
