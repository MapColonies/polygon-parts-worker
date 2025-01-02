import { HttpClient } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { SERVICES } from '../common/constants';
import { IConfig } from '../common/interfaces';

@injectable()
export class GeoserverClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(logger, config.get<string>('geoserverApi.baseUrl'), 'GeoserverApi');
  }

  @withSpanAsyncV4
  public async getFeatures(layer: string): Promise<Record<string, unknown>> {
    const getFeaturesUrl = `/geoserver/wfs`;
    this.logger.info(`fetching features for layer: ${layer}`);
    return this.get(getFeaturesUrl, {
      service: 'wfs',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: `polygonParts:${layer}`,
      outputFormat: 'json',
    });
  }
}
