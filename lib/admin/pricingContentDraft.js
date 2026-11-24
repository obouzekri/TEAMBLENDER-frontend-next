// Pricing plan `localized_content` <-> admin editor draft. Pure functions, importable from Node tests.
import { PRICING_LOCALIZED_TEXT_FIELDS } from '../pricing-plan-content.js';

// Admin editor state for `localized_content`: one string per field, features as one line per item.
// The original entries are kept so keys the editor does not know about survive a save.
export function localizedContentToDraft(localizedContent) {
  const source = localizedContent && typeof localizedContent === 'object' && !Array.isArray(localizedContent)
    ? localizedContent
    : {};
  const localized = {};
  Object.entries(source).forEach(([locale, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const draft = {};
    PRICING_LOCALIZED_TEXT_FIELDS.forEach((field) => {
      draft[field] = typeof entry[field] === 'string' ? entry[field] : '';
    });
    draft.features = Array.isArray(entry.features) ? entry.features.join('\n') : '';
    localized[locale] = draft;
  });
  return { localized, localized_original: source };
}

export function buildLocalizedContentFromDraft(draft) {
  const original = draft?.localized_original && typeof draft.localized_original === 'object'
    ? draft.localized_original
    : {};
  const edited = draft?.localized && typeof draft.localized === 'object' ? draft.localized : {};
  const result = {};
  const locales = new Set([...Object.keys(original), ...Object.keys(edited)]);
  locales.forEach((locale) => {
    const entry = { ...(original[locale] && typeof original[locale] === 'object' ? original[locale] : {}) };
    const fields = edited[locale];
    if (fields) {
      PRICING_LOCALIZED_TEXT_FIELDS.forEach((field) => {
        const value = String(fields[field] ?? '').trim();
        if (value) entry[field] = value;
        else delete entry[field];
      });
      const features = String(fields.features ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (features.length > 0) entry.features = features;
      else delete entry.features;
    }
    if (Object.keys(entry).length > 0) result[locale] = entry;
  });
  return result;
}
