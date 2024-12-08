export class ReachedMaxTaskAttemptsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = ReachedMaxTaskAttemptsError.name;
  }
}
