import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEMO_DEBRIEF_PROMPTS,
  DEMO_FLOW_MODES,
  DEMO_PAST_SESSIONS,
  DEMO_ROOM_SIZE,
  DEMO_STEPS,
  DEMO_TEAM_SIZE,
  DEMO_VIEW_MODES,
  DEMO_VISITOR_ID,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getDebriefPrompts,
  getDemoParticipants,
  getDemoPlayers,
  getVisitorContribution,
} from '../lib/demo/demoScenario.mjs';
import { applyTimerEvent, createDemoChallengeServer } from '../lib/demo/demoChallengeServer.mjs';
import {
  DEMO_ENGINE_KEYS,
  DEMO_PLAY_ENGINE_KEY,
  DEMO_PROGRAM_ENGINE_KEYS,
  DEMO_VISITOR_PLAYABLE_ENGINE_KEYS,
  VOM_ENGINE_KEY,
  createDemoScenario,
} from '../lib/demo/challenges/index.mjs';
import { buildCopuzzleSummary } from '../lib/demo/challenges/copuzzle.mjs';
import { buildLabySummary } from '../lib/demo/challenges/labyrinthe.mjs';
import { buildVomConfig } from '../lib/demo/challenges/vraiOuMensonge.mjs';
import { SUPPORTED_LOCALES } from '../lib/i18n/routing.js';
import { buildPixelTemplateCells } from '../lib/demo/challenges/pixelLogic.mjs';
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

assert.deepEqual(DEMO_STEPS, ['dashboard', 'prepare', 'invite', 'facilitate', 'results'], 'The participant screen lives inside the live step');
assert.deepEqual(DEMO_VIEW_MODES, ['facilitator', 'participant', 'split']);
assert.deepEqual(DEMO_FLOW_MODES, ['manual', 'auto']);
assert.ok(Object.keys(DEMO_DEBRIEF_PROMPTS).every((objective) => SESSION_OBJECTIVES.includes(objective)));
assert.ok(DEMO_PAST_SESSIONS.every((session) => session.name.fr && session.name.en && session.name.ar));
assert.deepEqual(
  [...DEMO_ENGINE_KEYS].sort(),
  ['copuzzle_live_v1', 'labyrinthe_live_v1', 'pixel_architect_v1', 'vrai_ou_mensonge_v1'],
);
assert.deepEqual(DEMO_PROGRAM_ENGINE_KEYS, ['copuzzle_live_v1', 'labyrinthe_live_v1', 'pixel_architect_v1'], 'The facilitator runs the three challenges in order');
assert.ok(DEMO_PROGRAM_ENGINE_KEYS.includes(DEMO_PLAY_ENGINE_KEY), 'The visitor contribution comes from a programme challenge');
assert.ok(DEMO_VISITOR_PLAYABLE_ENGINE_KEYS.every((key) => DEMO_PROGRAM_ENGINE_KEYS.includes(key)));

