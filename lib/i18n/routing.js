// Seule source de vérité pour les langues : ajouter une langue ici, puis son dictionnaire.
// `intl` : locale passée à Intl (dates, nombres, devises). `ogLocale` : format Open Graph.
// `currencySymbolFirst` : « $390 » plutôt que « 390 $ » dans les prix affichés à la main.
// `beta` : langue masquée (routes, sélecteur, détection, SEO) tant que NEXT_PUBLIC_ENABLED_BETA_LOCALES
// ne la cite pas (ex. « ar »), le temps de terminer les parcours manager et participant.
// Arabe : chiffres occidentaux (-u-nu-latn) plutôt que les chiffres arabes orientaux par défaut d'Intl.
export const LOCALE_META = {
  fr: { name: 'Français', dir: 'ltr', intl: 'fr-FR', ogLocale: 'fr_FR', currencySymbolFirst: false },
  en: { name: 'English', dir: 'ltr', intl: 'en-US', ogLocale: 'en_US', currencySymbolFirst: true },
  ar: { name: 'العربية', dir: 'rtl', intl: 'ar-u-nu-latn', ogLocale: 'ar_AR', currencySymbolFirst: false, beta: true },
};

// Toutes les langues qui ont un dictionnaire (vérifiées par lint:i18n), activées ou non.
export const ALL_LOCALES = Object.keys(LOCALE_META);

const ENABLED_BETA_LOCALES = String(process.env.NEXT_PUBLIC_ENABLED_BETA_LOCALES || '')
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);

export const SUPPORTED_LOCALES = ALL_LOCALES.filter(
  (locale) => !LOCALE_META[locale].beta || ENABLED_BETA_LOCALES.includes(locale),
);
export const DEFAULT_LOCALE = 'fr';

export function normalizeLocale(input) {
  const value = String(input || '').trim().toLowerCase();
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function getLocaleMeta(locale) {
  return LOCALE_META[normalizeLocale(locale)];
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
