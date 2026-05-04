import { HttpClient } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import type { Logger } from '@map-colonies/js-logger';
import type { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { SERVICES } from '../common/constants';
import type { IConfig } from '../common/interfaces';

@injectable()
export class JobTrackerClient extends HttpClient {
  public constructor(
    @inject(SERVICES.LOGGER) protected override readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.TRACER) public readonly tracer: Tracer
  ) {
    super(logger, config.get<string>('jobManagement.config.jobTracker.baseUrl'), 'JobTracker');
  }

  @withSpanAsyncV4
  public async notifyOnFinishedTask(taskId: string): Promise<void> {
    const notifyUrl = `/tasks/${taskId}/notify`;
    await this.post(notifyUrl);
  }
}
