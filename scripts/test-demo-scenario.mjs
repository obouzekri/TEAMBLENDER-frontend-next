import assert from 'node:assert/strict';
import {
  DEMO_DISCONNECTION,
  DEMO_FLOW_MODES,
  DEMO_OBJECTIVES,
  DEMO_PARI_ROUNDS,
  DEMO_PARTICIPANTS,
  DEMO_PAST_SESSIONS,
  DEMO_STEPS,
  DEMO_TEAM_SIZE,
  buildActivityFeed,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getDebriefPrompts,
  getDemoParticipants,
  getRoundStatements,
  isParticipantOnline,
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

assert.equal(DEMO_STEPS[0], 'dashboard', 'The demo starts in the manager space');
assert.deepEqual(DEMO_FLOW_MODES, ['manual', 'auto']);
assert.ok(DEMO_OBJECTIVES.every((objective) => SESSION_OBJECTIVES.includes(objective)));
assert.ok(DEMO_PAST_SESSIONS.every((session) => session.name.fr && session.name.en));

// A fixed team of four, the minimum needed for every challenge in the catalog.
assert.equal(DEMO_TEAM_SIZE, 4);
for (const locale of ['fr', 'en']) {
  const participants = getDemoParticipants(locale);
  assert.equal(participants.length, DEMO_TEAM_SIZE);
  assert.equal(new Set(participants.map(({ id }) => id)).size, DEMO_TEAM_SIZE);
  assert.ok(participants.every(({ email }) => email.endsWith('@example.com')));
}
assert.equal(getDemoParticipants('fr')[2].role, 'RH');
assert.equal(getDemoParticipants('en')[2].role, 'HR');

const schedule = buildJoinSchedule(DEMO_TEAM_SIZE, createRandom(4));
assert.equal(schedule.length, DEMO_TEAM_SIZE);
assert.ok(schedule.every((entry, index) => index === 0 || entry.delayMs > schedule[index - 1].delayMs));
assert.ok(schedule.at(-1).delayMs <= 4000, 'Joining must stay short enough for a demo');

// One participant drops out briefly during the first challenge only.
const { participantIndex, challengeIndex, fromMinute, toMinute } = DEMO_DISCONNECTION;
assert.ok(participantIndex < DEMO_TEAM_SIZE);
assert.equal(isParticipantOnline(participantIndex, challengeIndex, fromMinute - 0.5), true);
assert.equal(isParticipantOnline(participantIndex, challengeIndex, fromMinute), false);
assert.equal(isParticipantOnline(participantIndex, challengeIndex, toMinute), true);
assert.equal(isParticipantOnline(participantIndex, challengeIndex + 1, fromMinute), true);
assert.equal(isParticipantOnline((participantIndex + 1) % DEMO_TEAM_SIZE, challengeIndex, fromMinute), true);

// Every round is playable in both locales, with a presenter from the team.
for (const round of DEMO_PARI_ROUNDS) {
  for (const locale of ['fr', 'en']) {
    const statements = getRoundStatements(round, locale);
    assert.equal(statements.length, 3);
    assert.ok(round.lieIndex >= 0 && round.lieIndex < statements.length);
  }
  assert.ok(DEMO_PARTICIPANTS.some(({ name }) => name === round.presenter));
}

const votes = simulateVotes({ voterCount: 3, lieIndex: 1, accuracy: 0.5, random: createRandom(7) });
assert.equal(votes.reduce((sum, value) => sum + value, 0), 3);
assert.deepEqual(simulateVotes({ voterCount: 5, lieIndex: 2, accuracy: 1, random: createRandom(1) }), [0, 0, 5]);
assert.equal(simulateVotes({ voterCount: 5, lieIndex: 2, accuracy: 0, random: createRandom(1) })[2], 0);

const feed = buildActivityFeed('copuzzle_live_v1', getDemoParticipants('fr'), 8, 'fr', createRandom(3));
assert.equal(feed.length, 8);
assert.ok(feed.every(({ text }) => !text.includes('{name}')));
assert.equal(buildActivityFeed('unknown_engine', getDemoParticipants('en'), 2, 'en', createRandom(3)).length, 2);
assert.deepEqual(buildActivityFeed('copuzzle_live_v1', [], 3, 'en'), []);
assert.deepEqual(feed.map(({ at }) => at), [0, 1, 2, 3, 4, 5, 6, 7]);
assert.ok(feed.every(({ text }, index) => index === 0 || text !== feed[index - 1].text), 'No line repeats back to back');
const team = getDemoParticipants('en');
const quietFeed = buildActivityFeed('the_quiz_v1', team, 30, 'en', createRandom(9), (position) => position !== 3);
assert.ok(quietFeed.every(({ text }) => !text.includes(team[3].name)), 'Offline participants stay quiet');
const firstWords = quietFeed.map(({ text }) => text.split(' ')[0]);
assert.ok(firstWords.every((name, index) => index === 0 || name !== firstWords[index - 1]), 'Speakers alternate');

for (const objective of DEMO_OBJECTIVES) {
  assert.equal(getDebriefPrompts(objective, 'fr').length, 3);
  assert.equal(getDebriefPrompts(objective, 'en').length, 3);
}
assert.deepEqual(getDebriefPrompts(undefined, 'en'), getDebriefPrompts('cohesion', 'en'));

const program = [{ id: 'a', duration: 15 }, { id: 'b', duration: 12 }];
const results = computeDemoResults({
  program,
  completions: { a: 80, b: 90 },
  answers: [DEMO_PARI_ROUNDS[0].lieIndex, (DEMO_PARI_ROUNDS[1].lieIndex + 1) % 3],
  votes: [[1, 0, 3], [2, 1, 1]],
});
assert.equal(results.invited, DEMO_TEAM_SIZE);
assert.equal(results.joined, DEMO_TEAM_SIZE);
assert.equal(results.participationRate, 100);
assert.equal(results.challengesCompleted, 2);
assert.equal(results.totalMinutes, 27);
assert.equal(results.averageCompletion, 85);
assert.equal(results.userScore, 1);
assert.equal(results.roundCount, 2);
assert.equal(results.teamAccuracy, Math.round(((3 + 2) / 8) * 100));
assert.equal(computeDemoResults({ invited: 4, joined: 3 }).participationRate, 75);
assert.equal(computeDemoResults({}).averageCompletion, 0);

console.log('TEST_DEMO_SCENARIO_OK');
