/** User/usage mistake (bad args). */
export class UsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

/** Runtime failure while scanning or writing files. */
export class RuntimeError extends Error {
  readonly exitCode = 1;

  constructor(message: string) {
    super(message);
    this.name = "RuntimeError";
  }
}

export function isCliError(
  error: unknown,
): error is UsageError | RuntimeError {
  return error instanceof UsageError || error instanceof RuntimeError;
}
