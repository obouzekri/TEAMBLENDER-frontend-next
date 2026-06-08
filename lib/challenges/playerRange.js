function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const FALLBACK_RANGES_BY_NAME = Object.freeze({
  'copuzzle live': { min: 2, recommended: 4, max: 8 },
  'labyrinthe virtuel': { min: 2, recommended: 5, max: 10 },
  'enigme du tresor': { min: 3, recommended: 6, max: 12 },
  'quiz team': { min: 4, recommended: 8, max: 30 },
  'defi creation': { min: 3, recommended: 6, max: 14 },
  'resolution de conflit': { min: 3, recommended: 6, max: 14 },
  'debriefing structure': { min: 3, recommended: 8, max: 20 },
});

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function resolveChallengePlayerRange(challenge) {
  const participants = challenge?.engine_config?.participants && typeof challenge.engine_config.participants === 'object'
    ? challenge.engine_config.participants
    : challenge?.config?.participants && typeof challenge.config.participants === 'object'
      ? challenge.config.participants
      : {};

  const min = toPositiveInt(
    participants.min_count
      ?? participants.min
      ?? challenge?.min_team_size
      ?? challenge?.minPlayers
  );

  const max = toPositiveInt(
    participants.max_count
      ?? participants.max
      ?? challenge?.max_team_size
      ?? challenge?.maxPlayers
  );

  const explicitRecommended = toPositiveInt(
    participants.recommended_count
      ?? participants.recommended
      ?? participants.ideal_count
      ?? challenge?.recommended_team_size
      ?? challenge?.recommendedPlayers
  );

  const recommended = explicitRecommended
    || (min && max ? Math.round((min + max) / 2) : null)
    || min
    || max
    || toPositiveInt(FALLBACK_RANGES_BY_NAME[normalizeName(challenge?.name)]?.recommended)
    || null;

  const fallback = FALLBACK_RANGES_BY_NAME[normalizeName(challenge?.name)] || {};

  const resolvedMin = min || toPositiveInt(fallback.min);
  const resolvedMax = max || toPositiveInt(fallback.max);

  return {
    min: resolvedMin,
    recommended,
    max: resolvedMax,
    hasRange: Boolean(resolvedMin || recommended || resolvedMax),
  };
}

export function formatIdealPlayersLabel(challenge) {
  const range = resolveChallengePlayerRange(challenge);
  if (!range.recommended) return '';
  return `Ideal: ~${range.recommended} joueurs`;
}
