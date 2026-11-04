import { getLocaleMeta } from './routing.js';

// Pluriels selon les règles de chaque langue (Intl.PluralRules) : FR/EN ont 2 formes (one, other),
// l'arabe en a 6 (zero, one, two, few, many, other). Dans un dictionnaire :
//   participants: { one: '{count} participant', other: '{count} participants' }
// puis t('…participants', { count }). `other` est obligatoire et sert de forme de secours.
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const rulesCache = new Map();

export function isPluralValue(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && 'other' in value && Object.keys(value).every((key) => PLURAL_CATEGORIES.includes(key));
}

function getRules(locale) {
  const tag = getLocaleMeta(locale).intl;
  if (!rulesCache.has(tag)) rulesCache.set(tag, new Intl.PluralRules(tag));
  return rulesCache.get(tag);
}

export function pluralCategory(count, locale) {
  const number = Number(count);
  return Number.isFinite(number) ? getRules(locale).select(number) : 'other';
}

// Renvoie la forme adaptée si `value` est une valeur plurielle, sinon `value` inchangée.
export function selectPlural(value, count, locale) {
  if (!isPluralValue(value)) return value;
  return value[pluralCategory(count, locale)] ?? value.other;
}
