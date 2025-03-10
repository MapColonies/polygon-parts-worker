import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { RoiFeatureCollection, PolygonPartsPayload, PolygonPartsEntityNameObject, PolygonPartsEntityName } from '@map-colonies/raster-shared';
import { SERVICES } from '../common/constants';
import { IConfig } from '../common/interfaces';

@injectable()
export class PolygonPartsManagerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(
      logger,
      config.get<string>('polygonPartsManager.baseUrl'),
      'PolygonPartsManager',
      config.get<IHttpRetryConfig>('httpRetry'),
      config.get<boolean>('disableHttpClientLogs')
    );
  }

  @withSpanAsyncV4
  public async createPolygonParts(requestBody: PolygonPartsPayload): Promise<PolygonPartsEntityNameObject> {
    const createPolygonPartsUrl = `/polygonParts`;
    const response = await this.post<PolygonPartsEntityNameObject>(createPolygonPartsUrl, requestBody);
    return response;
  }

  @withSpanAsyncV4
  public async updatePolygonParts(requestBody: PolygonPartsPayload, isSwap: boolean): Promise<PolygonPartsEntityNameObject> {
    const createPolygonPartsUrl = `/polygonParts?isSwap=${isSwap}`;
    const response = await this.put<PolygonPartsEntityNameObject>(createPolygonPartsUrl, requestBody);
    return response;
  }

  @withSpanAsyncV4
  public async findPolygonParts(polygonPartsEntityName: PolygonPartsEntityName, roi: RoiFeatureCollection): Promise<Record<string, unknown>> {
    const findPartsUrl = `/polygonParts/${polygonPartsEntityName}/find`;
    const response = await this.post<Record<string, unknown>>(findPartsUrl, roi, { shouldClip: true });
    return response;
  }
}
