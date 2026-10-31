import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEMO_FLOW_MODES,
  DEMO_OBJECTIVES,
  DEMO_PAST_SESSIONS,
  DEMO_STEPS,
  DEMO_TEAM_SIZE,
  DEMO_VISITOR_ID,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getDebriefPrompts,
  getDemoParticipants,
  getVisitorResult,
} from '../lib/demo/demoScenario.mjs';
import { applyTimerEvent, createDemoChallengeServer } from '../lib/demo/demoChallengeServer.mjs';
import { DEMO_ENGINE_KEYS, VOM_ENGINE_KEY, createDemoScenario } from '../lib/demo/challenges/index.mjs';
import { SESSION_OBJECTIVES } from '../lib/sessionProgram.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
assert.deepEqual(
  [...DEMO_ENGINE_KEYS].sort(),
  ['copuzzle_live_v1', 'labyrinthe_live_v1', 'pixel_architect_v1', 'vrai_ou_mensonge_v1'],
);

// A fixed team of four, the minimum needed for every demo challenge.
assert.equal(DEMO_TEAM_SIZE, 4);
for (const locale of ['fr', 'en']) {
  const participants = getDemoParticipants(locale);
  assert.equal(participants.length, DEMO_TEAM_SIZE);
  assert.ok(participants.every(({ email }) => email.endsWith('@example.com')));
}
const schedule = buildJoinSchedule(DEMO_TEAM_SIZE, createRandom(4));
assert.equal(schedule.length, DEMO_TEAM_SIZE);
assert.ok(schedule.every((entry, index) => index === 0 || entry.delayMs > schedule[index - 1].delayMs));
assert.ok(schedule.at(-1).delayMs <= 4000, 'Joining must stay short enough for a demo');
for (const objective of DEMO_OBJECTIVES) {
  assert.equal(getDebriefPrompts(objective, 'fr').length, 3);
  assert.equal(getDebriefPrompts(objective, 'en').length, 3);
}

const program = [{ id: 'a', duration: 15 }, { id: 'b', duration: 12 }, { id: 'c', duration: 15 }];
const results = computeDemoResults({ program, completions: { a: 80, b: 100 }, visitor: { score: 3, rank: 1, total: 4 } });
assert.equal(results.participationRate, 100);
assert.equal(results.challengesCompleted, 2, 'Skipped challenges have no result');
assert.equal(results.totalMinutes, 42);
assert.equal(results.averageCompletion, 90);
assert.deepEqual(results.visitor, { score: 3, rank: 1, total: 4 });
assert.equal(getVisitorResult({ ranking: [{ participant_id: 'x', score: 2, rank: 1 }] }, DEMO_VISITOR_ID), null);
assert.deepEqual(
  getVisitorResult({ ranking: [{ participant_id: 'x', score: 2, rank: 1 }, { participant_id: DEMO_VISITOR_ID, score: 1, rank: 2 }] }, DEMO_VISITOR_ID),
  { score: 1, rank: 2, total: 2 },
);

// Demo server: same Socket.IO protocol as the backend, driven by a manual scheduler.
function createManualScheduler() {
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    setTimeout: (callback) => { const id = nextId++; timeouts.set(id, callback); return id; },
    setInterval: (callback) => { const id = nextId++; intervals.set(id, callback); return id; },
    clearInterval: (id) => intervals.delete(id),
    flush() {
      while (timeouts.size) {
        const [id, callback] = timeouts.entries().next().value;
        timeouts.delete(id);
        callback();
      }
    },
    tick() {
      for (const callback of [...intervals.values()]) callback();
      this.flush();
    },
    get intervalCount() { return intervals.size; },
  };
}

const players = getDemoParticipants('fr').map(({ id, name }) => ({ id, name }));

