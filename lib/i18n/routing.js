export const SUPPORTED_LOCALES = ['fr', 'en'];
export const DEFAULT_LOCALE = 'fr';

export function normalizeLocale(input) {
  const value = String(input || '').trim().toLowerCase();
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function detectLocaleFromPathname(pathname) {
  const path = String(pathname || '/');
  const segment = path.split('/').filter(Boolean)[0] || '';
  return normalizeLocale(segment);
}

export function stripLocaleFromPath(pathname) {
  const path = String(pathname || '/');
  const parts = path.split('/');
  const first = String(parts[1] || '').toLowerCase();
  if (SUPPORTED_LOCALES.includes(first)) {
    const stripped = `/${parts.slice(2).join('/')}`;
    return stripped === '/' ? '/' : stripped.replace(/\/+$/, '') || '/';
  }
  return path || '/';
}

export function withLocalePath(locale, href) {
  const normalizedLocale = normalizeLocale(locale);
  const raw = String(href || '/').trim() || '/';

  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
    return raw;
  }

  const [pathPart, query = ''] = raw.split('?');
  const cleanPath = stripLocaleFromPath(pathPart || '/');
  const withPrefix = cleanPath === '/'
    ? `/${normalizedLocale}`
    : `/${normalizedLocale}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;

  return query ? `${withPrefix}?${query}` : withPrefix;
}
