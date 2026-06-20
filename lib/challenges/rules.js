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

function isLocalizedRuleObject(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && (
      Object.prototype.hasOwnProperty.call(value, 'fr')
      || Object.prototype.hasOwnProperty.call(value, 'en')
    )
  );
}

function resolveLocalizedValue(value, locale) {
  if (value == null) return value;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const hasFr = Object.prototype.hasOwnProperty.call(value, 'fr');
    const hasEn = Object.prototype.hasOwnProperty.call(value, 'en');

    if (Object.prototype.hasOwnProperty.call(value, locale)) {
      return value[locale];
    }

    // Do not force French text when English is requested but missing.
    // This allows per-challenge localized fallbacks to take over.
    if (locale === 'en' && hasFr && !hasEn) {
      return undefined;
    }

    const localized = value.fr ?? value.en;
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
  const hasPresetKey = String(source?.preset_key || '').trim().length > 0;
  const preferFallbackPreset = hasPresetKey && fallback && typeof fallback === 'object';

  const fallbackObjective = normalizeRuleText(resolveLocalizedValue(fallback?.objective, locale) || '');
  const fallbackFacilitator = resolveLocalizedValue(fallback?.facilitator, locale);
  const fallbackParticipant = resolveLocalizedValue(fallback?.participant, locale);
  const fallbackFootnote = normalizeRuleText(resolveLocalizedValue(fallback?.footnote, locale) || '');

  const normalizedFallbackFacilitator = Array.isArray(fallbackFacilitator) ? fallbackFacilitator : [];
  const normalizedFallbackParticipant = Array.isArray(fallbackParticipant) ? fallbackParticipant : [];

  // Legacy challenge configs often store FR-only plain strings/arrays.
  // For EN locale, ignore non-localized source values and rely on localized fallbacks.
  const shouldIgnoreLegacySourceForEn = locale === 'en';
  const sourceFacilitator = preferFallbackPreset
    ? undefined
    : shouldIgnoreLegacySourceForEn && !isLocalizedRuleObject(source.facilitator)
    ? undefined
    : resolveLocalizedValue(source.facilitator, locale);
  const sourceParticipant = preferFallbackPreset
    ? undefined
    : shouldIgnoreLegacySourceForEn && !isLocalizedRuleObject(source.participant)
    ? undefined
    : resolveLocalizedValue(source.participant, locale);
  const sourceObjective = preferFallbackPreset
    ? undefined
    : shouldIgnoreLegacySourceForEn && !isLocalizedRuleObject(source.objective)
    ? undefined
    : resolveLocalizedValue(source.objective, locale);
  const sourceFootnote = preferFallbackPreset
    ? undefined
    : shouldIgnoreLegacySourceForEn && !isLocalizedRuleObject(source.footnote)
    ? undefined
    : resolveLocalizedValue(source.footnote, locale);

  const facilitator = sanitizeRuleList(sourceFacilitator, normalizedFallbackFacilitator);

  const participant = sanitizeRuleList(sourceParticipant, normalizedFallbackParticipant);

  return {
    objective: normalizeRuleText(sourceObjective || fallbackObjective),
    facilitator,
    participant,
    footnote: normalizeRuleText(sourceFootnote || fallbackFootnote),
  };
}
