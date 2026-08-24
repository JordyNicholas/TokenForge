export function retryRequest(requestFn, retries = 3, delayMs = 250) {
  return requestFn().catch((error) => {
    if (retries <= 0) {
      throw error;
    }
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        retryRequest(requestFn, retries - 1, delayMs).then(resolve, reject);
      }, delayMs);
    });
  });
}