// A fixed team of four, the minimum needed for every demo challenge.
assert.equal(DEMO_TEAM_SIZE, 4);
for (const locale of SUPPORTED_LOCALES) {
  const participants = getDemoParticipants(locale);
  assert.equal(participants.length, DEMO_TEAM_SIZE);
  assert.ok(participants.every(({ email }) => email.endsWith('@example.com')));
  assert.ok(participants.every(({ role }) => role));
}
// The visitor joins the four colleagues as a fifth participant, in slot 1.
assert.equal(DEMO_ROOM_SIZE, DEMO_TEAM_SIZE + 1);
const roomPlayers = getDemoPlayers('fr', 'Vous');
assert.equal(roomPlayers.length, DEMO_ROOM_SIZE);
assert.deepEqual(roomPlayers[0], { id: DEMO_VISITOR_ID, name: 'Vous', bot: false });
assert.ok(roomPlayers.slice(1).every((player) => player.bot === true));
const schedule = buildJoinSchedule(DEMO_ROOM_SIZE, createRandom(4));
assert.equal(schedule.length, DEMO_ROOM_SIZE);
assert.ok(schedule.every((entry, index) => index === 0 || entry.delayMs > schedule[index - 1].delayMs));
assert.ok(schedule.at(-1).delayMs <= 5000, 'Joining must stay short enough for a demo');
for (const objective of Object.keys(DEMO_DEBRIEF_PROMPTS)) {
  assert.equal(getDebriefPrompts(objective, 'fr').length, 3);
  assert.equal(getDebriefPrompts(objective, 'en').length, 3);
  assert.equal(DEMO_DEBRIEF_PROMPTS[objective].ar.length, 3);
}
if (SUPPORTED_LOCALES.includes('ar')) {
  assert.ok(getDemoParticipants('ar').every(({ role }) => /[\u0600-\u06ff]/.test(role)));
  assert.ok(Object.keys(DEMO_DEBRIEF_PROMPTS).every((objective) => getDebriefPrompts(objective, 'ar').every((prompt) => /[\u0600-\u06ff]/.test(prompt))));
  const arabicVom = buildVomConfig('ar');
  assert.ok(arabicVom.catalog.every(({ text, category }) => /[\u0600-\u06ff]/.test(text) && /[\u0600-\u06ff]/.test(category)));
}

const program = [{ id: 'a', duration: 15 }, { id: 'b', duration: 12 }, { id: 'c', duration: 15 }];
const results = computeDemoResults({ program, completions: { a: 80, b: 100 }, actions: { a: 5, b: 7 }, visitor: { cubes: 6, share: 25 } });
assert.equal(results.participationRate, 100);
assert.equal(results.invited, DEMO_ROOM_SIZE, 'The visitor counts as a participant');
assert.equal(results.challengesCompleted, 2, 'Skipped challenges have no result');
assert.equal(results.totalMinutes, 42);
assert.equal(results.totalActions, 12);
assert.equal(computeDemoResults({ program }).totalActions, 0);
assert.deepEqual(results.visitor, { cubes: 6, share: 25 });
assert.equal(getVisitorContribution({ cubes: {}, evaluation: { matched_count: 0 } }, DEMO_VISITOR_ID), null);

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

  const copuzzleScoreState = {
    puzzle: { pieces: [{ placed: true }, { placed: false }] },
    metrics: { action_count: 1 },
    timer: { duration_seconds: 600, remaining_seconds: 300 },
  };
  const preciseCopuzzleScore = buildCopuzzleSummary(copuzzleScoreState).collective_score;
  assert.ok(
    buildCopuzzleSummary({ ...copuzzleScoreState, metrics: { action_count: 10 } }).collective_score < preciseCopuzzleScore,
    'Wasted CoPuzzle actions reduce precision instead of adding points'
  );

  const labyScoreState = {
    labyrinthe: {
      level: 2,
      levels_total: 3,
      cfg: { lives: 3 },
      parts: { p1: { lives_remaining: 2, total_cells_traversed: 4 } },
    },
    metrics: { action_count: 4 },
    timer: { duration_seconds: 600, remaining_seconds: 300 },
  };
  const labyScore = buildLabySummary(labyScoreState).collective_score;
  assert.equal(
    buildLabySummary({
      ...labyScoreState,
      labyrinthe: { ...labyScoreState.labyrinthe, parts: { p1: { lives_remaining: 2, total_cells_traversed: 400 } } },
      metrics: { action_count: 400 },
    }).collective_score,
    labyScore,
    'Labyrinthe traversal count does not add points'
  );
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

