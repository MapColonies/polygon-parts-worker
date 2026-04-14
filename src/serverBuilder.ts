import express from 'express';
import { inject, injectable } from 'tsyringe';
import { Registry } from 'prom-client';
import type { Logger } from '@map-colonies/js-logger';
import { collectMetricsExpressMiddleware } from '@map-colonies/prometheus';
import { SERVICES } from './common/constants';
import type { ConfigType } from './common/config';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.serverInstance.use(collectMetricsExpressMiddleware({ registry: this.metricsRegistry }));

    return this.serverInstance;
  }
}
