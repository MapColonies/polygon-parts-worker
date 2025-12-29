export class UnrecoverableTaskError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = UnrecoverableTaskError.name;
  }
}

export class ReachedMaxTaskAttemptsError extends UnrecoverableTaskError {
  public constructor(message: string) {
    super(message);
    this.name = ReachedMaxTaskAttemptsError.name;
  }
}
export class ShapefileNotFoundError extends UnrecoverableTaskError {
  public constructor(shapefilePath: string, missingFiles: string[]) {
    super(`Shapefile not found: ${shapefilePath}. Missing files: ${missingFiles.join(', ')}`);
    this.name = ShapefileNotFoundError.name;
  }
}

export class S3Error extends Error {
  public constructor(err: unknown, customMessage?: string) {
    const message = `S3 Error(${customMessage}): ${err instanceof Error ? err.message : 'unknown'}`;
    super(message);
    this.name = S3Error.name;
    this.stack = err instanceof Error ? err.stack : undefined;
  }
}
