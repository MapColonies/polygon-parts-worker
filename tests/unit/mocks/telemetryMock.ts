import type { Logger } from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { ShapefileMetrics } from '../../../src/common/otel/metrics/shapeFileMetrics';
import { TaskMetrics } from '../../../src/common/otel/metrics/taskMetrics';

const tracerMock = trace.getTracer('test');

const loggerImpl = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn(),
};

loggerImpl.child.mockImplementation(() => loggerImpl);

const loggerMock = loggerImpl as unknown as Logger;

const shapeFileMetricsMock = {
  recordChunk: jest.fn(),
  recordFile: jest.fn(),
} as unknown as jest.Mocked<ShapefileMetrics>;

const taskMetricsMock = {
  recordTaskProcessing: jest.fn(),
  incrementActiveTasks: jest.fn(),
  decrementActiveTasks: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/require-await
  withTaskMetrics: jest.fn().mockImplementation(async (_labels, fn) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return fn();
  }),
} as unknown as jest.Mocked<TaskMetrics>;

export { loggerMock, shapeFileMetricsMock, taskMetricsMock, tracerMock };
