// this import must be called before the first import of tsyringe
import 'reflect-metadata';
import { createServer } from 'http';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import config from 'config';
import { Span, Tracer } from '@opentelemetry/api';
import { DEFAULT_SERVER_PORT, SERVICES } from './common/constants';

import { getApp } from './app';

const port: number = config.get<number>('server.port') || DEFAULT_SERVER_PORT;

const app = getApp();

const logger = container.resolve<Logger>(SERVICES.LOGGER);
const tracer = container.resolve<Tracer>(SERVICES.TRACER);

const stubHealthCheck = async (): Promise<void> => Promise.resolve();
// eslint-disable-next-line @typescript-eslint/naming-convention
const server = createTerminus(createServer(app), { healthChecks: { '/liveness': stubHealthCheck, onSignal: container.resolve('onSignal') } });

server.listen(port, () => {
  logger.info(`app started on port ${port}`);
});

const mainPollLoop = async (): Promise<void> => {
  const pollingTimout = config.get<number>('pollingTimeMS');
  const isRunning = true;
  logger.info({ msg: 'Running job status poll' });
  //eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (isRunning) {


    //tail sampling is needed here! https://opentelemetry.io/docs/concepts/sampling/
    await tracer.startActiveSpan('jobManager.job get_job', async (span: Span) => {
      try {
        
      } catch (error) {
        logger.error({ err: error, msg: `Main loop poll error occurred` });
      } finally {
        if (!(polledData || finalizePolledData)) {
          await new Promise((resolve) => setTimeout(resolve, pollingTimout));
        }
      }
      span.end();
    });
  }
};

void mainPollLoop();
