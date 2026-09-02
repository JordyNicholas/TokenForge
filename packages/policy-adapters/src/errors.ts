/** Policy adapter failure (unknown provider, oversized instruction file, etc.). */
export class PolicyError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "PolicyError";
  }
}