// One game, two viewers: the facilitator and the visitor each get the view of their role.
{
  const scheduler = createManualScheduler();
  const visitorPlayers = [{ id: DEMO_VISITOR_ID, name: 'You', bot: false }, ...players];
  const server = createDemoChallengeServer({
    scenario: createDemoScenario(DEMO_PLAY_ENGINE_KEY, { seed: 4, locale: 'fr', players: visitorPlayers }),
    scheduler,
  });
  const visitor = server.connect({ role: 'participant', participantId: DEMO_VISITOR_ID, participantSlot: 1 });
  assert.notEqual(visitor.id, server.socket.id);
  const facilitatorStates = [];
  const visitorStates = [];
  server.socket.on('challenge:state', (payload) => facilitatorStates.push(payload));
  visitor.on('challenge:state', (payload) => visitorStates.push(payload));
  server.socket.emit('challenge:join', {});
  visitor.emit('challenge:join', {});
  scheduler.flush();
  assert.equal(facilitatorStates.at(-1).state.pixel.viewer_role, 'facilitator');
  assert.equal(visitorStates.at(-1).state.pixel.viewer_role, 'builder');
  assert.equal(visitorStates.at(-1).participantSlot, 1);
  assert.equal(facilitatorStates.at(-1).participantSlot, null);

  visitor.emit('challenge:event', { type: 'timer.start', payload: {} });
  scheduler.flush();
  assert.equal(server.getState().timer.status, 'idle', 'Participants cannot drive the timer');
  server.socket.emit('challenge:event', { type: 'timer.start', payload: {} });
  scheduler.flush();
  assert.equal(visitorStates.at(-1).state.timer.status, 'running', 'The facilitator start reaches the participant');

  const [x, y, z] = buildPixelTemplateCells(server.getState().pixel.selected_template)[0].split(':').map(Number);
  const before = facilitatorStates.length;
  visitor.emit('challenge:event', { type: 'pixel.cube.place', payload: { x, y, z, color: server.getState().pixel.palette[0] } });
  scheduler.flush();
  assert.ok(facilitatorStates.length > before);
  assert.equal(facilitatorStates.at(-1).state.pixel.cubes[`${x}:${y}:${z}`]?.placed_by, DEMO_VISITOR_ID, 'The visitor cube shows on the facilitator screen');

  const facilitatorChat = [];
  server.socket.on('challenge:event', (event) => facilitatorChat.push(event));
  visitor.emit('challenge:event', { type: 'chat.message', payload: { text: 'Hello', author: 'You' } });
  scheduler.flush();
  assert.equal(facilitatorChat.at(-1)?.payload.text, 'Hello', 'Chat is echoed to the whole room');

  visitor.disconnect();
  const visitorCount = visitorStates.length;
  scheduler.tick();
  assert.equal(visitorStates.length, visitorCount, 'A disconnected viewer stops receiving states');
  assert.equal(visitor.emit('challenge:event', { type: 'timer.pause', payload: {} }), false);
  server.dispatch('timer.pause');
  assert.equal(server.getState().timer.status, 'paused', 'Demo-dispatched events act as the facilitator');
  server.dispose();
}

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
  assert.equal(state.summary.collective_score_max, 1000);
}
{
  const { scenario, state } = runFacilitator('pixel_architect_v1', 5);
  assert.equal(state.pixel.phase, 'debrief');
  assert.equal(state.summary.pixel_metrics.accuracy_percent, 100);
  assert.equal(state.summary.collective_score_max, 100);
  const names = new Set(players.map(({ name }) => name));
  assert.ok(Object.values(state.pixel.cubes).every((cube) => cube.placed_by.startsWith('demo-') && names.has(cube.placed_by_name)), 'Cubes carry their author id and name');
  assert.equal(scenario.view(state, { role: 'manager', participantId: 'demo-facilitator' }).pixel.viewer_role, 'facilitator');
}
{
  const outcomes = [1, 2, 3, 4, 5].map((seed) => runFacilitator('labyrinthe_live_v1', seed).state);
  assert.ok(outcomes.every((state) => state.labyrinthe.phase === 'done' && state.summary));
  assert.ok(outcomes.every((state) => state.summary.collective_score_max === 1000));
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

// The visitor may stay on the facilitator screen: every programme challenge still ends without them.
for (const engineKey of DEMO_PROGRAM_ENGINE_KEYS) {
  let time = 15_000_000;
  const scenario = createDemoScenario(engineKey, { seed: 6, locale: 'fr', players: roomPlayers, now: () => time });
  let state = scenario.createState();
  const started = applyTimerEvent(state, 'timer.start');
  state = scenario.onTimer ? scenario.onTimer(started, 'timer.start', { role: 'manager' }) : started;
  let ticks = 0;
  for (; ticks < 2000 && !state.summary; ticks += 1) {
    time += 300;
    state = scenario.tick(state) || state;
  }
  assert.equal(state.summary?.completion_percent, 100, `${engineKey} ends with an idle visitor`);
  // The server ticks every 300 ms: a challenge must stay short enough for a demo.
  assert.ok(ticks * 0.3 <= 120, `${engineKey} lasts ${Math.round(ticks * 0.3)} s`);
}
assert.equal(createDemoScenario(DEMO_PLAY_ENGINE_KEY, { players: roomPlayers }).createState().pixel.selected_template.id, 'pont_croise', 'The demo builds the crossed bridge');

// Labyrinthe: the visitor picks a start and walks their own player; the demo takes over when they stop.
{
  let time = 25_000_000;
  const scenario = createDemoScenario('labyrinthe_live_v1', { seed: 3, locale: 'fr', players: roomPlayers, now: () => time });
  const ctx = { role: 'participant', participantId: DEMO_VISITOR_ID };
  let state = scenario.createState();
  assert.equal(scenario.handleEvent(state, 'laby.solo.move', { dir: 'N' }, ctx), null, 'Moves wait for the timer');
  state = scenario.onTimer(applyTimerEvent(state, 'timer.start'), 'timer.start', ctx);
  const tickFor = (ms) => {
    for (let elapsed = 0; elapsed < ms && !state.summary; elapsed += 300) {
      time += 300;
      state = scenario.tick(state) || state;
    }
  };
  const visitorPart = () => state.labyrinthe.parts[DEMO_VISITOR_ID];
  tickFor(3000);
  assert.ok(!visitorPart().solo.ss, 'Bots leave the visitor player alone while they may still play');
  const maze = state.labyrinthe.maze;
  const start = (maze.start_points?.length ? maze.start_points : [maze.start])[0];
  assert.equal(scenario.handleEvent(state, 'laby.solo.select_start', { pos: start }, { role: 'manager', participantId: 'demo-facilitator' }), null, 'The facilitator does not play');
  state = scenario.handleEvent(state, 'laby.solo.select_start', { pos: start }, ctx);
  assert.ok(state, 'The visitor picks a start');
  const before = JSON.stringify(visitorPart().solo.pos);
  const moved = ['N', 'E', 'S', 'W'].map((dir) => scenario.handleEvent(state, 'laby.solo.move', { dir }, ctx)).find(Boolean);
  assert.ok(moved, 'The visitor can move');
  state = moved;
  assert.equal(scenario.handleEvent(state, 'laby.solo.move', { dir: 'X' }, ctx), null);
  const actions = state.metrics.action_count;
  tickFor(3000);
  assert.ok(JSON.stringify(visitorPart().solo.pos) !== before || visitorPart().solo.choosing_start, 'The visitor move is kept');
  const visitorPath = (visitorPart().solo.path || []).length;
  tickFor(12_000);
  assert.ok(state.summary || (visitorPart().solo.path || []).length > visitorPath || visitorPart().solo.rg, 'The demo plays for an idle visitor');
  assert.ok(state.metrics.action_count > actions);
  tickFor(120_000);
  assert.equal(state.summary?.completion_percent, 100, 'The maze still ends with the visitor in it');
}

// A visitor who reserves a layer and then goes quiet does not stall the build.
{
  let time = 20_000_000;
  const scenario = createDemoScenario(DEMO_PLAY_ENGINE_KEY, { seed: 2, locale: 'fr', players: roomPlayers, now: () => time });
  const ctx = { role: 'participant', participantId: DEMO_VISITOR_ID };
  let state = scenario.onTimer(applyTimerEvent(scenario.createState(), 'timer.start'), 'timer.start', ctx);
  state = scenario.handleEvent(state, 'pixel.layer.claim', { layer: 2 }, ctx);
  let ticks = 0;
  for (; ticks < 2000 && !state.summary; ticks += 1) {
    time += 300;
    state = scenario.tick(state) || state;
  }
  assert.equal(state.summary.completion_percent, 100);
  assert.ok(ticks * 0.3 <= 120, `An abandoned layer delays the build to ${Math.round(ticks * 0.3)} s`);
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
  assert.ok(state.vom.ranking.some((entry) => entry.participant_id === DEMO_VISITOR_ID));
  assert.equal(scenario.handleEvent(state, 'vom.start', {}, ctx), null, 'Participants cannot start the game');
  assert.ok(maskedChoice || state.vom.round_history.every((round) => round.answer_mode !== 'choice'));
}

// Participant preview: the visitor builds part of the Pixel Architect model with three bots.
{
  let time = 12_000_000;
  const visitorPlayers = [{ id: DEMO_VISITOR_ID, name: 'You', bot: false }, ...players.slice(0, 3)];
  const scenario = createDemoScenario(DEMO_PLAY_ENGINE_KEY, { seed: 3, locale: 'en', players: visitorPlayers, now: () => time });
  const ctx = { role: 'participant', participantId: DEMO_VISITOR_ID };
  let state = scenario.createState();
  assert.equal(scenario.handleEvent(state, 'pixel.cube.place', { x: 2, y: 0, z: 1 }, ctx), null, 'Building waits for the timer');
  state = scenario.onTimer(applyTimerEvent(state, 'timer.start'), 'timer.start', ctx);
  assert.equal(scenario.view(state, ctx).pixel.viewer_role, 'builder');
  assert.equal(scenario.handleEvent(state, 'pixel.cube.place', { x: 2, y: 0, z: 1 }, { role: 'manager' }), null, 'The facilitator does not build');
  state = scenario.handleEvent(state, 'pixel.layer.claim', { layer: 1 }, ctx);
  assert.equal(state.pixel.layer_claims['1'].participant_id, DEMO_VISITOR_ID);
  const layerOne = buildPixelTemplateCells(state.pixel.selected_template).filter((key) => key.split(':')[1] === '1');
  let visitorMoves = 0;
  for (let tick = 0; tick < 2000 && !state.summary; tick += 1) {
    time += 300;
    state = scenario.tick(state, ctx) || state;
    const free = layerOne.find((key) => !state.pixel.cubes[key]);
    if (!state.summary && free && tick % 5 === 0) {
      const [x, y, z] = free.split(':').map(Number);
      state = scenario.handleEvent(state, 'pixel.cube.place', { x, y, z, color: state.pixel.palette[1] }, ctx) || state;
      visitorMoves += 1;
    }
  }
  assert.equal(state.summary.pixel_metrics.accuracy_percent, 100);
  assert.ok(Object.values(state.pixel.cubes).filter((cube) => cube.y === 1).every((cube) => cube.placed_by === DEMO_VISITOR_ID), 'Bots leave the reserved layer to the visitor');
  assert.ok(state.timer.remaining_seconds > 0, 'The team finishes before the timer');
  const contribution = getVisitorContribution(state.pixel, DEMO_VISITOR_ID);
  assert.equal(contribution.cubes, layerOne.length);
  assert.equal(contribution.cubes, visitorMoves);
  assert.equal(contribution.share, Math.round((layerOne.length / state.pixel.evaluation.matched_count) * 100));
  assert.equal(scenario.handleEvent(state, 'pixel.cube.remove', { x: 0, y: 0, z: 0 }, ctx), null, 'The finished build is locked');
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
