const LEGACY_BACKEND_HOSTS = [
  'teamblender-backend-qxe5-production.up.railway.app',
  'teamspark-backend-qxe5-production.up.railway.app',
];

const FRONTEND_PUBLIC_HOSTS = [
  'teamblender.io',
  'www.teamblender.io',
];

const PRODUCTION_BACKEND_ORIGIN = 'https://teamblender-backend-qxe5-production.up.railway.app';

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

function isFrontendPublicHost(rawValue) {
  const normalized = normalizeBackendOrigin(rawValue).toLowerCase();
  if (!normalized) return false;
  return FRONTEND_PUBLIC_HOSTS.some((host) => normalized.includes(host));
}

function resolveApiBaseWithPublicBackend(rawApiBase) {
  const normalizedApiBase = normalizeApiBase(rawApiBase);
  if (normalizedApiBase !== '/api') {
    return normalizedApiBase;
  }

  const preferredBackendOrigin = normalizeBackendOrigin(
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN
      || process.env.BACKEND_ORIGIN
      || process.env.NEXT_BACKEND_ORIGIN
  );

  if (!preferredBackendOrigin || !/^https?:\/\//i.test(preferredBackendOrigin)) {
    // Only force the hardcoded production backend on real Vercel production runtime.
    // Local `next build && next start` sets NODE_ENV=production too, but should keep /api rewrites.
    const isVercelProductionRuntime = process.env.VERCEL_ENV === 'production';
    return isVercelProductionRuntime ? `${PRODUCTION_BACKEND_ORIGIN}/api` : normalizedApiBase;
  }

  // Prevent accidental same-host loops when frontend domain is configured as backend origin.
  if (isFrontendPublicHost(preferredBackendOrigin)) {
    return normalizedApiBase;
  }

  return `${preferredBackendOrigin}/api`;
}

function resolveBrowserApiFallback(apiBase) {
  if (typeof window === 'undefined') {
    return apiBase;
  }

  const host = String(window.location.hostname || '').toLowerCase();
  const isPublicFrontendHost = FRONTEND_PUBLIC_HOSTS.includes(host);
  if (!isPublicFrontendHost) {
    return apiBase;
  }

  // On public domains, keep browser requests same-origin and rely on
  // platform rewrites (/api -> backend) to avoid any browser CORS surface.
  if (apiBase === '/api') {
    return '/api';
  }

  // Normalize absolute frontend-domain API bases back to same-origin /api.
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      const parsed = new URL(apiBase);
      const parsedHost = String(parsed.hostname || '').toLowerCase();
      const isFrontendApiHost = FRONTEND_PUBLIC_HOSTS.includes(parsedHost);
      if (isFrontendApiHost && parsed.pathname.startsWith('/api')) {
        return '/api';
      }
    } catch {
      return apiBase;
    }
  }

  return apiBase;
}

const RESOLVED_API_BASE = resolveApiBaseWithPublicBackend(process.env.NEXT_PUBLIC_API_BASE);
export const API_BASE = resolveBrowserApiFallback(RESOLVED_API_BASE);

// Development switch: only enable challenge mock catalog when explicitly requested.
export const ENABLE_CHALLENGES_MOCK_DATA = parseBooleanFlag(
  process.env.NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA,
  false
);

export const BACKEND_ORIGIN = API_BASE.replace(/\/api$/, '');

function normalizeBackendOrigin(rawValue) {
  const candidate = String(rawValue || '').trim();
  if (!candidate) return '';
  const normalized = candidate.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
}

// Public origin used to resolve media assets (/uploads/*) when API_BASE is relative (e.g. /api).
const PUBLIC_BACKEND_ASSET_ORIGIN = normalizeBackendOrigin(
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN
);

export function normalizeBackendAssetUrl(rawValue) {
  const candidate = String(rawValue || '').trim();
  if (!candidate) return '';

  const browserHost = typeof window !== 'undefined'
    ? String(window.location.hostname || '').toLowerCase()
    : '';
  const isPublicFrontendHost = FRONTEND_PUBLIC_HOSTS.includes(browserHost);

  if (candidate.startsWith('/copuzzle/')) {
    return candidate;
  }

  if (candidate.startsWith('/uploads/')) {
    if (PUBLIC_BACKEND_ASSET_ORIGIN && /^https?:\/\//i.test(PUBLIC_BACKEND_ASSET_ORIGIN)) {
      return `${PUBLIC_BACKEND_ASSET_ORIGIN}${candidate}`;
    }
    if (BACKEND_ORIGIN && /^https?:\/\//i.test(BACKEND_ORIGIN)) {
      return `${BACKEND_ORIGIN}${candidate}`;
    }
    if (isPublicFrontendHost) {
      return `${PRODUCTION_BACKEND_ORIGIN}${candidate}`;
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

      const parsedHost = String(parsed.hostname || '').toLowerCase();
      const isFrontendAbsoluteAssetUrl = FRONTEND_PUBLIC_HOSTS.includes(parsedHost) && parsed.pathname.startsWith('/uploads/');
      if (isFrontendAbsoluteAssetUrl) {
        return `${PRODUCTION_BACKEND_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

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
  const fromUrl = String(payload?.url || '').trim();
  const fromPath = String(payload?.path || '').trim();
  return normalizeBackendAssetUrl(fromUrl || fromPath);
}

export function getApiUrl(path) {
  const normalized = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getBackendOrigin() {
  return BACKEND_ORIGIN;
}
