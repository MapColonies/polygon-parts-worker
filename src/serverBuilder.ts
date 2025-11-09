import express from 'express';
import { inject, injectable } from 'tsyringe';
import { Registry } from 'prom-client';
import { Logger } from '@map-colonies/js-logger';
import { collectMetricsExpressMiddleware } from '@map-colonies/telemetry';
import { SERVICES } from './common/constants';
import { IConfig } from './common/interfaces';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS_REGISTRY) private readonly registry: Registry
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    if (this.config.get<boolean>('telemetry.metrics.enabled')) {
      this.serverInstance.use(collectMetricsExpressMiddleware({ registry: this.registry }));
    }

    return this.serverInstance;
  }
}
