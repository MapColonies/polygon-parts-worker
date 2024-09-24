import { Logger } from '@map-colonies/js-logger';
import { PolygonPartsManagerClient } from '../clients/polygonPartsManagerClient';
import { JobHandler } from '../common/interfaces';
import { NewJobHandler } from './newLayerHandler';

export function initJobHandler(jobHandlerType: string, logger: Logger, polygonPartsManager: PolygonPartsManagerClient): JobHandler {
  switch (jobHandlerType) {
    case 'Ingestion_New':
      return new NewJobHandler(logger, polygonPartsManager);
  }
  throw new Error(`Bad request,${jobHandlerType} job type is invalid`);
}

//Ofer's suggestion
// class Handler {
//   constructor(logger: Logger) {}
// public handle(data:string, ): string {
//   return data;
// }
// }

// function handlersFactory(container: DependencyContainer): Map<string, Handler> {
//   const handler = container.resolve<Handler>('handler')
//   const map = new Map<string, Handler>()
//   map.set('newJobType', handler)
//   return map;
// }

// const handlers = handlersFactory()

// const handler = handlers.get('newJobType')
