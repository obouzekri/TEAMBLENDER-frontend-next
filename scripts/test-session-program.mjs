import assert from 'node:assert/strict';
import { isValidExpectedCount, proposeSessionProgram, parseChallengeDuration, replaceProgramChallenge } from '../lib/sessionProgram.mjs';

const challenge = (id, duration, extra = {}) => ({
  id, engine_key: `engine_${id}`, duration, status: 'actif', objectives: 'collaboration, communication', ...extra,
});
const catalog = [
  challenge(1, 10), challenge(2, 20), challenge(3, 15),
  challenge(4, 10, { status: 'inactif' }),
  challenge(5, 5, { objectives: 'creativite' }),
  challenge(6, 0),
  challenge(7, 15, { engine_key: 'crossword_live_v1' }),
];
const options = { objective: 'collaboration', expectedCount: '6', targetMinutes: 30, random: () => 0.5 };
const result = proposeSessionProgram(catalog, options);
assert.equal(result.duration, 30);
assert.deepEqual(result.challenges.map((item) => item.id).sort(), [1, 2]);
assert.equal(catalog[0].id, 1);
assert.equal(proposeSessionProgram(catalog, { ...options, availableEngineKeys: ['engine_1'] }).challenges.length, 1);
const replaced = replaceProgramChallenge(result, 2, catalog, options);
assert.equal(replaced.challenges.length, 2);
assert.ok(replaced.duration <= 30);
assert.ok(!replaced.challenges.some((item) => item.id === 2));
assert.equal(replaceProgramChallenge(result, 2, result.challenges, options), null);
assert.equal(proposeSessionProgram(catalog, { ...options, objective: 'leadership' }).challenges.length, 0);
assert.equal(proposeSessionProgram([catalog[6]], { targetMinutes: 15, expectedCount: '2' }).challenges.length, 1);
assert.equal(proposeSessionProgram([catalog[6]], { targetMinutes: 15, expectedCount: '6' }).challenges.length, 0);
assert.equal(proposeSessionProgram([catalog[6]], { targetMinutes: 15 }).challenges.length, 1);
assert.equal(proposeSessionProgram([challenge(1, 10), challenge(2, 10, { engine_key: 'engine_1' })], { targetMinutes: 30 }).challenges.length, 1);
assert.equal(proposeSessionProgram([challenge(1, 30)], { targetMinutes: 20 }).challenges.length, 0);
assert.equal(proposeSessionProgram([challenge(1, 10)], {
  targetMinutes: 20, expectedCount: '3', resolveRange: () => ({ min: 4, max: 6 }),
}).challenges.length, 0);
assert.equal(parseChallengeDuration('10 à 20 min'), 15);
assert.equal(parseChallengeDuration('12,5 min'), 12.5);
for (const value of ['', '1', '12']) assert.equal(isValidExpectedCount(value), true);
for (const value of ['0', '-1', '1.5', 'hello', '2147483648']) assert.equal(isValidExpectedCount(value), false);
assert.throws(() => proposeSessionProgram(catalog, { targetMinutes: 0 }));
assert.throws(() => proposeSessionProgram(catalog, { expectedCount: '-1' }));
console.log('TEST_SESSION_PROGRAM_OK');
