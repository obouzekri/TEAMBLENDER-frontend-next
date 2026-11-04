// Account page helpers: display names, local plan history, date and number formatting.
import { formatDateTime, formatNumber } from '@/lib/i18n/format';

const PLAN_HISTORY_STORAGE_KEY = 'accountPlanChangeHistory';

export function normalizeDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = toNameTitleCase(user.first_name);
  const last = toNameTitleCase(user.last_name);
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

export function toNameTitleCase(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAN_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAN_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 15)));
}

export function formatDate(dateValue, locale = 'fr') {
  if (!dateValue) return '';
  return formatDateTime(dateValue, locale);
}

export function formatCount(value, locale = 'fr') {
  return formatNumber(value || 0, locale);
}

export function normalizeDepartmentDisplay(value) {
  const text = String(value || '').trim();
  if (text.toLowerCase() === 'human ressource') return 'Ressources humaines';
  return text;
}
