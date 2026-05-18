function parseBooleanFlag(rawValue, defaultValue = false) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }
  return String(rawValue).trim().toLowerCase() === 'true';
}

function isTeamBlenderOrigin(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === 'teamblender.io' || hostname === 'www.teamblender.io';
  } catch {
    return false;
  }
}

function normalizeApiBase(rawValue) {
  const candidate = String(rawValue || '/api').trim();
  if (!candidate) return '/api';

  const normalized = candidate.replace(/\/$/, '');

  if (normalized === '/api') {
    return '/api';
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    if (typeof window !== 'undefined' && isTeamBlenderOrigin(window.location.origin)) {
      return '/api';
    }

    try {
      const url = new URL(normalized);
      if (url.hostname.includes('railway.app')) {
        return '/api';
      }
    } catch {
      // Fall through to raw normalized value.
    }
  }

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
