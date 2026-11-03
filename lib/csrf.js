import { getApiUrl } from './config.js';

let memoryCsrfToken = '';
let csrfRefreshPromise = null;

function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const key = String(name || '').trim();
  if (!key) return '';

  const entries = String(document.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const idx = entry.indexOf('=');
    if (idx <= 0) continue;
    const cookieName = entry.slice(0, idx).trim();
    if (cookieName !== key) continue;

    const rawValue = entry.slice(idx + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return '';
}

// The cookie may be unreadable (cross-origin API) or shadowed by a duplicate,
// so the token returned by the API is kept in memory as a fallback.
export function setCsrfToken(token) {
  const normalized = String(token || '').trim();
  if (normalized) memoryCsrfToken = normalized;
}

export function getCsrfToken() {
  return readCookie('tb_csrf') || memoryCsrfToken;
}

export async function refreshCsrfToken() {
  if (typeof window === 'undefined') return '';

  if (!csrfRefreshPromise) {
    csrfRefreshPromise = fetch(getApiUrl('/auth/csrf-token'), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        setCsrfToken(payload?.csrfToken);
        return String(payload?.csrfToken || '').trim() || getCsrfToken();
      })
      .catch(() => getCsrfToken())
      .finally(() => {
        csrfRefreshPromise = null;
      });
  }

  return csrfRefreshPromise;
}

export async function isCsrfRejection(response) {
  if (!response || response.status !== 403) return false;
  try {
    const payload = await response.clone().json();
    return payload?.code === 'CSRF_TOKEN_INVALID';
  } catch {
    return false;
  }
}

// fetch() wrapper for mutations: on a CSRF rejection, refresh the token and retry once.
export async function fetchWithCsrfRetry(url, options = {}) {
  const response = await fetch(url, options);
  if (!(await isCsrfRejection(response))) return response;

  const token = await refreshCsrfToken();
  if (!token) return response;

  const headers = { ...(options.headers || {}) };
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'x-csrf-token') delete headers[key];
  }
  headers['X-CSRF-Token'] = token;
  return fetch(url, { ...options, headers });
}

export function withCsrfHeaders(extraHeaders = {}) {
  const token = getCsrfToken();
  return {
    ...(token ? { 'X-CSRF-Token': token } : {}),
    ...(extraHeaders || {}),
  };
}
