import { getApiUrl } from './config';

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fetchFn - The fetch function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} initialDelay - Initial delay in ms (default: 1000)
 * @returns {Promise} - Result of the successful fetch
 */
export const withRetry = async (
  fetchFn,
  maxRetries = 3,
  initialDelay = 1000
) => {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors (client errors, auth errors, rate-limited)
      if (error.status && (error.status < 500 || error.status === 429) && error.status !== 408) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 8000); // Cap at 8s
      }
    }
  }

  throw lastError;
};

/**
 * Fetch sessions with automatic retry
 * @param {string} token - JWT token
 * @returns {Promise} - Sessions data
 */
export const fetchSessionsWithRetry = async (token) => {
  return withRetry(async () => {
    const response = await fetch(getApiUrl('/sessions'), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  });
};

/**
 * Generic fetch wrapper with retry
 * @param {string} url - Full URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Max retries
 * @returns {Promise} - Response JSON
 */
export const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  return withRetry(async () => {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  }, maxRetries);
};

/**
 * Auth-aware API helper used by session/state hooks.
 * Accepts an API path (e.g. /sessions/1/state) and auto-injects bearer token.
 *
 * GET requests are automatically retried (up to 3 times, exponential backoff 1s→8s).
 * POST/PATCH/PUT/DELETE are never retried automatically — mutations are not
 * idempotent and a silent retry could cause double-execution (duplicate session,
 * double advance, etc.). Retry on mutations requires idempotency keys (post-MVP).
 */
export const fetchAPI = async (path, options = {}) => {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '')
    : '';

  const method = (options.method || 'GET').toUpperCase();
  const isReadOnly = method === 'GET' || method === 'HEAD';

  const execute = () => fetch(getApiUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const error = new Error(
        payload?.error || payload?.message || `HTTP ${response.status}`
      );
      error.status = response.status;
      throw error;
    }
    return response.json();
  });

  return isReadOnly ? withRetry(execute) : execute();
};
