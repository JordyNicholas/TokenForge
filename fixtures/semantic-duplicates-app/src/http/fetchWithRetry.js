export async function fetchWithRetry(url, options = {}, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
  }
  throw lastError;
}
