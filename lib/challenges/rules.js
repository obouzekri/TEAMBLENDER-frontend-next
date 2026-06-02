const DEFAULT_RULES_FALLBACK = Object.freeze({
  objective: 'Consultez les règles de ce challenge avant de démarrer.',
  facilitator: [],
  participant: [],
  footnote: ''
});

const LAUNCH_COPY_PATTERN = /(?:^|\b)(?:dès le lancement|des le lancement|une fois le chrono lanc|une fois le timer lanc|le jeu démarre|le jeu demarre|lancement du jeu|au démarrage du jeu|au demarrage du jeu)(?:\b|$)/i;

function normalizeFrenchRuleText(value) {
  const text = String(value || '')
    .trim()
    .replace(/'/g, '’')
    .replace(/\b[Ee]crire\b/g, 'Écrire')
    .replace(/\bequipe\b/gi, 'équipe')
    .replace(/\bequipes\b/gi, 'équipes')
    .replace(/\bregle\b/gi, 'règle')
    .replace(/\bregles\b/gi, 'règles')
    .replace(/\btimer\b/gi, 'chrono')
    .replace(/\bdemarrer\b/gi, 'démarrer');

  if (!text) {
    return '';
  }

  return /[.!?…:]$/.test(text) ? text : `${text}.`;
}

function sanitizeRuleList(list, fallback) {
  const source = Array.isArray(list) && list.length > 0 ? list : fallback;
  return source
    .map((item) => normalizeFrenchRuleText(item))
    .filter(Boolean)
    .filter((item) => !LAUNCH_COPY_PATTERN.test(item));
}

export function resolveChallengeRules(config, fallback = DEFAULT_RULES_FALLBACK) {
  const source = config && typeof config === 'object' && config.rules && typeof config.rules === 'object'
    ? config.rules
    : {};

  const fallbackObjective = normalizeFrenchRuleText(fallback?.objective || '');
  const fallbackFacilitator = Array.isArray(fallback?.facilitator) ? fallback.facilitator : [];
  const fallbackParticipant = Array.isArray(fallback?.participant) ? fallback.participant : [];
  const fallbackFootnote = normalizeFrenchRuleText(fallback?.footnote || '');

  const facilitator = sanitizeRuleList(source.facilitator, fallbackFacilitator);

  const participant = sanitizeRuleList(source.participant, fallbackParticipant);

  return {
    objective: normalizeFrenchRuleText(source.objective || fallbackObjective),
    facilitator,
    participant,
    footnote: normalizeFrenchRuleText(source.footnote || fallbackFootnote),
  };
}
