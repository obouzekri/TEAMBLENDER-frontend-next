import { normalizeLocale } from '@/lib/i18n/routing';
import { getDictionary } from '@/lib/i18n';

export const CROSSWORD_RULES_PRESET_KEY = 'crossword';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getCrosswordRulesPreset(localeInput = 'fr') {
  const node = getDictionary(normalizeLocale(localeInput))?.challengeRules?.[CROSSWORD_RULES_PRESET_KEY] || {};
  return {
    challengeName: String(node.challengeName || '').trim(),
    objective: String(node.objective || '').trim(),
    facilitator: asArray(node.facilitator),
    participant: asArray(node.participant),
    footnote: String(node.footnote || '').trim(),
  };
}
