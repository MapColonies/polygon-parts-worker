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
