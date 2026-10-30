import assert from 'node:assert/strict';
import {
  DEMO_OBJECTIVES,
  DEMO_PARI_ROUNDS,
  DEMO_PARTICIPANTS,
  DEMO_TEAM_SIZES,
  buildActivityFeed,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getAbsentCount,
  getDebriefPrompts,
  getDemoParticipants,
  getRoundStatements,
  simulateVotes,
} from '../lib/demo/demoScenario.mjs';
import { SESSION_OBJECTIVES } from '../lib/sessionProgram.mjs';

// Seeded randomness replays the same demo.
const first = createRandom(42);
const second = createRandom(42);
for (let index = 0; index < 20; index += 1) {
  const value = first();
  assert.equal(value, second());
  assert.ok(value >= 0 && value < 1);
}

assert.ok(DEMO_OBJECTIVES.every((objective) => SESSION_OBJECTIVES.includes(objective)));
assert.ok(Math.max(...DEMO_TEAM_SIZES) <= DEMO_PARTICIPANTS.length);

for (const teamSize of DEMO_TEAM_SIZES) {
  const participants = getDemoParticipants(teamSize, 'en');
  assert.equal(participants.length, teamSize);
  assert.equal(new Set(participants.map(({ id }) => id)).size, teamSize);
  const schedule = buildJoinSchedule(teamSize, createRandom(teamSize));
  assert.equal(schedule.length, teamSize - getAbsentCount(teamSize));
  assert.ok(schedule.every((entry, index) => index === 0 || entry.delayMs > schedule[index - 1].delayMs));
  assert.ok(schedule.at(-1).delayMs < 6000, 'Joining must stay short enough for a demo');
}
assert.equal(getAbsentCount(6), 0);
assert.equal(getAbsentCount(16), 1);
assert.equal(getDemoParticipants(10, 'fr')[2].role, 'RH');

// Every round is playable in both locales, with a presenter from the fictional team.
for (const round of DEMO_PARI_ROUNDS) {
  for (const locale of ['fr', 'en']) {
    const statements = getRoundStatements(round, locale);
    assert.equal(statements.length, 3);
    assert.ok(round.lieIndex >= 0 && round.lieIndex < statements.length);
  }
  assert.ok(DEMO_PARTICIPANTS.slice(0, Math.min(...DEMO_TEAM_SIZES)).some(({ name }) => name === round.presenter));
}

const votes = simulateVotes({ voterCount: 9, lieIndex: 1, accuracy: 0.5, random: createRandom(7) });
assert.equal(votes.reduce((sum, value) => sum + value, 0), 9);
assert.deepEqual(simulateVotes({ voterCount: 5, lieIndex: 2, accuracy: 1, random: createRandom(1) }), [0, 0, 5]);
assert.equal(simulateVotes({ voterCount: 5, lieIndex: 2, accuracy: 0, random: createRandom(1) })[2], 0);

const feed = buildActivityFeed('copuzzle_live_v1', getDemoParticipants(6, 'fr'), 8, 'fr', createRandom(3));
assert.equal(feed.length, 8);
assert.ok(feed.every(({ text }) => !text.includes('{name}')));
assert.equal(buildActivityFeed('unknown_engine', getDemoParticipants(6, 'en'), 2, 'en', createRandom(3)).length, 2);
assert.deepEqual(buildActivityFeed('copuzzle_live_v1', [], 3, 'en'), []);

for (const objective of DEMO_OBJECTIVES) {
  assert.equal(getDebriefPrompts(objective, 'fr').length, 3);
  assert.equal(getDebriefPrompts(objective, 'en').length, 3);
}
assert.deepEqual(getDebriefPrompts(undefined, 'en'), getDebriefPrompts('cohesion', 'en'));

const program = [{ id: 'a', duration: 15 }, { id: 'b', duration: 12 }];
const results = computeDemoResults({
  teamSize: 10,
  program,
  completions: { a: 80, b: 90 },
  answers: [DEMO_PARI_ROUNDS[0].lieIndex, (DEMO_PARI_ROUNDS[1].lieIndex + 1) % 3],
  votes: [[2, 3, 5], [4, 4, 2]],
});
assert.equal(results.joined, 9);
assert.equal(results.participationRate, 90);
assert.equal(results.challengesCompleted, 2);
assert.equal(results.totalMinutes, 27);
assert.equal(results.averageCompletion, 85);
assert.equal(results.userScore, 1);
assert.equal(results.roundCount, 2);
assert.equal(results.teamAccuracy, Math.round(((5 + 4) / 20) * 100));
assert.equal(computeDemoResults({ teamSize: 6 }).averageCompletion, 0);

console.log('TEST_DEMO_SCENARIO_OK');
