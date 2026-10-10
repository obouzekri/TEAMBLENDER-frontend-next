export const SESSION_OBJECTIVES = [
  'cohesion', 'communication', 'collaboration', 'leadership',
  'resolution-problemes', 'creativite', 'intelligence-collective',
];

export function parseChallengeDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim().toLowerCase();
  const values = (raw.match(/\d+(?:[.,]\d+)?/g) || [])
    .map((item) => Number.parseFloat(item.replace(',', '.')));
  if (!values.length) return 0;
  return values.length >= 2 && /-|to|à|au/.test(raw)
    ? (values[0] + values[1]) / 2
    : values[0];
}

export function getChallengeDuration(challenge) {
  return parseChallengeDuration(
    challenge?.duration ?? challenge?.config?.duration_minutes ?? challenge?.config?.duration,
  );
}

export function replaceProgramChallenge(proposal, challengeId, catalog, options) {
  const retained = proposal.challenges.filter((challenge) => challenge.id !== challengeId);
  const excluded = new Set(proposal.challenges.map((challenge) => challenge.engine_key || challenge.id));
  const remainingMinutes = options.targetMinutes - retained.reduce((sum, challenge) => sum + getChallengeDuration(challenge), 0);
  const replacement = proposeSessionProgram(
    catalog.filter((challenge) => !excluded.has(challenge.engine_key || challenge.id)),
    { ...options, targetMinutes: remainingMinutes },
  ).challenges[0];
  if (!replacement) return null;
  const challenges = proposal.challenges.map((challenge) => challenge.id === challengeId ? replacement : challenge);
  return { ...proposal, challenges, duration: challenges.reduce((sum, challenge) => sum + getChallengeDuration(challenge), 0) };
}

export function isValidExpectedCount(value) {
  return value === '' || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647);
}

function objectivesOf(challenge) {
  const value = challenge.objectives ?? challenge.objective ?? '';
  return (Array.isArray(value) ? value : String(value).split(','))
    .map((item) => String(item).trim());
}

export function proposeSessionProgram(challenges, {
  objective = '', expectedCount = '', targetMinutes = 45, resolveRange, availableEngineKeys, random = Math.random,
} = {}) {
  if (!Number.isInteger(targetMinutes) || targetMinutes < 1) throw new Error('Invalid target duration');
  if (!isValidExpectedCount(expectedCount)) throw new Error('Invalid expected participant count');
  const count = expectedCount === '' ? null : Number(expectedCount);
  const seen = new Set();
  const eligible = challenges.filter((challenge) => {
    const identity = challenge.engine_key || challenge.id;
    if (!identity || seen.has(identity)) return false;
    if (challenge.status && challenge.status !== 'actif') return false;
    if (!challenge.engine_key) return false;
    if (availableEngineKeys && !availableEngineKeys.includes(challenge.engine_key)) return false;
    if (objective && !objectivesOf(challenge).includes(objective)) return false;
    const duration = getChallengeDuration(challenge);
    if (duration <= 0 || duration > targetMinutes) return false;
    const range = resolveRange ? resolveRange(challenge) : {};
    const min = challenge.engine_key === 'crossword_live_v1' ? 2 : range.min;
    const max = challenge.engine_key === 'crossword_live_v1' ? 5 : range.max;
    if (count !== null && ((min && count < min) || (max && count > max))) return false;
    seen.add(identity);
    return true;
  });
  for (let index = eligible.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [eligible[index], eligible[target]] = [eligible[target], eligible[index]];
  }
  // Keep the most complete program within the budget; the shuffle varies equal-duration choices.
  const programs = new Map([[0, []]]);
  for (const challenge of eligible) {
    for (const [duration, program] of [...programs.entries()]) {
      const nextDuration = duration + getChallengeDuration(challenge);
      if (nextDuration <= targetMinutes && !programs.has(nextDuration)) {
        programs.set(nextDuration, [...program, challenge]);
      }
    }
  }
  const duration = Math.max(...programs.keys());
  return { challenges: programs.get(duration), duration, eligibleCount: eligible.length };
}
