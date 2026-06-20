import { normalizeLocale } from '@/lib/i18n/routing';
import { getDictionary } from '@/lib/i18n';

export const THE_QUIZ_RULES_PRESET_KEY = 'theQuiz';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getTheQuizRulesPreset(localeInput = 'fr') {
  const locale = normalizeLocale(localeInput);
  const dictionary = getDictionary(locale);
  const node = dictionary?.challengeRules?.[THE_QUIZ_RULES_PRESET_KEY] || {};

  return {
    key: THE_QUIZ_RULES_PRESET_KEY,
    challengeName: String(node?.challengeName || '').trim(),
    subtitle: String(node?.subtitle || '').trim(),
    objective: String(node?.objective || '').trim(),
    participants: {
      min: String(node?.participants?.min || '').trim(),
      recommended: String(node?.participants?.recommended || '').trim(),
      max: String(node?.participants?.max || '').trim(),
    },
    facilitator: asArray(node?.facilitator),
    participant: asArray(node?.participant),
    scoring: asArray(node?.scoring),
    footnote: String(node?.footnote || '').trim(),
  };
}

export default getTheQuizRulesPreset;