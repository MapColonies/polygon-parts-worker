export class ReachedMaxTaskAttemptsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ReachedMaxTaskAttemptsError.name;
  }
}

export class ShapefileNotFoundError extends Error {
  public constructor(shapefilePath: string, missingFiles: string[]) {
    super(`Shapefile not found: ${shapefilePath}. Missing files: ${missingFiles.join(', ')}`);
    this.name = ShapefileNotFoundError.name;
  }
}
