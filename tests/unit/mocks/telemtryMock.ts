import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { ShapefileMetrics } from '../../../src/common/otel/metrics/shapeFileMetrics';
import { TaskMetrics } from '../../../src/common/otel/metrics/taskMetrics';

export const tracerMock = trace.getTracer('test');
export const loggerMock = jsLogger({ enabled: false });

export const shapeFileMetricsMock = {
  recordChunk: jest.fn(),
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
