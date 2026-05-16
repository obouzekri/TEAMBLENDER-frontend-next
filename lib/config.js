const BROKEN_BACKEND_HOST = 'teamblender-backend-qxe5-production.up.railway.app';

function normalizeApiBase(rawValue) {
  const candidate = String(rawValue || '/api').trim();
  if (!candidate) return '/api';

  const normalized = candidate.replace(/\/$/, '');

  // Temporary safety net: keep production live while DNS/backend naming catches up.
  if (normalized.includes(BROKEN_BACKEND_HOST)) {
    return '/api';
  }

  return normalized;
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);

export const BACKEND_ORIGIN = API_BASE.replace(/\/api$/, '');

export function getApiUrl(path) {
  const normalized = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN;
}
