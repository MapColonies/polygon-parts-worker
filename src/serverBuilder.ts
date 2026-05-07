import express from 'express';
import { inject, injectable } from 'tsyringe';
import { Registry } from 'prom-client';
import { collectMetricsExpressMiddleware } from '@map-colonies/prometheus';
import { SERVICES } from './common/constants';
import type { ConfigType } from './common/config';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.METRICS) private readonly registry?: Registry
  ) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    if ((this.config.get('mclabels.prometheus.enabled') as unknown as boolean) && this.registry) {
      this.serverInstance.use(collectMetricsExpressMiddleware({ registry: this.registry }));
    }

    return this.serverInstance;
  }
}
