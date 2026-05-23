const DEFAULT_RULES_FALLBACK = Object.freeze({
  objective: 'Consultez les regles de ce challenge avant de demarrer.',
  facilitator: [],
  participant: [],
  footnote: ''
});

export function resolveChallengeRules(config, fallback = DEFAULT_RULES_FALLBACK) {
  const source = config && typeof config === 'object' && config.rules && typeof config.rules === 'object'
    ? config.rules
    : {};

  const fallbackObjective = String(fallback?.objective || '').trim();
  const fallbackFacilitator = Array.isArray(fallback?.facilitator) ? fallback.facilitator : [];
  const fallbackParticipant = Array.isArray(fallback?.participant) ? fallback.participant : [];
  const fallbackFootnote = String(fallback?.footnote || '').trim();

  const facilitator = Array.isArray(source.facilitator) && source.facilitator.length > 0
    ? source.facilitator.map((item) => String(item || '').trim()).filter(Boolean)
    : fallbackFacilitator;

  const participant = Array.isArray(source.participant) && source.participant.length > 0
    ? source.participant.map((item) => String(item || '').trim()).filter(Boolean)
    : fallbackParticipant;

  return {
    objective: String(source.objective || fallbackObjective).trim(),
    facilitator,
    participant,
    footnote: String(source.footnote || fallbackFootnote).trim(),
  };
}
