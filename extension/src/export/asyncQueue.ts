/**
 * Serialize async work so overlapping callers share one in-flight chain.
 * Used to keep last-scan writes from racing (auto-export vs Analyze rules).
 */
export function createAsyncQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
