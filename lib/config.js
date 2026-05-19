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

const PRODUCTION_API_FALLBACK =
  process.env.NEXT_PUBLIC_API_FALLBACK_BASE
  || 'https://teamblender-backend-qxe5-production.up.railway.app/api';

function normalizeApiBase(rawValue) {
  const candidate = String(rawValue || '/api').trim();
  if (!candidate) return '/api';

  const normalized = candidate.replace(/\/$/, '');

  // If a relative path is provided (e.g. "api"), force absolute-from-root
  // to avoid resolving against the current route (e.g. /session-builder/api).
  const normalizedWithLeadingSlash =
    normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/')
      ? normalized
      : `/${normalized}`;

  if (normalizedWithLeadingSlash === '/api') {
    // If no reverse proxy is configured on the custom domain, /api returns 404.
    // In that case, use the production backend URL directly.
    if (typeof window !== 'undefined' && isTeamBlenderOrigin(window.location.origin)) {
      return PRODUCTION_API_FALLBACK;
    }
    return '/api';
  }

  return normalizedWithLeadingSlash;
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
