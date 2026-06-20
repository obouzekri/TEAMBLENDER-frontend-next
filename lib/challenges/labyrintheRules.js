import { normalizeLocale } from '@/lib/i18n/routing';
import { getDictionary } from '@/lib/i18n';

export const LABYRINTHE_RULES_PRESET_KEY = 'labyrintheSignals';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mergeUniqueStrings(base, extra) {
  const merged = [...asArray(base), ...asArray(extra)];
  const seen = new Set();
  return merged
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export function getLabyrintheRulesPreset(localeInput = 'fr') {
  const locale = normalizeLocale(localeInput);
  const dictionary = getDictionary(locale);
  const node = dictionary?.challengeRules?.[LABYRINTHE_RULES_PRESET_KEY] || {};

  return {
    key: LABYRINTHE_RULES_PRESET_KEY,
    challengeName: String(node?.challengeName || '').trim(),
    objective: String(node?.objective || '').trim(),
    participants: {
      min: String(node?.participants?.min || '').trim(),
      recommended: String(node?.participants?.recommended || '').trim(),
      max: String(node?.participants?.max || '').trim(),
    },
    facilitator: asArray(node?.facilitator),
    participant: asArray(node?.participant),
    footnote: String(node?.footnote || '').trim(),
  };
}

export function buildLabyrintheRulesForEngineConfig(localeInput = 'fr') {
  const preset = getLabyrintheRulesPreset(localeInput);

  return {
    objective: preset.objective,
    facilitator: mergeUniqueStrings([
      `Participants - min: ${preset.participants.min}`,
      `Participants - recommended: ${preset.participants.recommended}`,
      `Participants - max: ${preset.participants.max}`,
    ], preset.facilitator),
    participant: preset.participant,
    footnote: preset.footnote,
  };
}

export default getLabyrintheRulesPreset;
