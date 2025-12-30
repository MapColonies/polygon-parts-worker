import type { IConfig } from 'config';
import type { Logger } from '@map-colonies/js-logger';
import type { CallbackResponse } from '@map-colonies/raster-shared';
import type { IHttpRetryConfig } from '@map-colonies/mc-utils';
import { HttpClient } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import { context, trace, Tracer } from '@opentelemetry/api';
import { SERVICES } from '../common/constants';

@injectable()
export class CallbackClient extends HttpClient {
  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) protected readonly logger: Logger,
    @inject(SERVICES.TRACER) private readonly tracer: Tracer
  ) {
    const serviceName = 'CallbackClient';
    const baseUrl = ''; // base url is empty because the callback client is used to call the callback url
    const httpRetryConfig = config.get<IHttpRetryConfig>('httpRetry');
    const disableHttpClientLogs = config.get<boolean>('disableHttpClientLogs');
    super(logger, baseUrl, serviceName, httpRetryConfig, disableHttpClientLogs);
  }

  public async send(callbackUrls: string[], data: CallbackResponse<unknown>): Promise<void> {
    const logger = this.logger.child({ jobId: data.jobId, taskId: data.taskId });
    return context.with(trace.setSpan(context.active(), this.tracer.startSpan(`${CallbackClient.name}.send`)), async () => {
      const activeSpan = trace.getActiveSpan();
      const monitorAttributes = {
        callbackUrls,
        callbackStatus: data.status,
      };
      activeSpan?.setAttributes({ metadata: JSON.stringify(monitorAttributes) });

      logger.info({ msg: 'Sending callbacks', ...monitorAttributes });
      activeSpan?.addEvent('callback.sending');

      await Promise.all(
        callbackUrls.map(async (callbackUrl) =>
          this.post(callbackUrl, data).catch((err: Error) => {
            logger.error({
              msg: 'Failed to send callback',
              url: callbackUrl,
              error: err.message,
            });
            if (err instanceof Error) {
              activeSpan?.recordException(err);
            }
          })
        )
      );

      activeSpan?.addEvent('callback.sent.success');
      logger.info({ msg: 'Callbacks sent successfully', callbackUrls });
      activeSpan?.end();
    });
  }
}
