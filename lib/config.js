function parseBooleanFlag(rawValue, defaultValue = false) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }
  return String(rawValue).trim().toLowerCase() === 'true';
}

function normalizeApiBase(rawValue) {
  const candidate = String(rawValue || '/api').trim();
  if (!candidate) return '/api';

  const normalized = candidate.replace(/\/$/, '');

  return normalized;
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);

// Development switch: only enable challenge mock catalog when explicitly requested.
export const ENABLE_CHALLENGES_MOCK_DATA = parseBooleanFlag(
  process.env.NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA,
  false
);

export const BACKEND_ORIGIN = API_BASE.replace(/\/api$/, '');

export function getApiUrl(path) {
  const normalized = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN;
}
