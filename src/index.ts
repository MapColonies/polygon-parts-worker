import 'reflect-metadata';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import type { Logger } from '@map-colonies/js-logger';
import { Span, Tracer } from '@opentelemetry/api';
import { SERVICES } from './common/constants';
import type { ConfigType } from './common/config';
import { JobProcessor } from './models/jobProcessor';
import { getApp } from './app';

void getApp()
  .then(([app, container]) => {
    const logger = container.resolve<Logger>(SERVICES.LOGGER);
    const config = container.resolve<ConfigType>(SERVICES.CONFIG);
    const tracer = container.resolve<Tracer>(SERVICES.TRACER);

    const port = config.get<number>('server.port');
    const stubHealthCheck = async (): Promise<void> => Promise.resolve();
    const server = createTerminus(createServer(app), { healthChecks: { '/liveness': stubHealthCheck }, onSignal: container.resolve('onSignal') });
    const jobProcessor = container.resolve(JobProcessor);

    async function startPolling(): Promise<void> {
      await tracer.startActiveSpan('jobManager.task start polling', async (span: Span) => {
        await jobProcessor.start();
        span.end();
      });
    }

    server.listen(port, () => {
      logger.info({ msg: 'app started', port });
      startPolling().catch((error: unknown) => {
        if (error instanceof Error) {
          logger.fatal({ msg: 'error in main loop', err: error });
        }
        jobProcessor.stop();
        process.exit(1);
      });
    });
  })
  .catch((error: Error) => {
    console.error('😢 - failed initializing the server');
    console.error(error);
    process.exit(1);
  });
