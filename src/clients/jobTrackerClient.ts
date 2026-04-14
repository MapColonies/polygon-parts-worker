import { HttpClient } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/tracing-utils';
import type { ConfigType } from '@src/common/config';
import { SERVICES } from '../common/constants';

@injectable()
export class JobTrackerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected override readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(logger, config.get('jobManagement.config.jobTracker.baseUrl') as unknown as string, 'JobTracker');
  }

  @withSpanAsyncV4
  public async notifyOnFinishedTask(taskId: string): Promise<void> {
    const notifyUrl = `/tasks/${taskId}/notify`;
    await this.post(notifyUrl);
  }
}
