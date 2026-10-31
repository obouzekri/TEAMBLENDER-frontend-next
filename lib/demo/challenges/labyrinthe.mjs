// Labyrinthe des Signaux demo scenario: four fictional players race through three levels.
// Maze generation, movement, traps and lives come from a copy of the backend runtime (labyLogic.mjs).

import { createRandom } from '../demoScenario.mjs';
import { createLabyrintheLiveV1Engine } from './labyLogic.mjs';

export const LABY_ENGINE_KEY = 'labyrinthe_live_v1';

const DURATION_SECONDS = 600;
const SECONDS_PER_TICK = 4;
const STEPS_PER_TICK = 3;
const DIRECTIONS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };

export function buildLabyConfig() {
  return {
    rows: 10,
    cols: 10,
    complexity: 0.8,
    expected_participants: 4,
    timer_seconds: DURATION_SECONDS,
    limited_visibility: false,
    max_collective_attempts: 2,
    timer: { enabled: true, duration_seconds: DURATION_SECONDS, warning_threshold_seconds: 60 },
    chat: { enabled: false },
  };
}

// Labyrinthe branch of the backend summary (socket-runtime buildSummary).
export function buildLabySummary(state) {
  const laby = state.labyrinthe;
  const levelsTotal = Math.max(1, Number(laby.levels_total || 1));
  const isSuccess = laby.result?.status === 'success';
  const levelsCleared = isSuccess ? levelsTotal : Math.max(0, Number(laby.level || 1) - 1);
  const startingLives = Number(laby.cfg?.lives || 3);
  const parts = Object.values(laby.parts || {});
  const livesRemaining = parts.reduce((sum, part) => sum + Math.min(startingLives, Math.max(0, Number(part.lives_remaining || 0))), 0);
  const livesKeptRatio = parts.length > 0 ? livesRemaining / (parts.length * startingLives) : 0;
  const completion = Math.round((levelsCleared / levelsTotal) * 100);
  return {
    total_time_seconds: state.timer.duration_seconds - state.timer.remaining_seconds,
    completion_percent: completion,
    action_count: state.metrics.action_count,
    message_count: 0,
    collective_score: Math.round((completion * 8) + (livesKeptRatio * 200)),
    collective_score_max: 1000,
    pixel_metrics: null,
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createLabyrintheScenario({ seed = 1, players = [] } = {}) {
  const random = createRandom(seed);
  const engine = createLabyrintheLiveV1Engine({
    stopTimer: () => {},
    buildSummary: (state) => buildLabySummary(state),
  });

  function createState() {
    const config = buildLabyConfig();
    const state = {
      challengeKey: LABY_ENGINE_KEY,
      config,
      labyrinthe: engine.buildInitialLabyState(config),
      timer: { enabled: true, status: 'idle', duration_seconds: DURATION_SECONDS, remaining_seconds: DURATION_SECONDS, warning_threshold_seconds: 60 },
      metrics: { action_count: 0, message_count: 0 },
      summary: null,
    };
    players.forEach((player, index) => engine.ensureLabyParticipant(state, player.id, player.name, index + 1));
    return state;
  }

  function view(state) {
    return { config: state.config, timer: state.timer, summary: state.summary, puzzle: { pieces: [] }, labyrinthe: state.labyrinthe };
  }

  function onTimer(state, type) {
    if (type !== 'timer.start') return state;
    const next = cloneState(state);
    engine.ensureLabyRuntimeReady(next, { forceSolo: true });
    return next;
  }

  function direction(from, to) {
    return Object.keys(DIRECTIONS).find((key) => from[0] + DIRECTIONS[key][0] === to[0] && from[1] + DIRECTIONS[key][1] === to[1]);
  }

  // Players mostly head for the exit and avoid traps, but sometimes explore and pay for it.
  function moveBot(state, participantId) {
    const laby = state.labyrinthe;
    const part = laby.parts[participantId];
    if (!part || part.solo?.rg || Number(part.lives_remaining || 0) <= 0) return false;
    const maze = laby.maze;
    const needsStart = part.solo.choosing_start === true || (part.solo.ss !== true && !part.solo.dec?.length);
    if (needsStart) {
      const starts = maze.start_points?.length ? maze.start_points : [maze.start];
      return engine.applyLabySoloStartSelection(state, participantId, starts[Math.floor(random() * starts.length)]).ok;
    }
    const position = part.solo.pos;
    const visited = new Set((part.solo.path || []).map((cell) => engine.labyPosKey(cell)));
    visited.delete(engine.labyPosKey(position));
    const careful = random() < 0.92;
    const blocked = new Set([...visited, ...(careful ? Object.keys(maze.traps || {}) : [])]);
    blocked.delete(engine.labyPosKey(position));
    const path = engine.findLabyPath(maze, position, maze.end, { blocked });
    let target = path.length > 1 && random() < 0.95 ? path[1] : null;
    if (!target) {
      const options = engine.getLabyNeighbors(maze, position).filter((cell) => !visited.has(engine.labyPosKey(cell)));
      if (!options.length) return false;
      target = options[Math.floor(random() * options.length)];
    }
    const dir = direction(position, target);
    return dir ? engine.applyLabySoloMove(null, state, participantId, dir).ok : false;
  }

  function tick(state) {
    const next = cloneState(state);
    next.timer.remaining_seconds = Math.max(0, next.timer.remaining_seconds - SECONDS_PER_TICK);
    // Everyone takes a couple of steps per tick, in a random order.
    for (let step = 0; step < STEPS_PER_TICK; step += 1) {
      const ids = players.map((player) => player.id).sort(() => random() - 0.5);
      for (const id of ids) {
        if (next.labyrinthe.phase === 'done') break;
        if (moveBot(next, id)) next.metrics.action_count += 1;
      }
    }
    if (next.labyrinthe.phase !== 'done' && next.timer.remaining_seconds === 0) {
      engine.finalizeLabyChallenge(next, { status: 'failed', reason: 'timeout' });
    }
    return next;
  }

  return { engineKey: LABY_ENGINE_KEY, createState, view, onTimer, tick };
}
