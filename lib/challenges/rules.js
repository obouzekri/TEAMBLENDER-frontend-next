import { normalizeLocale } from '@/lib/i18n/routing';

const DEFAULT_RULES_FALLBACK = Object.freeze({
  objective: 'Review the rules for this challenge before starting.',
  facilitator: [],
  participant: [],
  footnote: ''
});

function normalizeRuleText(value) {
  const text = String(value || '').trim().replace(/'/g, '’');

  if (!text) {
    return '';
  }

  return /[.!?…:]$/.test(text) ? text : `${text}.`;
}

function resolveLocalizedValue(value, locale) {
  if (value == null) return value;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const localized = value[locale] ?? value.fr ?? value.en;
    return localized == null ? value : localized;
  }

  return value;
}

function sanitizeRuleList(list, fallback) {
  const source = Array.isArray(list) && list.length > 0 ? list : fallback;
  return source
    .map((item) => normalizeRuleText(item))
    .filter(Boolean);
}

export function resolveChallengeRules(config, fallback = DEFAULT_RULES_FALLBACK, localeInput = 'fr') {
  const locale = normalizeLocale(localeInput);
  const source = config && typeof config === 'object' && config.rules && typeof config.rules === 'object'
    ? config.rules
    : {};

  const fallbackObjective = normalizeRuleText(resolveLocalizedValue(fallback?.objective, locale) || '');
  const fallbackFacilitator = resolveLocalizedValue(fallback?.facilitator, locale);
  const fallbackParticipant = resolveLocalizedValue(fallback?.participant, locale);
  const fallbackFootnote = normalizeRuleText(resolveLocalizedValue(fallback?.footnote, locale) || '');

  const normalizedFallbackFacilitator = Array.isArray(fallbackFacilitator) ? fallbackFacilitator : [];
  const normalizedFallbackParticipant = Array.isArray(fallbackParticipant) ? fallbackParticipant : [];

  const sourceFacilitator = resolveLocalizedValue(source.facilitator, locale);
  const sourceParticipant = resolveLocalizedValue(source.participant, locale);
  const sourceObjective = resolveLocalizedValue(source.objective, locale);
  const sourceFootnote = resolveLocalizedValue(source.footnote, locale);

  const facilitator = sanitizeRuleList(sourceFacilitator, normalizedFallbackFacilitator);

  const participant = sanitizeRuleList(sourceParticipant, normalizedFallbackParticipant);

  return {
    objective: normalizeRuleText(sourceObjective || fallbackObjective),
    facilitator,
    participant,
    footnote: normalizeRuleText(sourceFootnote || fallbackFootnote),
  };
}
