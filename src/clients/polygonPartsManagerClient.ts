import { Logger } from '@map-colonies/js-logger';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { PolygonPartsEntityName, PolygonPartsEntityNameObject, PolygonPartsPayload, RoiFeatureCollection } from '@map-colonies/raster-shared';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { Tracer } from '@opentelemetry/api';
import { inject, injectable } from 'tsyringe';
import { SERVICES } from '../common/constants';
import type { ExistsPolygonPartsPayload, FindPolygonPartsResponse, IConfig } from '../common/interfaces';

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
  public async getPolygonPartsIfExists(requestBody: ExistsPolygonPartsPayload): Promise<PolygonPartsEntityNameObject> {
    const existsPolygonPartsUrl = `/polygonParts/exists`;
    const response = await this.post<PolygonPartsEntityNameObject>(existsPolygonPartsUrl, requestBody);
    return response;
  }

  @withSpanAsyncV4
  public async findPolygonParts(polygonPartsEntityName: PolygonPartsEntityName, roi: RoiFeatureCollection): Promise<FindPolygonPartsResponse> {
    const findPartsUrl = `/polygonParts/${polygonPartsEntityName}/find`;
    const body = {
      filter: roi,
    };
    const response = await this.post<FindPolygonPartsResponse>(findPartsUrl, body, { shouldClip: true });
    return response;
  }
}