{
  const scheduler = createManualScheduler();
  const summaries = [];
  const server = createDemoChallengeServer({
    scenario: createDemoScenario('copuzzle_live_v1', { seed: 3, locale: 'fr', players }),
    scheduler,
    onSummary: (summary) => summaries.push(summary),
  });
  const received = [];
  server.socket.on('challenge:state', (payload) => received.push(payload));
  assert.equal(server.socket.connected, true);
  server.socket.emit('challenge:event', { type: 'timer.start', payload: {} });
  scheduler.flush();
  assert.equal(received.length, 0, 'No state is pushed before the join');
  server.socket.emit('challenge:join', { sessionId: 'demo' });
  scheduler.flush();
  assert.equal(received.length, 1);
  assert.equal(received[0].participantSlot, null);
  assert.equal(received[0].state.timer.status, 'running', 'Start before join is applied');
  server.socket.emit('challenge:event', { type: 'timer.pause', payload: {} });
  scheduler.flush();
  assert.equal(received.at(-1).state.timer.status, 'paused');
  assert.equal(scheduler.intervalCount, 0, 'A paused challenge does not tick');
  server.socket.emit('challenge:event', { type: 'timer.resume', payload: {} });
  for (let tick = 0; tick < 200 && !summaries.length; tick += 1) scheduler.tick();
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].completion_percent, 100);
  assert.equal(received.at(-1).state.timer.status, 'completed');
  assert.equal(scheduler.intervalCount, 0, 'A finished challenge stops ticking');
  server.dispose();
}
assert.equal(applyTimerEvent({ timer: { enabled: false, status: 'disabled' } }, 'timer.start'), null);

// Each scenario plays through to its debrief.
function runFacilitator(engineKey, seed, { start = 'timer.start', clock } = {}) {
  const scenario = createDemoScenario(engineKey, { seed, locale: 'fr', players, now: clock?.now });
  let state = scenario.createState();
  if (start === 'timer.start') {
    const started = applyTimerEvent(state, start);
    state = scenario.onTimer ? scenario.onTimer(started, start, {}) : started;
  } else {
    state = scenario.handleEvent(state, start, {}, { role: 'manager' });
  }
  for (let tick = 0; tick < 2000 && !state.summary; tick += 1) {
    clock?.advance(300);
    state = scenario.tick(state, { role: 'manager' }) || state;
  }
  return { scenario, state };
}

{
  const { state } = runFacilitator('copuzzle_live_v1', 5);
  assert.ok(state.puzzle.pieces.every((piece) => piece.placed && piece.current.x === piece.correct.x && piece.current.y === piece.correct.y));
  assert.equal(new Set(state.puzzle.pieces.map((piece) => piece.assigned_slot)).size, DEMO_TEAM_SIZE);
}
{
  const { scenario, state } = runFacilitator('pixel_architect_v1', 5);
  assert.equal(state.pixel.phase, 'debrief');
  assert.equal(state.summary.pixel_metrics.accuracy_percent, 100);
  const names = new Set(players.map(({ name }) => name));
  assert.ok(Object.values(state.pixel.cubes).every((cube) => cube.placed_by.startsWith('demo-') && names.has(cube.placed_by_name)), 'Cubes carry their author id and name');
  assert.equal(scenario.view(state, { role: 'manager', participantId: 'demo-facilitator' }).pixel.viewer_role, 'facilitator');
}
{
  const outcomes = [1, 2, 3, 4, 5].map((seed) => runFacilitator('labyrinthe_live_v1', seed).state);
  assert.ok(outcomes.every((state) => state.labyrinthe.phase === 'done' && state.summary));
  assert.ok(outcomes.some((state) => state.labyrinthe.result.status === 'success'), 'Players usually find the exit');
}
{
  let time = 5_000_000;
  const clock = { now: () => time, advance: (ms) => { time += ms; } };
  const { scenario, state } = runFacilitator(VOM_ENGINE_KEY, 7, { start: 'vom.start', clock });
  assert.equal(state.vom.phase, 'finished');
  assert.equal(state.vom.round_history.length, DEMO_TEAM_SIZE, 'One turn per participant');
  assert.equal(state.vom.ranking.length, DEMO_TEAM_SIZE);
  assert.equal(scenario.view(state, { role: 'manager' }).vom.participants_meta.length, DEMO_TEAM_SIZE);
}

