import assert from 'node:assert/strict';

function parseChallengeDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) {
    return 0;
  }

  const numeric = raw.match(/\d+(?:[.,]\d+)?/g) || [];
  if (numeric.length === 0) {
    return 0;
  }

  const values = numeric.map((item) => Number.parseFloat(item.replace(',', '.'))).filter(Number.isFinite);
  if (values.length === 0) {
    return 0;
  }

  if (values.length >= 2 && /-|to|à|au/.test(raw)) {
    return values.slice(0, 2).reduce((sum, item) => sum + item, 0) / 2;
  }

  return values[0];
}

function getTotalDuration(selectedChallenges) {
  return selectedChallenges.reduce((sum, challenge) => {
    const configDuration = challenge?.config?.duration ?? challenge?.config?.duration_minutes;
    const challengeDuration = challenge?.duration ?? configDuration ?? 0;
    return sum + parseChallengeDuration(challengeDuration);
  }, 0);
}

function run() {
  assert.equal(parseChallengeDuration('20-30 min'), 25);
  assert.equal(parseChallengeDuration('10 à 20 min'), 15);
  assert.equal(parseChallengeDuration('12,5 min'), 12.5);
  assert.equal(parseChallengeDuration(undefined), 0);

  const total = getTotalDuration([
    { duration: '20-30 min' },
    { duration: 15 },
    { config: { duration_minutes: 10 } },
  ]);

  assert.equal(total, 50);
  console.log('TEST_SESSION_BUILDER_UTILS_OK');
}

run();
