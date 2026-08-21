/** User/usage mistake (bad LLM spec or missing consent). */
export class UsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

/** Runtime failure while calling an enricher backend. */
export class RuntimeError extends Error {
  readonly exitCode = 1;

  constructor(message: string) {
    super(message);
    this.name = "RuntimeError";
  }
}

export function isEnricherError(
  error: unknown,
): error is UsageError | RuntimeError {
  return error instanceof UsageError || error instanceof RuntimeError;
}
