const PRODUCTION_SITE_URL = 'https://www.teamblender.io';
const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function normalizeSiteOrigin(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  try {
    const parsed = new URL(value);
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function getPublicSiteOrigin() {
  const configured = normalizeSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (!configured) return PRODUCTION_SITE_URL;

  const hostname = new URL(configured).hostname.toLowerCase();
  const isLocalhost = LOCALHOST_HOSTS.has(hostname);
  const isDevelopment = process.env.NODE_ENV === 'development';

  return isLocalhost && !isDevelopment ? PRODUCTION_SITE_URL : configured;
}

export const socialPreviewImage = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'TeamBlender - sessions collaboratives pour managers et RH',
  type: 'image/png',
};
