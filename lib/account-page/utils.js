// Account page helpers: display names, local plan history, date and number formatting.
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
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatCount(value, locale = 'fr') {
  const numberValue = Number(value || 0);
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR').format(numberValue);
}

export function normalizeDepartmentDisplay(value) {
  const text = String(value || '').trim();
  if (text.toLowerCase() === 'human ressource') return 'Ressources humaines';
  return text;
}
