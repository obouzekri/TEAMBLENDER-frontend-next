import assert from 'node:assert/strict';
import { reorderChallenges } from '../lib/sessionBuilderOrder.mjs';

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
  const activities = [{ id: 1, config: { duration: 10 } }, { id: 2 }, { id: 3 }];
  const reordered = reorderChallenges(activities, 1, 3);
  assert.deepEqual(reordered.map((item) => item.id), [2, 3, 1]);
  assert.equal(reordered[2], activities[0]);
  assert.deepEqual(reorderChallenges(activities, 3, 1).map((item) => item.id), [3, 1, 2]);
  assert.deepEqual(activities.map((item) => item.id), [1, 2, 3]);
  assert.equal(reorderChallenges(activities, 1, 1), activities);
  assert.equal(reorderChallenges(activities, 99, 1), activities);
  assert.equal(reorderChallenges(activities, 1, 99), activities);
  assert.deepEqual(reorderChallenges([], 1, 2), []);
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
