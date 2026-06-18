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

function sanitizeRuleList(list, fallback) {
  const source = Array.isArray(list) && list.length > 0 ? list : fallback;
  return source
    .map((item) => normalizeRuleText(item))
    .filter(Boolean);
}

export function resolveChallengeRules(config, fallback = DEFAULT_RULES_FALLBACK) {
  const source = config && typeof config === 'object' && config.rules && typeof config.rules === 'object'
    ? config.rules
    : {};

  const fallbackObjective = normalizeRuleText(fallback?.objective || '');
  const fallbackFacilitator = Array.isArray(fallback?.facilitator) ? fallback.facilitator : [];
  const fallbackParticipant = Array.isArray(fallback?.participant) ? fallback.participant : [];
  const fallbackFootnote = normalizeRuleText(fallback?.footnote || '');

  const facilitator = sanitizeRuleList(source.facilitator, fallbackFacilitator);

  const participant = sanitizeRuleList(source.participant, fallbackParticipant);

  return {
    objective: normalizeRuleText(source.objective || fallbackObjective),
    facilitator,
    participant,
    footnote: normalizeRuleText(source.footnote || fallbackFootnote),
  };
}
