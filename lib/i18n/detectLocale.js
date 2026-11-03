import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './routing.js';

export const LOCALE_COOKIE = 'tb_locale';

// Pays où le français est langue officielle ou d'usage courant.
const FRENCH_SPEAKING_COUNTRIES = new Set([
  'FR', 'BE', 'CH', 'LU', 'MC', 'CA',
  'MA', 'DZ', 'TN',
  'SN', 'CI', 'ML', 'BF', 'NE', 'GN', 'BJ', 'TG', 'CM', 'GA', 'CG', 'CD', 'CF', 'TD', 'MG', 'DJ', 'KM', 'BI', 'RW',
  'HT', 'GP', 'MQ', 'GF', 'RE', 'YT', 'PM', 'BL', 'MF', 'NC', 'PF', 'WF',
]);

const COUNTRY_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry'];

const BOT_USER_AGENT = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|lighthouse|headless/i;

export function parseAcceptLanguage(header) {
  return String(header || '')
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { language: tag.trim().toLowerCase().split('-')[0], q: Number.isFinite(q) ? q : 0, index };
    })
    .filter(({ language, q }) => language && language !== '*' && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ language }) => language);
}

export function localeFromAcceptLanguage(header) {
  return parseAcceptLanguage(header).find((language) => SUPPORTED_LOCALES.includes(language)) || null;
}

export function localeFromCountry(country) {
  const code = String(country || '').trim().toUpperCase();
  // XX / T1 : valeurs Cloudflare pour pays inconnu / Tor.
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null;
  return FRENCH_SPEAKING_COUNTRIES.has(code) ? 'fr' : 'en';
}

export function isBotUserAgent(userAgent) {
  return BOT_USER_AGENT.test(String(userAgent || ''));
}

/**
 * Ordre : choix manuel (cookie) > Accept-Language > pays de l'IP > FR.
 * @param {{ cookie?: string, acceptLanguage?: string, country?: string }} input
 */
export function resolveLocale({ cookie, acceptLanguage, country } = {}) {
  const fromCookie = String(cookie || '').trim().toLowerCase();
  if (SUPPORTED_LOCALES.includes(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage(acceptLanguage) || localeFromCountry(country) || DEFAULT_LOCALE;
}

export function resolveRequestLocale(request) {
  const country = COUNTRY_HEADERS.map((name) => request.headers.get(name)).find(Boolean);
  return resolveLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
    country,
  });
}
