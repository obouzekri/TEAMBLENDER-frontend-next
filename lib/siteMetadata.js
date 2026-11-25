import { DEFAULT_LOCALE, normalizeLocale } from './i18n/routing.js';
import { translate } from './i18n/index.js';

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

// Image de partage d'une page publique, dans sa langue (route app/social-preview/[image]).
export function getSocialPreviewImage(locale = DEFAULT_LOCALE) {
  const siteOrigin = getPublicSiteOrigin();
  const imageLocale = normalizeLocale(locale);
  return {
    url: `${siteOrigin}/social-preview/${imageLocale}.png`,
    width: 1200,
    height: 630,
    alt: translate(imageLocale, 'shell.socialPreviewAlt'),
    type: 'image/png',
  };
}
