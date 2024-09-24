import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { PolygonPartsPayload } from '@map-colonies/mc-model-types';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { SERVICES } from '../common/constants';

@injectable()
export class PolygonPartsManagerClient extends HttpClient {
  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger, @inject(SERVICES.TRACER) public readonly tracer: Tracer) {
    super(
      logger,
      config.get<string>('polygonPartsManager.baseUrl'),
      'PolygonPartsManager',
      config.get<IHttpRetryConfig>('httpRetry'),
      config.get<boolean>('httpRetry.disableHttpClientLogs')
    );
  }

  @withSpanAsyncV4
  public async createNewPolyParts(requestBody: PolygonPartsPayload): Promise<void> {
    const newPolyPartsUrl = `/polygonParts`;
    this.logger.info({ msg: `sending new layer request` }, requestBody.productId);
    await this.post(newPolyPartsUrl, requestBody);
  }
}
