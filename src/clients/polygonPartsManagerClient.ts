import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import { AxiosResponse } from 'axios';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { PolygonPartsChunkValidationResult } from '@map-colonies/raster-shared';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { RoiFeatureCollection, PolygonPartsPayload, PolygonPartsEntityName } from '@map-colonies/raster-shared';
import { SERVICES } from '../common/constants';
import { FindPolygonPartsResponse, IConfig } from '../common/interfaces';
import { HttpClientV2 } from '../common/http/httpClientV2';

@injectable()
export class PolygonPartsManagerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer,
    @inject(SERVICES.POLYGON_PARTS_HTTP_CLIENT) private readonly httpClientV2: HttpClientV2
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
  public async validatePolygonParts(requestBody: PolygonPartsPayload): Promise<AxiosResponse<PolygonPartsChunkValidationResult>> {
    const validatePolygonPartsUrl = `/polygonParts/validate`;
    const response = await this.httpClientV2.post<PolygonPartsChunkValidationResult>(validatePolygonPartsUrl, requestBody);
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
