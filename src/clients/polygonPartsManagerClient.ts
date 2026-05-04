import { HttpClient } from '@map-colonies/mc-utils';
import type { IHttpRetryConfig } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import type {
  PolygonPartsChunkValidationResult,
  PolygonPartsPayload,
  PolygonPartsEntityName,
  RoiFeatureCollection,
} from '@map-colonies/raster-shared';
import { SERVICES } from '../common/constants';
import type { FindPolygonPartsResponse, IConfig } from '../common/interfaces';

const POLYGON_PARTS_MANAGER_SERVICE_NAME = 'PolygonPartsManager';

@injectable()
export class PolygonPartsManagerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected override readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(
      logger,
      config.get('polygonPartsManager.baseUrl') as unknown as string,
      POLYGON_PARTS_MANAGER_SERVICE_NAME,
      config.get('httpRetry') as IHttpRetryConfig,
      config.get('disableHttpClientLogs') as boolean
    );
  }

  @withSpanAsyncV4
  public async validate(requestBody: PolygonPartsPayload): Promise<PolygonPartsChunkValidationResult> {
    try {
      const validatePolygonPartsUrl = `/polygonParts/validate`;
      const response = await this.post<PolygonPartsChunkValidationResult>(validatePolygonPartsUrl, requestBody);
      return response;
    } catch (error) {
      const errorMsg = `${POLYGON_PARTS_MANAGER_SERVICE_NAME} Failed to validate polygon parts chunk: ${(error as Error).message}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  // TODO: remove ignore when adding integration tests for export job handler
  /* istanbul ignore next */
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
