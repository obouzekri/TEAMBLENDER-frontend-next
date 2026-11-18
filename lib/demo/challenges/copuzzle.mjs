// CoPuzzle demo scenario: fictional participants, and the visitor if present, assemble a 4x4 puzzle.
// State shapes mirror backend/src/challenges/engines/copuzzle_live_v1.

import { createRandom } from '../demoScenario.mjs';

const ROWS = 4;
const COLS = 4;
const DURATION_SECONDS = 600;
const SECONDS_PER_TICK = 6;
const TEAM_SIZE = 4;
// The visitor holds the pieces of slot 1; the demo plays them once the visitor stops for this long.
const VISITOR_SLOT = 1;
const VISITOR_IDLE_MS = 10_000;

export const COPUZZLE_ENGINE_KEY = 'copuzzle_live_v1';

export function buildCopuzzleConfig() {
  return {
    title: 'CoPuzzle',
    image: { src: '/copuzzle/demo-lake.webp', fit: 'cover' },
    grid: { rows: ROWS, cols: COLS },
    timer: { enabled: true, duration_seconds: DURATION_SECONDS, warning_threshold_seconds: 60 },
    chat: { enabled: false },
    participants: { expected_count: TEAM_SIZE, assignment_mode: 'balanced', show_reference_image: true },
  };
}

// Same scoring as the generic branch of the backend summary.
export function buildCopuzzleSummary(state) {
  const pieces = state.puzzle.pieces;
  const placed = pieces.filter((piece) => piece.placed).length;
  const completion = Math.round((placed / pieces.length) * 100);
  const actions = state.metrics.action_count;
  const precision = placed / Math.max(1, placed, actions);
  return {
    total_time_seconds: state.timer.duration_seconds - state.timer.remaining_seconds,
    completion_percent: completion,
    action_count: actions,
    message_count: 0,
    collective_score: Math.max(0, Math.round((completion * 8) + (completion * 2 * precision))),
    collective_score_max: 1000,
    pixel_metrics: null,
  };
}

// players: [{ id, name, bot }]; the visitor is the only player with bot === false.
export function createCopuzzleScenario({ seed = 1, players = [], now = () => Date.now() } = {}) {
  const random = createRandom(seed);
  const visitor = players.find((player) => player.bot === false) || null;
  let lastVisitorActionAt = 0;

  // Pieces the bots may move: all of them, except the visitor's while the visitor is playing.
  function isBotPiece(piece) {
    if (!visitor || Number(piece.assigned_slot) !== VISITOR_SLOT) return true;
    return now() - lastVisitorActionAt >= VISITOR_IDLE_MS;
  }

  function createState() {
    const slots = Array.from({ length: ROWS * COLS }, (_, index) => (index % TEAM_SIZE) + 1);
    for (let index = slots.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [slots[index], slots[target]] = [slots[target], slots[index]];
    }
    const pieces = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        pieces.push({ id: `pz-${y}-${x}`, correct: { x, y }, current: null, placed: false, assigned_slot: slots[pieces.length] });
      }
    }
    return {
      config: buildCopuzzleConfig(),
      puzzle: { pieces },
      timer: { enabled: true, status: 'idle', duration_seconds: DURATION_SECONDS, remaining_seconds: DURATION_SECONDS, warning_threshold_seconds: 60 },
      metrics: { action_count: 0, message_count: 0 },
      summary: null,
    };
  }

  function finish(state) {
    return { ...state, summary: buildCopuzzleSummary(state), timer: { ...state.timer, status: 'completed' } };
  }

  function tick(state) {
    const remaining = Math.max(0, state.timer.remaining_seconds - SECONDS_PER_TICK);
    let next = { ...state, timer: { ...state.timer, remaining_seconds: remaining } };
    if (random() < 0.6) next = moveOnePiece(next);
    if (next.puzzle.pieces.every((piece) => piece.placed) || remaining === 0) return finish(next);
    return next;
  }

  // A participant either fixes a misplaced piece, or places a new one (sometimes on the wrong cell).
  function moveOnePiece(state) {
    const pieces = state.puzzle.pieces.map((piece) => ({ ...piece }));
    const misplaced = pieces.find((piece) => piece.current && !piece.placed && isBotPiece(piece));
    const occupied = new Set(pieces.filter((piece) => piece.current).map((piece) => `${piece.current.x}:${piece.current.y}`));
    let piece = misplaced;
    if (!piece) {
      const waiting = pieces.filter((candidate) => !candidate.current && isBotPiece(candidate));
      if (!waiting.length) return state;
      piece = waiting[Math.floor(random() * waiting.length)];
    }
    if (piece.current) occupied.delete(`${piece.current.x}:${piece.current.y}`);
    const correctKey = `${piece.correct.x}:${piece.correct.y}`;
    const freeCells = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!occupied.has(`${x}:${y}`)) freeCells.push({ x, y });
      }
    }
    const wrongCells = freeCells.filter(({ x, y }) => `${x}:${y}` !== correctKey);
    if (!misplaced && !occupied.has(correctKey) && wrongCells.length && random() < 0.15) {
      piece.current = wrongCells[Math.floor(random() * wrongCells.length)];
      piece.placed = false;
    } else if (!occupied.has(correctKey)) {
      piece.current = { ...piece.correct };
      piece.placed = true;
    } else {
      return state;
    }
    return {
      ...state,
      puzzle: { pieces },
      metrics: { ...state.metrics, action_count: state.metrics.action_count + 1 },
    };
  }

  function onTimer(state, type) {
    // The visitor gets the same grace period at the start as after each move.
    if (type === 'timer.start') lastVisitorActionAt = now();
    return state;
  }

  // The visitor's moves, validated like the puzzle.place / puzzle.unplace branch of
  // backend/src/realtime/socket-runtime.js.
  function handlePieceEvent(state, type, payload, ctx) {
    if (!visitor || ctx.participantId !== visitor.id || state.summary || state.timer.status !== 'running') return null;
    const pieceId = String(payload.pieceId || '').trim();
    const pieces = state.puzzle.pieces.map((piece) => ({ ...piece }));
    const piece = pieces.find((candidate) => String(candidate.id) === pieceId);
    if (!piece || Number(piece.assigned_slot) !== Number(ctx.participantSlot)) return null;
    if (type === 'puzzle.place') {
      const x = Number(payload.x);
      const y = Number(payload.y);
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
      if (pieces.some((candidate) => candidate.current && candidate.current.x === x && candidate.current.y === y)) return null;
      piece.current = { x, y };
      piece.placed = x === piece.correct.x && y === piece.correct.y;
    } else {
      piece.current = null;
      piece.placed = false;
    }
    lastVisitorActionAt = now();
    const next = { ...state, puzzle: { pieces }, metrics: { ...state.metrics, action_count: state.metrics.action_count + 1 } };
    return pieces.every((candidate) => candidate.placed) ? finish(next) : next;
  }

  function handleEvent(state, type, payload, ctx) {
    if (type === 'puzzle.reference_visibility.update') {
      if (ctx.role === 'participant') return null;
      const config = { ...state.config, participants: { ...state.config.participants, show_reference_image: payload.visible === true } };
      return { ...state, config };
    }
    if ((type === 'puzzle.place' || type === 'puzzle.unplace') && ctx.role === 'participant') {
      return handlePieceEvent(state, type, payload, ctx);
    }
    return null;
  }

  return { engineKey: COPUZZLE_ENGINE_KEY, createState, onTimer, tick, handleEvent };
}
