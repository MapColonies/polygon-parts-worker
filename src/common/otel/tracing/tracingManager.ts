// src/common/otel/tracing/tracingManager.ts
import { Span, SpanKind, SpanStatusCode, Tracer, Context, SpanOptions, Attributes } from '@opentelemetry/api';
import { inject, injectable } from 'tsyringe';
import { SERVICES } from '../../constants';

export interface SpanMetadata {
  name: string;
  kind?: SpanKind;
  attributes?: Attributes;
}

export interface TracingOptions extends SpanOptions {
  recordErrors?: boolean;
  setStatus?: boolean;
}

@injectable()
export class TracingManager {
  public constructor(@inject(SERVICES.TRACER) private readonly tracer: Tracer) {}

  /**
   * Create a span and execute a function within its context
   */
  public async withSpan<T>(metadata: SpanMetadata, fn: (span: Span) => Promise<T>, options?: TracingOptions): Promise<T> {
    const { name, attributes, kind } = metadata;
    return this.tracer.startActiveSpan(name, { attributes, kind }, async (span) => {
      try {
        const result = await fn(span);
        if (options?.setStatus !== false) {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        return result;
      } catch (error) {
        if (options?.recordErrors !== false) {
          span.recordException(error as Error);
        }

        if (options?.setStatus !== false) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Create a child span from parent context
   */
  public async withChildSpan<T>(
    parentContext: Context,
    metadata: SpanMetadata,
    fn: (span: Span) => Promise<T>,
    options?: TracingOptions
  ): Promise<T> {
    const span = this.tracer.startSpan(
      metadata.name,
      {
        kind: metadata.kind ?? SpanKind.INTERNAL,
        attributes: metadata.attributes,
      },
      parentContext
    );

    try {
      const result = await fn(span);

      if (options?.setStatus !== false) {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      return result;
    } catch (error) {
      if (options?.recordErrors !== false) {
        span.recordException(error as Error);
      }

      if (options?.setStatus !== false) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Helper to create span metadata for common operations
   */
  public createSpanMetadata(
    operation: string,
    component: string,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes?: Record<string, unknown>
  ): SpanMetadata {
    return {
      name: `${component}.${operation}`,
      kind,
      attributes: {
        component: component,
        operation: operation,
        ...attributes,
      },
    };
  }
}
