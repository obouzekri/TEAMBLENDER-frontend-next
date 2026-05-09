export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');

export const BACKEND_ORIGIN = API_BASE.replace(/\/api$/, '');

export function getApiUrl(path) {
  const normalized = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN;
}
