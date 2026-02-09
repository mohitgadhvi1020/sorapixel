/**
 * Safe wrapper around fetch + JSON parsing.
 * Handles non-JSON responses, network errors, and timeouts gracefully.
 */
export async function safeFetch<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (err) {
    // Network error, DNS failure, CORS, etc.
    throw new Error(
      "Network error — please check your connection and try again."
    );
  }

  // Try to parse as JSON
  let data: T;
  try {
    const text = await response.text();
    data = JSON.parse(text) as T;
  } catch {
    // Server returned non-JSON (HTML error page, timeout, etc.)
    if (response.status === 504 || response.status === 502) {
      throw new Error(
        "Request timed out — the server took too long. Please try again."
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Rate limited — too many requests. Please wait a moment and try again."
      );
    }
    throw new Error(
      `Server error (${response.status}) — please try again in a few seconds.`
    );
  }

  return data;
}
