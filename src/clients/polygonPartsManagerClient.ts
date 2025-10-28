import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { z } from 'zod';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { RoiFeatureCollection, PolygonPartsPayload, PolygonPartsEntityName, partSchema } from '@map-colonies/raster-shared';
import { SERVICES } from '../common/constants';
import { FindPolygonPartsResponse, IConfig } from '../common/interfaces';

//TODO: remove the following type
export type PartsProperties = z.infer<typeof partSchema>;

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

  // @withSpanAsyncV4
  // public async createPolygonParts(requestBody: PolygonPartsPayload): Promise<PolygonPartsEntityNameObject> {
  //   const createPolygonPartsUrl = `/polygonParts`;
  //   //TODO: remove this when the polygonPartsManager is ready and replace with commented line above
  //   // const createPolygonPartsUrl = ``;

  //   const response = await this.post<PolygonPartsEntityNameObject>(createPolygonPartsUrl, requestBody);
  //   return response;
  // }

  // @withSpanAsyncV4
  // public async updatePolygonParts(requestBody: PolygonPartsPayload, isSwap: boolean): Promise<PolygonPartsEntityNameObject> {
  //   const createPolygonPartsUrl = `/polygonParts?isSwap=${isSwap}`;
  //   const response = await this.put<PolygonPartsEntityNameObject>(createPolygonPartsUrl, requestBody);
  //   return response;
  // }

  @withSpanAsyncV4
  public async validatePolygonParts(requestBody: PolygonPartsPayload): Promise<void> {
    const validatePolygonPartsUrl = `/polygonParts/validate`;
    await this.post<void>(validatePolygonPartsUrl, requestBody);
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
