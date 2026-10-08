import assert from 'node:assert/strict';
import { getQuizRankingStatus, normalizeQuizAnswerIndex, shouldIgnoreQuizShortcut } from '../lib/challenges/quiz-utils.js';
import {
  applyDisplayPreferences,
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_KEY,
  readDisplayPreferences,
  saveDisplayPreferences,
} from '../lib/display-preferences.js';
import { fetchSessionResults } from '../lib/session-results.js';

for (const value of [null, undefined, '', ' ', false, true, [], {}, NaN, -1, 4, 1.5, '1.5']) {
  assert.equal(normalizeQuizAnswerIndex(value), null, `Invalid answer ${String(value)}`);
}
for (const index of [0, 1, 2, 3]) {
  assert.equal(normalizeQuizAnswerIndex(index), index);
  assert.equal(normalizeQuizAnswerIndex(String(index)), index);
}
assert.equal(normalizeQuizAnswerIndex(2, 2), null);
assert.equal(getQuizRankingStatus([], 'question_live'), 'pending');
assert.equal(getQuizRankingStatus([], 'final_score'), 'empty');
assert.equal(getQuizRankingStatus(undefined, 'final_score'), 'unavailable');
assert.equal(getQuizRankingStatus(undefined, 'lobby', { waiting: true }), 'pending');
assert.equal(getQuizRankingStatus([{ score: 0 }], 'question_live'), 'ready');
assert.equal(getQuizRankingStatus([], 'question_live', { unavailable: true }), 'unavailable');
for (const flag of ['defaultPrevented', 'isComposing', 'repeat', 'ctrlKey', 'altKey', 'metaKey', 'shiftKey']) {
  assert.ok(shouldIgnoreQuizShortcut({ [flag]: true }));
}
assert.ok(shouldIgnoreQuizShortcut({ target: { isContentEditable: true } }));
assert.ok(shouldIgnoreQuizShortcut({ target: { closest: () => ({}) } }));
assert.equal(shouldIgnoreQuizShortcut({ target: { closest: () => null } }), false);

const values = new Map();
const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
assert.deepEqual(readDisplayPreferences(storage), DEFAULT_DISPLAY_PREFERENCES);
const preferences = { compactNavigation: true, highContrast: true };
assert.deepEqual(saveDisplayPreferences(preferences, storage), preferences);
assert.deepEqual(readDisplayPreferences(storage), preferences);
const root = { dataset: {} };
applyDisplayPreferences(readDisplayPreferences(storage), root);
assert.deepEqual(root.dataset, { compactNavigation: 'true', highContrast: 'true' });
assert.throws(() => saveDisplayPreferences(preferences, { setItem() { throw new Error('Storage denied'); } }), /Storage denied/);
values.set(DISPLAY_PREFERENCES_KEY, '{}');
assert.throws(() => readDisplayPreferences(storage), /Invalid display preferences/);
values.set(DISPLAY_PREFERENCES_KEY, 'not-json');
assert.throws(() => readDisplayPreferences(storage), SyntaxError);

const payloads = [{ id: 42 }, { data: [] }, { data: { rate: 0 } }, { data: { answer_submissions: 0 } }];
const options = { sessionId: 42, getApiUrl: (path) => path, headers: {}, isEn: false };
function fixtureFetch({ failureIndex = -1, malformedIndex = -1, invalidJsonIndex = -1 } = {}) {
  let index = 0;
  return async () => {
    const current = index++;
    return {
      ok: current !== failureIndex,
      status: current === failureIndex ? 503 : 200,
      json: async () => {
        if (current === invalidJsonIndex) throw new SyntaxError('Invalid JSON');
        return current === malformedIndex ? {} : payloads[current];
      },
    };
  };
}
assert.deepEqual(await fetchSessionResults({ ...options, fetchImpl: fixtureFetch() }), {
  session: { id: 42 }, results: [], participationRate: { rate: 0 }, kpis: { answer_submissions: 0 },
});
for (const failureIndex of [0, 1, 2, 3]) {
  await assert.rejects(fetchSessionResults({ ...options, fetchImpl: fixtureFetch({ failureIndex }) }), /HTTP 503/);
}
for (const malformedIndex of [0, 1, 2, 3]) {
  await assert.rejects(fetchSessionResults({ ...options, fetchImpl: fixtureFetch({ malformedIndex }) }), /réponse serveur invalide/);
}
await assert.rejects(fetchSessionResults({ ...options, fetchImpl: fixtureFetch({ invalidJsonIndex: 1 }) }), /Invalid JSON/);
await assert.rejects(fetchSessionResults({ ...options, fetchImpl: async () => { throw new Error('Network down'); } }), /Network down/);
console.log('TEST_PLATFORM_TRUTHFULNESS_OK');
