import fr from './dictionaries/fr';
import en from './dictionaries/en';
import { DEFAULT_LOCALE, normalizeLocale } from './routing';

const DICTIONARIES = { fr, en };

function getByPath(source, key) {
  const parts = String(key || '').split('.').filter(Boolean);
  let current = source;
  for (let i = 0; i < parts.length; i += 1) {
    if (current == null || typeof current !== 'object' || !(parts[i] in current)) {
      return undefined;
    }
    current = current[parts[i]];
  }
  return current;
}

function interpolate(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params?.[token] ?? `{${token}}`));
}

export function createTranslator(locale) {
  const resolvedLocale = normalizeLocale(locale);
  const active = DICTIONARIES[resolvedLocale] || DICTIONARIES[DEFAULT_LOCALE];
  const fallback = DICTIONARIES[DEFAULT_LOCALE];

  return function t(key, params = {}) {
    const hit = getByPath(active, key);
    const base = hit ?? getByPath(fallback, key) ?? key;
    return interpolate(base, params);
  };
}

const translators = new Map();

// Hors composant React (helpers, pages serveur) ou quand la langue n'est pas celle de l'interface
// (langue de jeu d'une session) : translate(locale, key, params).
export function translate(locale, key, params) {
  const resolvedLocale = normalizeLocale(locale);
  if (!translators.has(resolvedLocale)) translators.set(resolvedLocale, createTranslator(resolvedLocale));
  return translators.get(resolvedLocale)(key, params);
}

export function getDictionary(locale) {
  return DICTIONARIES[normalizeLocale(locale)] || DICTIONARIES[DEFAULT_LOCALE];
}
