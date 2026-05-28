const LEGACY_BACKEND_HOSTS = [
  'teamblender-backend-qxe5-production.up.railway.app',
  'teamspark-backend-qxe5-production.up.railway.app',
];

function isLegacyBackendHost(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return false;
  return LEGACY_BACKEND_HOSTS.some((host) => raw.includes(host));
}

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

  // Safety net: fallback to same-origin rewrites when legacy backend host is configured.
  if (isLegacyBackendHost(normalized)) {
    return '/api';
  }

  // If a relative path is provided (e.g. "api"), force absolute-from-root
  // to avoid resolving against the current route (e.g. /session-builder/api).
  const normalizedWithLeadingSlash =
    normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/')
      ? normalized
      : `/${normalized}`;

  if (normalizedWithLeadingSlash === '/api') return '/api';

  return normalizedWithLeadingSlash;
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);

// Development switch: only enable challenge mock catalog when explicitly requested.
export const ENABLE_CHALLENGES_MOCK_DATA = parseBooleanFlag(
  process.env.NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA,
  false
);

export const BACKEND_ORIGIN = API_BASE.replace(/\/api$/, '');

export function normalizeBackendAssetUrl(rawValue) {
  const candidate = String(rawValue || '').trim();
  if (!candidate) return '';

  if (candidate.startsWith('/copuzzle/')) {
    return candidate;
  }

  if (candidate.startsWith('/uploads/')) {
    if (BACKEND_ORIGIN && /^https?:\/\//i.test(BACKEND_ORIGIN)) {
      return `${BACKEND_ORIGIN}${candidate}`;
    }
    return candidate;
  }

  if (candidate.startsWith('uploads/')) {
    return normalizeBackendAssetUrl(`/${candidate}`);
  }

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      const normalizedProtocol = parsed.protocol === 'http:' ? 'https:' : parsed.protocol;
      const normalizedAbsolute = `${normalizedProtocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;

      if (parsed.pathname.startsWith('/uploads/') && isLegacyBackendHost(parsed.host)) {
        if (BACKEND_ORIGIN && /^https?:\/\//i.test(BACKEND_ORIGIN)) {
          return `${BACKEND_ORIGIN}${parsed.pathname}`;
        }
        return parsed.pathname;
      }

      return normalizedAbsolute;
    } catch {
      return candidate;
    }
  }

  return candidate;
}

export function normalizeUploadResultUrl(payload) {
  const fromPath = String(payload?.path || '').trim();
  const fromUrl = String(payload?.url || '').trim();
  return normalizeBackendAssetUrl(fromPath || fromUrl);
}

export function getApiUrl(path) {
  const normalized = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN;
}