// Participant preview: the visitor poses once and votes on the others' statements.
{
  let time = 9_000_000;
  const visitorPlayers = [{ id: DEMO_VISITOR_ID, name: 'You', bot: false }, ...players.slice(0, 3)];
  const scenario = createDemoScenario(VOM_ENGINE_KEY, { seed: 2, locale: 'en', players: visitorPlayers, autoStartMs: 1500, now: () => time });
  const ctx = { role: 'participant', participantId: DEMO_VISITOR_ID };
  let state = scenario.createState();
  assert.equal(scenario.isRunning(state), true, 'Auto-start keeps the preview ticking');
  let maskedChoice = false;
  for (let tick = 0; tick < 3000 && !state.summary; tick += 1) {
    time += 300;
    state = scenario.tick(state, ctx) || state;
    const turn = state.vom.current_turn;
    if (state.vom.phase === 'selecting_statement' && turn.poser_id === DEMO_VISITOR_ID) {
      state = scenario.handleEvent(state, 'vom.select_statement', { statement_id: 'pr_01', selected_option: 'tea' }, ctx) || state;
    }
    if (state.vom.phase === 'voting_open' && turn.poser_id !== DEMO_VISITOR_ID && !turn.votes[DEMO_VISITOR_ID]) {
      const visible = scenario.view(state, ctx).vom.current_turn;
      if (turn.answer_mode === 'choice') {
        assert.equal(visible.selected_option, null, 'Voters do not see the poser choice');
        maskedChoice = true;
      }
      state = scenario.handleEvent(state, 'vom.vote', { vote: turn.answer_mode === 'choice' ? turn.statement_options[0] : 'vrai' }, ctx) || state;
    }
  }
  assert.equal(state.vom.phase, 'finished');
  assert.ok(state.vom.round_history.some((round) => round.poser_id === DEMO_VISITOR_ID && round.statement_id === 'pr_01'));
  const votedRounds = state.vom.round_history.filter((round) => round.votes.some((vote) => vote.participant_id === DEMO_VISITOR_ID && vote.vote));
  assert.equal(votedRounds.length, 3);
  assert.ok(getVisitorResult(state.vom, DEMO_VISITOR_ID));
  assert.equal(scenario.handleEvent(state, 'vom.start', {}, ctx), null, 'Participants cannot start the game');
  assert.ok(maskedChoice || state.vom.round_history.every((round) => round.answer_mode !== 'choice'));
}

// The copied engine logic must stay in line with the backend (checked when both repos are side by side).
const backendEngines = path.resolve(root, '..', 'backend', 'src', 'challenges', 'engines');
if (fs.existsSync(backendEngines)) {
  const lines = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const copies = [
    ['vrai_ou_mensonge_v1/game-logic.js', 'vomGameLogic.mjs'],
    ['labyrinthe_live_v1/maze-solvability.js', 'labyMazeSolvability.mjs'],
    ['pixel_architect_v1/server-runtime.js', 'pixelLogic.mjs'],
    ['labyrinthe_live_v1/server-runtime.js', 'labyLogic.mjs'],
  ];
  for (const [backendFile, copy] of copies) {
    const copied = new Set(lines(path.join(root, 'lib', 'demo', 'challenges', copy)));
    const backendLines = lines(path.join(backendEngines, backendFile));
    // The export list differs by design (module syntax, extra exports).
    const missing = backendLines.slice(0, backendLines.findIndex((line) => line.startsWith('module.exports')))
      .filter((line) => line.trim() && !/'use strict'|require\(|module\.exports|^} = |^const \{$/.test(line) && !copied.has(line));
    assert.deepEqual(missing.slice(0, 3), [], `${copy} drifted from backend ${backendFile}`);
  }
}

console.log('TEST_DEMO_SCENARIO_OK');
