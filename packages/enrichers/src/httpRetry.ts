/** Thrown for HTTP statuses that are worth a short retry (502/503/529). */
export class TransientHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TransientHttpError";
    this.status = status;
  }
}

/** HTTP status codes treated as transient for enricher retries. */
const TRANSIENT_HTTP_STATUSES = new Set([502, 503, 529]);

const TRANSIENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "ECONNABORTED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

/** Slow-request undici timeouts — not brief blips; do not retry as transient. */
const REQUEST_TIMEOUT_CODES = new Set([
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

const TRANSIENT_MESSAGE_PATTERNS = [
  /fetch failed/i,
  /socket hang up/i,
  /econnrefused/i,
  /econnreset/i,
  /epipe/i,
  /other side closed/i,
];

const REQUEST_TIMEOUT_MESSAGE_PATTERNS = [
  /headers timeout/i,
  /body timeout/i,
];

function collectErrorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    if (typeof current === "object" && current !== null && "cause" in current) {
      current = (current as { cause?: unknown }).cause;
    } else {
      break;
    }
  }

  return chain;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** True when undici aborted because headers/body waited longer than configured. */
export function isUndiciRequestTimeout(error: unknown): boolean {
  for (const item of collectErrorChain(error)) {
    const code = errorCode(item);
    if (code && REQUEST_TIMEOUT_CODES.has(code)) {
      return true;
    }
    const message = errorMessage(item);
    if (REQUEST_TIMEOUT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
      return true;
    }
  }
  return false;
}

/** True when the error looks like a brief network blip worth retrying. */
export function isTransientFetchError(error: unknown): boolean {
  if (error instanceof TransientHttpError) {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return false;
  }
  // Headers/body timeouts mean the model was still generating past the limit —
  // retrying immediately usually wastes another full wait.
  if (isUndiciRequestTimeout(error)) {
    return false;
  }

  for (const item of collectErrorChain(error)) {
    const code = errorCode(item);
    if (code && TRANSIENT_ERROR_CODES.has(code)) {
      return true;
    }
    const message = errorMessage(item);
    if (TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
      return true;
    }
  }

  return false;
}

/** True for gateway / overload HTTP statuses that often recover quickly. */
export function isTransientHttpStatus(status: number): boolean {
  return TRANSIENT_HTTP_STATUSES.has(status);
}

/** Human-readable fetch failure including undici/Node `cause` codes. */
export function formatFetchFailure(error: unknown): string {
  const parts: string[] = [];
  for (const item of collectErrorChain(error)) {
    const message = errorMessage(item);
    const code = errorCode(item);
    if (code && !message.includes(code)) {
      parts.push(`${message} (${code})`);
    } else {
      parts.push(message);
    }
  }
  // Deduplicate identical consecutive messages (fetch failed → fetch failed).
  return [...new Set(parts)].join(": ");
}

export type WithRetriesOptions = {
  attempts: number;
  baseDelayMs: number;
  onRetry?: (info: {
    attempt: number;
    attempts: number;
    error: unknown;
    delayMs: number;
  }) => void;
  /** Override sleep for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Return true to retry this thrown value; defaults to isTransientFetchError. */
  shouldRetry?: (error: unknown) => boolean;
};

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` up to `attempts` times, retrying only when `shouldRetry` says so.
 * Non-transient errors and the final failed attempt are rethrown as-is.
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  options: WithRetriesOptions,
): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts));
  const baseDelayMs = Math.max(0, options.baseDelayMs);
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? isTransientFetchError;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retriesLeft = attempts - attempt;
      if (retriesLeft <= 0 || !shouldRetry(error)) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      options.onRetry?.({ attempt, attempts, error, delayMs });
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}
