import { HttpClient } from '@map-colonies/mc-utils';
import { inject, injectable } from 'tsyringe';
import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { Tracer } from '@opentelemetry/api';
import { withSpanAsyncV4 } from '@map-colonies/telemetry';
import { SERVICES } from '../common/constants';

@injectable()
export class JobTrackerClient extends HttpClient {
  public constructor(@inject(SERVICES.LOGGER) protected readonly logger: Logger, @inject(SERVICES.TRACER) public readonly tracer: Tracer) {
    super(logger, config.get<string>('jobManagement.config.jobTracker.baseUrl'), 'JobTracker');
  }

  @withSpanAsyncV4
  public async notifyOnFinishedTask(taskId: string): Promise<void> {
    const notifyUrl = `/tasks/${taskId}/notify`;
    await this.post(notifyUrl);
  }
}
