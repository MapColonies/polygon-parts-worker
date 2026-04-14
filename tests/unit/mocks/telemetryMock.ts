/* eslint-disable import-x/exports-last */
import type { Logger } from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { ShapefileMetrics } from '../../../src/common/otel/metrics/shapeFileMetrics';
import { TaskMetrics } from '../../../src/common/otel/metrics/taskMetrics';

const childFn = jest.fn();

export const tracerMock = trace.getTracer('test');

export const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  child: childFn,
} as unknown as jest.Mocked<Logger>;

childFn.mockReturnValue(loggerMock);

export const shapeFileMetricsMock = {
  recordChunk: jest.fn(),
  recordFile: jest.fn(),
} as unknown as jest.Mocked<ShapefileMetrics>;

export const taskMetricsMock = {
  recordTaskProcessing: jest.fn(),
  incrementActiveTasks: jest.fn(),
  decrementActiveTasks: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/require-await
  withTaskMetrics: jest.fn().mockImplementation(async (_labels, fn) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return fn();
  }),
} as unknown as jest.Mocked<TaskMetrics>;
