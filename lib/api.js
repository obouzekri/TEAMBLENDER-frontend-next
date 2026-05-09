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
      
      // Don't retry on certain errors (client errors, auth errors)
      if (error.status && error.status < 500 && error.status !== 408) {
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
    const response = await fetch(`${getApiUrl()}/sessions`, {
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
