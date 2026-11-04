import { getLocaleMeta } from './routing.js';

// Formatage dépendant de la langue : ne jamais écrire 'fr-FR' / 'en-US' en dur ailleurs.

// Équivalents des formats par défaut de toLocaleString() / toLocaleTimeString().
export const NUMERIC_DATE_TIME = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
export const NUMERIC_TIME = { hour: 'numeric', minute: 'numeric', second: 'numeric' };

export function formatDate(value, locale, options = { dateStyle: 'medium' }) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getLocaleMeta(locale).intl, options).format(date);
}

export function formatDateTime(value, locale, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  return formatDate(value, locale, options);
}

export function formatTime(value, locale, options = { timeStyle: 'medium' }) {
  return formatDate(value, locale, options);
}

export function formatNumber(value, locale, options) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(getLocaleMeta(locale).intl, options).format(number);
}

export function formatCurrency(value, locale, currency = 'EUR', options = {}) {
  return formatNumber(value, locale, { style: 'currency', currency, ...options });
}
