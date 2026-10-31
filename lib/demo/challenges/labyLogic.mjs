// Copy of backend/src/challenges/engines/labyrinthe_live_v1/server-runtime.js (ES module syntax, with
// clampInt inlined from shared/state-helpers.js). Keep it in sync with the backend.
// Labyrinthe des Signaux challenge engine: maze generation, movement rules and
// per-participant/collective progression. Pure state transforms - no Socket.IO/io access.
import {
  generateSolvableMaze,
  hasReachableExit,
  pickFarthestExit,
} from './labyMazeSolvability.mjs';

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

const LABY_DIRS = Object.freeze({
  N: { dr: -1, dc: 0 },
  E: { dr: 0, dc: 1 },
  S: { dr: 1, dc: 0 },
  W: { dr: 0, dc: -1 }
});

const LABY_OPPOSITE_DIR = Object.freeze({
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E'
});

function createLabyrintheLiveV1Engine(deps = {}) {
  const { stopTimer, buildSummary } = deps;

function normalizeLabyConfig(rawConfig) {
  const source = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const rows = clampInt(
    source.rows != null ? source.rows : (source?.grid?.rows != null ? source.grid.rows : source.r),
    10,
    10,
    20
  );
  const cols = clampInt(
    source.cols != null ? source.cols : (source?.grid?.cols != null ? source.grid.cols : source.c),
    10,
    10,
    20
  );
  const timerSeconds = clampInt(
    source?.timer?.duration_seconds != null ? source.timer.duration_seconds : source.timer_seconds,
    0,
    0,
    1800
  );
  return {
    rows,
    cols,
    r: rows,
    c: cols,
    cx: Math.min(1, Math.max(0.3, Number(source.cx != null ? source.cx : source.complexity) || 0.8)),
    ep: clampInt(source.ep != null ? source.ep : source.expected_participants, 4, 2, 24),
    tps: timerSeconds,
    timer_seconds: timerSeconds,
    timer: {
      enabled: true,
      duration_seconds: timerSeconds,
    },
    lv: source.lv != null ? Boolean(source.lv) : Boolean(source.limited_visibility),
    lives: clampInt(source.lives != null ? source.lives : source.lives_per_player, 3, 1, 8),
    trap_percent: Math.min(0.4, Math.max(0, Number(source.trap_percent != null ? source.trap_percent : source.tp) || 0.18)),
    mca: clampInt(
      source.mca != null ? source.mca : source.max_collective_attempts,
      2, 1, 5
    ),
    levels_total: clampInt(source.levels_total != null ? source.levels_total : source.levels, 3, 1, 6)
  };
}

function defaultLabyParticipant(name, slot) {
  return {
    name: name || `Participant ${slot}`,
    slot,
    lives_remaining: 3,
    total_cells_traversed: 0,
    solo: {
      st: 'pending',
      ss: false,
      path: [[0, 0]],
      dec: [],
      fail: null,
      pos: [0, 0],
      rg: false,
      et: null
    },
    ls: false,
    vote: null,
    connected: true
  };
}

function buildInitialLabyState(config) {
  const cfg = normalizeLabyConfig(config);
  return {
    phase: 'setup',
    cfg,
    level: 1,
    levels_total: cfg.levels_total,
    maze: null,
    winner_participant_id: null,
    result: null,
    reveal_exit_to_all: false,
    revealed_cells: {},
    revealed_traps: {},
    revealed_walls: {},
    col: {
      max: cfg.mca,
      sec: null,
      fr: null,
      pos: [0, 0],
      path: [[0, 0]],
      att: 0
    },
    parts: {}
  };
}

function cloneJson(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function countOpenLabyEdges(maze, pos) {
  const row = pos && Number.isInteger(pos[0]) ? pos[0] : -1;
  const col = pos && Number.isInteger(pos[1]) ? pos[1] : -1;
  const cell = maze && Array.isArray(maze.cells) && maze.cells[row] ? maze.cells[row][col] : null;
  if (!cell || typeof cell !== 'object') {
    return 0;
  }
  return ['n', 'e', 's', 'w'].reduce((total, key) => total + (cell[key] ? 1 : 0), 0);
}

function getLabyCell(maze, pos) {
  const row = Array.isArray(pos) ? Number(pos[0]) : Number.NaN;
  const col = Array.isArray(pos) ? Number(pos[1]) : Number.NaN;
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if (!maze || !Array.isArray(maze.cells)) return null;
  if (!Array.isArray(maze.cells[row])) return null;
  const cell = maze.cells[row][col];
  if (!cell || typeof cell !== 'object') return null;
  return cell;
}

function isLabyMoveAllowed(maze, fromPos, dir) {
  const cell = getLabyCell(maze, fromPos);
  if (!cell) return false;
  const key = String(dir || '').trim().toLowerCase();
  if (!['n', 'e', 's', 'w'].includes(key)) return false;
  return Boolean(cell[key]);
}

function labyPosKey(pos) {
  if (!Array.isArray(pos)) return '';
  const row = Number(pos[0]);
  const col = Number(pos[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return '';
  return `${row},${col}`;
}

function labyParsePosKey(key) {
  const raw = String(key || '').trim();
  const match = /^(\d+),(\d+)$/.exec(raw);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function getLabyNeighbors(maze, pos) {
  const neighbors = [];
  const cell = getLabyCell(maze, pos);
  if (!cell) return neighbors;

  Object.entries(LABY_DIRS).forEach(([dir, delta]) => {
    if (!cell[dir.toLowerCase()]) return;
    const next = [Number(pos[0]) + delta.dr, Number(pos[1]) + delta.dc];
    if (!getLabyCell(maze, next)) return;
    neighbors.push(next);
  });

  return neighbors;
}

function findLabyPath(maze, startPos, endPos, options = {}) {
  if (!maze || !Array.isArray(startPos) || !Array.isArray(endPos)) return [];

  const startKey = labyPosKey(startPos);
  const endKey = labyPosKey(endPos);
  if (!startKey || !endKey) return [];

  const blocked = options.blocked instanceof Set ? options.blocked : new Set();
  if (blocked.has(startKey) || blocked.has(endKey)) return [];

  const queue = [cloneJson(startPos, [0, 0])];
  const visited = new Set([startKey]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = labyPosKey(current);
    if (currentKey === endKey) {
      const path = [];
      let cursor = currentKey;
      while (cursor) {
        const parsed = labyParsePosKey(cursor);
        if (!parsed) break;
        path.push(parsed);
        cursor = parent.get(cursor) || null;
      }
      path.reverse();
      return path;
    }

    getLabyNeighbors(maze, current).forEach((next) => {
      const nextKey = labyPosKey(next);
      if (!nextKey || visited.has(nextKey) || blocked.has(nextKey)) return;
      visited.add(nextKey);
      parent.set(nextKey, currentKey);
      queue.push(next);
    });
  }

  return [];
}

function hasLabySafePath(maze) {
  if (!maze || !Array.isArray(maze.end)) return false;

  const blocked = new Set(Object.keys(maze.traps || {}));
  const startPoints = Array.isArray(maze.safe_start_points) && maze.safe_start_points.length > 0
    ? maze.safe_start_points
    : Array.isArray(maze.start_points) && maze.start_points.length > 0
      ? maze.start_points
    : [maze.start];

  return hasReachableExit({
    starts: startPoints,
    end: maze.end,
    blocked,
    getNeighbors: (pos) => getLabyNeighbors(maze, pos),
    requireAllStarts: true,
  });
}

function openLabyPassage(maze, a, b) {
  const cellA = getLabyCell(maze, a);
  const cellB = getLabyCell(maze, b);
  if (!cellA || !cellB) return false;

  const dr = Number(b[0]) - Number(a[0]);
  const dc = Number(b[1]) - Number(a[1]);
  const dir = Object.entries(LABY_DIRS).find(([, delta]) => delta.dr === dr && delta.dc === dc)?.[0];
  if (!dir) return false;

  const opposite = LABY_OPPOSITE_DIR[dir];
  if (!opposite) return false;
  cellA[dir.toLowerCase()] = true;
  cellB[opposite.toLowerCase()] = true;
  return true;
}

function closeLabyPassage(maze, a, b) {
  const cellA = getLabyCell(maze, a);
  const cellB = getLabyCell(maze, b);
  if (!cellA || !cellB) return false;

  const dr = Number(b[0]) - Number(a[0]);
  const dc = Number(b[1]) - Number(a[1]);
  const dir = Object.entries(LABY_DIRS).find(([, delta]) => delta.dr === dr && delta.dc === dc)?.[0];
  if (!dir) return false;

  const opposite = LABY_OPPOSITE_DIR[dir];
  if (!opposite) return false;
  cellA[dir.toLowerCase()] = false;
  cellB[opposite.toLowerCase()] = false;
  return true;
}

function findLabyPathWithBlockedEdges(maze, startPos, endPos, blockedEdges = new Set(), blockedCells = new Set()) {
  if (!maze || !Array.isArray(startPos) || !Array.isArray(endPos)) return [];

  const startKey = labyPosKey(startPos);
  const endKey = labyPosKey(endPos);
  if (!startKey || !endKey) return [];
  if (blockedCells.has(startKey) || blockedCells.has(endKey)) return [];

  const queue = [cloneJson(startPos, [0, 0])];
  const visited = new Set([startKey]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = labyPosKey(current);
    if (currentKey === endKey) {
      const path = [];
      let cursor = currentKey;
      while (cursor) {
        const parsed = labyParsePosKey(cursor);
        if (!parsed) break;
        path.push(parsed);
        cursor = parent.get(cursor) || null;
      }
      path.reverse();
      return path;
    }

    getLabyNeighbors(maze, current).forEach((next) => {
      const nextKey = labyPosKey(next);
      if (!nextKey || visited.has(nextKey)) return;
      if (blockedCells.has(nextKey)) return;
      const edgeKey = [currentKey, nextKey].sort().join('|');
      if (blockedEdges.has(edgeKey)) return;
      visited.add(nextKey);
      parent.set(nextKey, currentKey);
      queue.push(next);
    });
  }

  return [];
}

function countLabySafePaths(maze, startPos, endPos, blockedCells = new Set(), limit = 2) {
  const startKey = labyPosKey(startPos);
  const endKey = labyPosKey(endPos);
  if (!startKey || !endKey || blockedCells.has(startKey) || blockedCells.has(endKey)) return 0;

  let count = 0;
  const visited = new Set([startKey]);
  const walk = (pos) => {
    if (count >= limit) return;
    const key = labyPosKey(pos);
    if (key === endKey) {
      count += 1;
      return;
    }

    getLabyNeighbors(maze, pos).forEach((next) => {
      const nextKey = labyPosKey(next);
      if (!nextKey || visited.has(nextKey) || blockedCells.has(nextKey)) return;
      visited.add(nextKey);
      walk(next);
      visited.delete(nextKey);
    });
  };

  walk(startPos);
  return count;
}

function getClosedLabyEdges(maze) {
  const cells = Array.isArray(maze?.cells) ? maze.cells : [];
  const rows = cells.length;
  const cols = Array.isArray(cells[0]) ? cells[0].length : 0;
  const closedEdges = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const from = [row, col];
      const cell = getLabyCell(maze, from);
      if (!cell) continue;
      if (col + 1 < cols && !cell.e) closedEdges.push({ from, to: [row, col + 1] });
      if (row + 1 < rows && !cell.s) closedEdges.push({ from, to: [row + 1, col] });
    }
  }

  return closedEdges;
}

function addLabyRiskyRoutes(maze, safePath, traps, targetCount) {
  const path = Array.isArray(safePath) ? safePath : [];
  if (!maze || path.length < 4 || targetCount <= 0) return;

  const safePathKeys = new Set(path.map(labyPosKey).filter(Boolean));
  const safeEdges = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const fromKey = labyPosKey(path[index]);
    const toKey = labyPosKey(path[index + 1]);
    if (fromKey && toKey) safeEdges.push([fromKey, toKey].sort().join('|'));
  }

  const closedEdges = getClosedLabyEdges(maze)
    .map((edge) => ({
      ...edge,
      priority: [edge.from, edge.to].reduce((score, pos) => (
        score + (safePathKeys.has(labyPosKey(pos)) ? 4 : 0)
        + (countOpenLabyEdges(maze, pos) >= 2 ? 1 : 0)
      ), 0),
      tieBreaker: Math.random(),
    }))
    .sort((a, b) => b.priority - a.priority || a.tieBreaker - b.tieBreaker);
  let added = 0;

  while (added < targetCount && closedEdges.length > 0) {
    const candidate = closedEdges.shift();
    if (!openLabyPassage(maze, candidate.from, candidate.to)) continue;

    const blockedEdge = safeEdges[Math.floor(Math.random() * safeEdges.length)];
    const alternativePath = findLabyPathWithBlockedEdges(maze, maze.start, maze.end, new Set([blockedEdge]), new Set(Object.keys(traps)));
    const trapCell = alternativePath.filter((pos) => {
      const key = labyPosKey(pos);
      return key && !safePathKeys.has(key) && !traps[key]
        && countOpenLabyEdges(maze, pos) >= 2
        && getLabyNeighbors(maze, pos).some((neighbor) => safePathKeys.has(labyPosKey(neighbor)));
    }).sort((a, b) => countOpenLabyEdges(maze, b) - countOpenLabyEdges(maze, a))[0];
    const trapKey = labyPosKey(trapCell);
    if (!trapKey) {
      closeLabyPassage(maze, candidate.from, candidate.to);
      continue;
    }

    traps[trapKey] = true;
    if (countLabySafePaths(maze, maze.start, maze.end, new Set(Object.keys(traps)), 2) !== 1) {
      delete traps[trapKey];
      closeLabyPassage(maze, candidate.from, candidate.to);
      continue;
    }

    added += 1;
  }
}

function enforceSingleLabySafePath(maze, traps, safePath) {
  const path = Array.isArray(safePath) && safePath.length > 0
    ? safePath
    : findLabyPath(maze, maze?.start, maze?.end, { blocked: new Set(Object.keys(traps || {})) });
  if (!maze || !traps || path.length < 4) return;

  const safePathKeys = new Set(path.map(labyPosKey).filter(Boolean));
  const safeEdges = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const fromKey = labyPosKey(path[index]);
    const toKey = labyPosKey(path[index + 1]);
    if (fromKey && toKey) safeEdges.push([fromKey, toKey].sort().join('|'));
  }

  let attempts = safeEdges.length * 2;
  while (countLabySafePaths(maze, maze.start, maze.end, new Set(Object.keys(traps)), 2) > 1 && attempts > 0) {
    attempts -= 1;
    const blockedEdge = safeEdges[Math.floor(Math.random() * safeEdges.length)];
    const blockedCells = new Set(Object.keys(traps));
    const alternativePath = findLabyPathWithBlockedEdges(maze, maze.start, maze.end, new Set([blockedEdge]), blockedCells);
    const trapCell = alternativePath.find((pos) => {
      const key = labyPosKey(pos);
      return key && !safePathKeys.has(key) && key !== labyPosKey(maze.start) && key !== labyPosKey(maze.end) && !traps[key];
    });
    const trapKey = labyPosKey(trapCell);
    if (trapKey) {
      traps[trapKey] = true;
    }
  }
}

function getLabyDeadEndKeys(maze, excludedKeys = new Set()) {
  const cells = Array.isArray(maze?.cells) ? maze.cells : [];
  const keys = [];
  cells.forEach((rowCells, row) => {
    if (!Array.isArray(rowCells)) return;
    rowCells.forEach((cell, col) => {
      if (!cell) return;
      const key = `${row},${col}`;
      if (excludedKeys.has(key)) return;
      if (countOpenLabyEdges(maze, [row, col]) <= 1) keys.push(key);
    });
  });
  return keys;
}

function carveLabyExtraLoops(maze, ratio = 0.1) {
  const cells = Array.isArray(maze?.cells) ? maze.cells : [];
  const rows = cells.length;
  const cols = Array.isArray(cells[0]) ? cells[0].length : 0;
  if (rows <= 1 || cols <= 1) return;

  const closedEdges = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const from = [row, col];
      const cell = getLabyCell(maze, from);
      if (!cell) continue;

      if (col + 1 < cols && !cell.e) {
        closedEdges.push({ from, to: [row, col + 1] });
      }
      if (row + 1 < rows && !cell.s) {
        closedEdges.push({ from, to: [row + 1, col] });
      }
    }
  }

  if (closedEdges.length === 0) return;
  const target = Math.max(1, Math.round(closedEdges.length * Math.min(0.2, Math.max(0.03, Number(ratio) || 0.1))));
  let opened = 0;

  while (opened < target && closedEdges.length > 0) {
    const index = Math.floor(Math.random() * closedEdges.length);
    const candidate = closedEdges[index];
    closedEdges.splice(index, 1);
    if (openLabyPassage(maze, candidate.from, candidate.to)) {
      opened += 1;
    }
  }
}

function pickLabyBoundaryCandidates(candidates, targetRatios, axisIndex) {
  const normalized = Array.isArray(candidates) ? [...candidates] : [];
  if (normalized.length === 0) return [];

  normalized.sort((a, b) => Number(a[axisIndex]) - Number(b[axisIndex]));
  const minAxis = Number(normalized[0][axisIndex]);
  const maxAxis = Number(normalized[normalized.length - 1][axisIndex]);
  const selected = [];
  const used = new Set();

  (Array.isArray(targetRatios) ? targetRatios : []).forEach((ratio) => {
    const target = minAxis + ((maxAxis - minAxis) * Number(ratio || 0));
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    normalized.forEach((candidate) => {
      const key = labyPosKey(candidate);
      if (!key || used.has(key)) return;
      const axisValue = Number(candidate[axisIndex]);
      const spacingPenalty = selected.reduce((acc, current) => {
        return acc + (Math.abs(Number(current[axisIndex]) - axisValue) < 2 ? 100 : 0);
      }, 0);
      const score = Math.abs(axisValue - target) + spacingPenalty;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    const bestKey = labyPosKey(best);
    if (best && bestKey && !used.has(bestKey)) {
      used.add(bestKey);
      selected.push(best);
    }
  });

  normalized.forEach((candidate) => {
    const key = labyPosKey(candidate);
    if (!key || used.has(key)) return;
    used.add(key);
    selected.push(candidate);
  });

  return selected;
}

function openLabyOuterStart(maze, pos) {
  const cell = getLabyCell(maze, pos);
  if (!cell || !Array.isArray(pos)) return false;
  const row = Number(pos[0]);
  const col = Number(pos[1]);
  const rows = Array.isArray(maze?.cells) ? maze.cells.length : 0;
  const cols = Array.isArray(maze?.cells?.[0]) ? maze.cells[0].length : 0;

  if (row === 0) {
    cell.n = true;
    return true;
  }

  if (col === cols - 1) {
    cell.e = true;
    return true;
  }

  if (row === rows - 1) {
    cell.s = true;
    return true;
  }

  if (col === 0) {
    cell.w = true;
    return true;
  }

  return false;
}

function buildLabyStartPoints(maze, safePath, limit = 1) {
  // Single start only: keep the boundary-candidate scan/scoring but always return exactly 1 point.
  const normalizedLimit = clampInt(limit, 1, 1, 1);
  const cells = Array.isArray(maze?.cells) ? maze.cells : [];
  const rows = cells.length;
  const cols = Array.isArray(cells[0]) ? cells[0].length : 0;
  const blocked = new Set(Object.keys(maze?.traps || {}));
  const end = Array.isArray(maze?.end) ? maze.end : null;

  if (!rows || !cols || !Array.isArray(end)) {
    return Array.isArray(maze?.start) ? [cloneJson(maze.start, [0, 0])] : [[0, 0]];
  }

  const topCandidates = [];
  const rightCandidates = [];

  for (let col = 0; col < cols; col += 1) {
    const pos = [0, col];
    const key = labyPosKey(pos);
    if (!key || blocked.has(key) || isLabyPositionEqual(pos, end)) continue;
    if (findLabyPath(maze, pos, end, { blocked }).length > 0) {
      topCandidates.push(pos);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    const pos = [row, cols - 1];
    const key = labyPosKey(pos);
    if (!key || blocked.has(key) || isLabyPositionEqual(pos, end)) continue;
    if (findLabyPath(maze, pos, end, { blocked }).length > 0) {
      rightCandidates.push(pos);
    }
  }

  const selectedTop = pickLabyBoundaryCandidates(topCandidates, [0.34], 1).slice(0, 1);
  const selectedRight = pickLabyBoundaryCandidates(rightCandidates, [0.28, 0.72], 0).slice(0, Math.max(0, normalizedLimit - selectedTop.length));

  const unique = [];
  const seen = new Set();
  [...selectedTop, ...selectedRight].forEach((point) => {
    const key = labyPosKey(point);
    if (!key || seen.has(key)) return;
    seen.add(key);
    openLabyOuterStart(maze, point);
    unique.push(cloneJson(point, [0, 0]));
  });

  if (unique.length === 0 && Array.isArray(maze?.start)) {
    openLabyOuterStart(maze, maze.start);
    unique.push(cloneJson(maze.start, [0, 0]));
  }

  if (unique.length > 0) {
    maze.start = cloneJson(unique[0], [0, 0]);
  }

  return unique;
}

function resolveLabyParticipantStart(state, participantId) {
  const maze = state?.labyrinthe?.maze;
  if (!maze) return [0, 0];

  const startPoints = Array.isArray(maze.start_points) && maze.start_points.length > 0
    ? maze.start_points
    : [maze.start];

  const normalized = startPoints
    .filter((pos) => Array.isArray(pos) && Number.isInteger(Number(pos[0])) && Number.isInteger(Number(pos[1])))
    .map((pos) => [Number(pos[0]), Number(pos[1])]);
  if (normalized.length === 0) return cloneJson(maze.start, [0, 0]);

  const slot = Number(state?.labyrinthe?.parts?.[participantId]?.slot || 0);
  let index = 0;
  if (slot > 0) {
    index = (slot - 1) % normalized.length;
  } else {
    const seed = String(participantId || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    index = Math.abs(seed) % normalized.length;
  }

  return cloneJson(normalized[index], cloneJson(maze.start, [0, 0]));
}

function generateLabyTrapMap(maze, trapPercent) {
  const cells = Array.isArray(maze?.cells) ? maze.cells : [];
  const rows = cells.length;
  const cols = Array.isArray(cells[0]) ? cells[0].length : 0;
  const startPoints = Array.isArray(maze?.start_points) && maze.start_points.length > 0
    ? maze.start_points.slice(0, 1)
    : buildLabyStartPoints(maze, [], 1);
  maze.start_points = startPoints.map((point) => cloneJson(point, [0, 0]));
  maze.safe_start_points = maze.start_points;
  const safePathKeys = new Set();
  startPoints.forEach((startPoint) => {
    findLabyPath(maze, startPoint, maze?.end).forEach((pos) => {
      const key = labyPosKey(pos);
      if (key) safePathKeys.add(key);
    });
  });
  const ratio = Math.min(0.4, Math.max(0, Number(trapPercent) || 0));
  const trapCap = Math.min(8, Math.max(3, Math.floor((rows * cols) / 40) + 1));
  const availableCells = Math.max(0, (rows * cols) - safePathKeys.size);
  const targetCount = Math.min(trapCap, Math.round(availableCells * ratio * 0.5));
  const traps = {};
  addLabyRiskyRoutes(maze, findLabyPath(maze, maze?.start, maze?.end), traps, targetCount);

  const blocked = new Set(Object.keys(traps));
  let safePath = findLabyPath(maze, maze?.start, maze?.end, { blocked });
  while (safePath.length === 0 && blocked.size > 0) {
    const firstBlocked = blocked.values().next().value;
    blocked.delete(firstBlocked);
    delete traps[firstBlocked];
    safePath = findLabyPath(maze, maze?.start, maze?.end, { blocked });
  }

  maze.start_points = buildLabyStartPoints(maze, safePath, 1);
  maze.safe_start_points = maze.start_points;
  enforceSingleLabySafePath(maze, traps, safePath);
  maze.traps = traps;
  filterLabyAccessibleTraps(maze);
  maze.safe_path = findLabyPath(maze, maze?.start, maze?.end, { blocked: new Set(Object.keys(traps)) });
  return traps;
}

function filterLabyAccessibleTraps(maze) {
  const traps = maze?.traps && typeof maze.traps === 'object' ? maze.traps : {};
  const trapKeys = Object.keys(traps);
  const startPoints = Array.isArray(maze?.start_points) && maze.start_points.length > 0
    ? maze.start_points
    : [maze?.start];
  const endKey = labyPosKey(maze?.end);

  trapKeys.forEach((trapKey) => {
    const trapPos = labyParsePosKey(trapKey);
    if (!trapPos) {
      delete traps[trapKey];
      return;
    }

    const blocked = new Set(Object.keys(traps));
    blocked.delete(trapKey);
    const reachable = startPoints.some((start) => {
      const path = findLabyPath(maze, start, trapPos, { blocked });
      return path.length > 0 && !path.some((pos) => labyPosKey(pos) === endKey);
    });

    if (!reachable) {
      delete traps[trapKey];
    }
  });

  return traps;
}

function normalizeLabyMaze(rawMaze, cfg) {
  const maze = rawMaze && typeof rawMaze === 'object' ? cloneJson(rawMaze, null) : null;
  if (!maze || !Array.isArray(maze.start) || !Array.isArray(maze.end) || !Array.isArray(maze.cells)) {
    return null;
  }

  const traps = {};
  if (Array.isArray(maze.traps)) {
    maze.traps.forEach((entry) => {
      if (!Array.isArray(entry)) return;
      const row = Number(entry[0]);
      const col = Number(entry[1]);
      if (!Number.isInteger(row) || !Number.isInteger(col)) return;
      traps[`${row},${col}`] = true;
    });
  }

  if (Object.keys(traps).length === 0) {
    maze.traps = generateLabyTrapMap(maze, cfg?.trap_percent);
  } else {
    maze.traps = traps;
    const blocked = new Set(Object.keys(traps));
    const safePath = findLabyPath(maze, maze.start, maze.end, { blocked });
    maze.start_points = buildLabyStartPoints(maze, safePath, 1);
    filterLabyAccessibleTraps(maze);
    maze.safe_path = findLabyPath(maze, maze.start, maze.end, { blocked: new Set(Object.keys(maze.traps || {})) });
  }

  if (!Array.isArray(maze.start_points) || maze.start_points.length === 0) {
    const fallbackSafePath = Array.isArray(maze.safe_path) ? maze.safe_path : findLabyPath(maze, maze.start, maze.end);
    maze.start_points = buildLabyStartPoints(maze, fallbackSafePath, 1);
  }

  if (!Array.isArray(maze.safe_path) || maze.safe_path.length === 0) {
    maze.safe_path = findLabyPath(maze, maze.start, maze.end, { blocked: new Set(Object.keys(maze.traps || {})) });
  }

  return maze;
}

function buildGeneratedLabyMaze(cfg) {
  const rows = clampInt(cfg?.rows != null ? cfg.rows : cfg?.r, 10, 6, 20);
  const cols = clampInt(cfg?.cols != null ? cfg.cols : cfg?.c, 10, 6, 20);
  const grid = Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => ({ n: false, e: false, s: false, w: false }))
  ));
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [[0, 0]];
  let previousDir = null;
  visited[0][0] = true;

  const deltas = [
    { dr: -1, dc: 0, key: 'n', opposite: 's' },
    { dr: 0, dc: 1, key: 'e', opposite: 'w' },
    { dr: 1, dc: 0, key: 's', opposite: 'n' },
    { dr: 0, dc: -1, key: 'w', opposite: 'e' }
  ];

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1];
    const neighbors = deltas
      .map((delta) => ({
        ...delta,
        nr: row + delta.dr,
        nc: col + delta.dc
      }))
      .filter((entry) => (
        entry.nr >= 0
        && entry.nr < rows
        && entry.nc >= 0
        && entry.nc < cols
        && !visited[entry.nr][entry.nc]
      ));

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const straight = previousDir ? neighbors.find((entry) => entry.key === previousDir) : null;
    const picked = straight && Math.random() < 0.58
      ? straight
      : neighbors[Math.floor(Math.random() * neighbors.length)];
    grid[row][col][picked.key] = true;
    grid[picked.nr][picked.nc][picked.opposite] = true;
    visited[picked.nr][picked.nc] = true;
    stack.push([picked.nr, picked.nc]);
    previousDir = picked.key;
  }

  const startCandidates = [
    [0, Math.max(1, Math.min(cols - 2, Math.floor(cols * 0.34)))],
    [Math.max(1, Math.min(rows - 2, Math.floor(rows * 0.28))), cols - 1],
    [Math.max(1, Math.min(rows - 2, Math.floor(rows * 0.72))), cols - 1],
  ];
  const exitCandidates = Array.from({ length: rows }, (_, row) => (
    Array.from({ length: cols }, (_, col) => [row, col])
  )).flat();
  const farthest = pickFarthestExit({
    starts: startCandidates,
    candidates: exitCandidates,
    getPath: (start, end) => findLabyPath({ cells: grid }, start, end),
  }) || [rows - 1, cols - 1];

  // Keep the generated grid a perfect maze (spanning tree): guarantees exactly one valid
  // path between any two cells, so every player's start has a single route to the exit.
  return {
    start: [0, 0],
    end: farthest,
    cells: grid,
    traps: {}
  };
}

function buildValidatedLabyMaze(cfg, maxAttempts = 12) {
  return generateSolvableMaze({
    generate: () => normalizeLabyMaze(buildGeneratedLabyMaze(cfg), cfg),
    isSolvable: hasLabySafePath,
    maxAttempts,
  });
}

// Scales difficulty per level (bigger grid, more traps) while the run stays inside a single ~20min timer.
function buildLabyLevelConfig(baseCfg, level) {
  const growth = clampInt(level, 1, 1, 6) - 1;
  return {
    ...baseCfg,
    rows: clampInt(Number(baseCfg?.rows || 10) + (growth * 2), baseCfg?.rows || 10, 10, 20),
    cols: clampInt(Number(baseCfg?.cols || 10) + (growth * 2), baseCfg?.cols || 10, 10, 20),
    trap_percent: Math.min(0.4, Number(baseCfg?.trap_percent || 0.18) + (growth * 0.04)),
  };
}

function advanceLabyLevel(state) {
  const laby = state.labyrinthe;
  const levelsTotal = clampInt(laby.levels_total, 1, 1, 6);
  const nextLevel = clampInt(Number(laby.level || 1) + 1, 2, 2, levelsTotal);
  const levelCfg = buildLabyLevelConfig(laby.cfg, nextLevel);

  laby.level = nextLevel;
  laby.winner_participant_id = null;
  laby.result = null;
  laby.reveal_exit_to_all = false;
  laby.revealed_cells = {};
  laby.revealed_traps = {};
  laby.revealed_walls = {};
  // Persist the level-scaled dimensions: the frontend derives its render grid size from laby.cfg, not
  // from maze.cells directly, so a stale cfg here crops/hides the actual (bigger) generated maze.
  laby.cfg = {
    ...laby.cfg,
    rows: levelCfg.rows,
    cols: levelCfg.cols,
    r: levelCfg.rows,
    c: levelCfg.cols,
    trap_percent: levelCfg.trap_percent
  };
  laby.maze = buildValidatedLabyMaze(levelCfg);
  laby.col = {
    max: laby.cfg.mca,
    sec: null,
    fr: null,
    pos: [0, 0],
    path: [[0, 0]],
    att: 0
  };

  Object.values(laby.parts || {}).forEach((participant) => {
    if (!participant) return;
    const stillAlive = Number(participant.lives_remaining || 0) > 0;
    participant.solo = {
      st: stillAlive ? 'pending' : 'failed',
      ss: false,
      path: [],
      dec: [],
      fail: null,
      pos: null,
      rg: false,
      et: null,
      choosing_start: stillAlive
    };
    if (!stillAlive) {
      participant.ls = true;
    }
  });

  ensureLabyRuntimeReady(state);
  return nextLevel;
}

function ensureLabyRuntimeReady(state, options = {}) {
  if (!state || state.challengeKey !== 'labyrinthe_live_v1') return false;
  if (!state.labyrinthe || typeof state.labyrinthe !== 'object') {
    state.labyrinthe = buildInitialLabyState(state.config || {});
  }

  const forceSolo = options.forceSolo === true;
  const currentCfg = state.labyrinthe.cfg || normalizeLabyConfig(state.config || {});
  state.labyrinthe.cfg = currentCfg;
  let changed = false;

  if (!Number.isInteger(state.labyrinthe.level) || state.labyrinthe.level < 1) {
    state.labyrinthe.level = 1;
    changed = true;
  }
  if (!Number.isInteger(state.labyrinthe.levels_total) || state.labyrinthe.levels_total < 1) {
    state.labyrinthe.levels_total = clampInt(currentCfg.levels_total, 3, 1, 6);
    changed = true;
  }

  if (!state.labyrinthe.maze) {
    state.labyrinthe.maze = buildValidatedLabyMaze(buildLabyLevelConfig(currentCfg, state.labyrinthe.level));
    changed = true;
  }

  if (state.labyrinthe.maze && (forceSolo || String(state.labyrinthe.phase || '').trim() === 'setup')) {
    state.labyrinthe.phase = 'active';
    changed = true;
  }

  if (state.labyrinthe.maze) {
    const startPos = cloneJson(state.labyrinthe.maze.start, [0, 0]);
    const startPoints = Array.isArray(state.labyrinthe.maze.start_points) && state.labyrinthe.maze.start_points.length > 0
      ? state.labyrinthe.maze.start_points
      : [startPos];
    if (!state.labyrinthe.revealed_cells || typeof state.labyrinthe.revealed_cells !== 'object') {
      state.labyrinthe.revealed_cells = {};
      changed = true;
    }
    startPoints.forEach((point) => {
      const key = labyPosKey(point);
      if (key && state.labyrinthe.revealed_cells[key] !== true) {
        state.labyrinthe.revealed_cells[key] = true;
        changed = true;
      }
    });
    if (!Array.isArray(state.labyrinthe.col?.pos)) {
      state.labyrinthe.col.pos = cloneJson(startPos, [0, 0]);
      changed = true;
    }
    if (!Array.isArray(state.labyrinthe.col?.path) || state.labyrinthe.col.path.length === 0) {
      state.labyrinthe.col.path = [cloneJson(startPos, [0, 0])];
      changed = true;
    }
  }

  if (!state.labyrinthe.parts || typeof state.labyrinthe.parts !== 'object') {
    state.labyrinthe.parts = {};
    changed = true;
  }

  Object.keys(state.labyrinthe.parts).forEach((participantId) => {
    const before = JSON.stringify(state.labyrinthe.parts[participantId] || {});
    ensureLabyParticipantRunState(state, state.labyrinthe.parts[participantId]);
    const after = JSON.stringify(state.labyrinthe.parts[participantId] || {});
    if (before !== after) changed = true;
  });

  return changed;
}

function ensureLabyParticipantRunState(state, participant) {
  if (!participant || !state?.labyrinthe?.maze) return;
  const participantId = Object.entries(state?.labyrinthe?.parts || {}).find(([, value]) => value === participant)?.[0];
  const startPos = resolveLabyParticipantStart(state, participantId);
  const configuredLives = clampInt(state.labyrinthe?.cfg?.lives, 3, 1, 8);
  const livesRemaining = clampInt(participant.lives_remaining, configuredLives, 0, configuredLives);
  participant.lives_remaining = livesRemaining;
  if (!Number.isFinite(Number(participant.total_cells_traversed))) {
    participant.total_cells_traversed = 0;
  }
  if (!participant.solo || typeof participant.solo !== 'object') {
    participant.solo = {
      st: livesRemaining > 0 ? 'pending' : 'failed',
      ss: false,
      path: [startPos],
      dec: [],
      fail: null,
      pos: startPos,
      rg: false,
      et: null
    };
  }
  if (participant.solo.ss !== true) {
    participant.solo.ss = false;
  }
  if (!Array.isArray(participant.solo.pos) && !participant.solo.choosing_start) {
    participant.solo.pos = startPos;
  }
  if ((!Array.isArray(participant.solo.path) || participant.solo.path.length === 0) && !participant.solo.choosing_start) {
    participant.solo.path = [cloneJson(participant.solo.pos || startPos, startPos)];
  }
  if (participant.solo.rg === true) {
    participant.solo.st = 'done';
  } else if (participant.lives_remaining <= 0) {
    participant.solo.st = 'failed';
    participant.ls = true;
  }
}

function applyLabySoloStartSelection(state, participantId, startPos) {
  if (!state?.labyrinthe?.maze) {
    return { ok: false, reason: 'missing-maze' };
  }
  if (String(state.labyrinthe.phase || '').trim() === 'done') {
    return { ok: false, reason: 'already-finished' };
  }

  const participant = state.labyrinthe.parts?.[participantId];
  if (!participant) {
    return { ok: false, reason: 'missing-participant' };
  }

  ensureLabyParticipantRunState(state, participant);

  const normalizedStart = Array.isArray(startPos)
    ? [Number(startPos[0]), Number(startPos[1])]
    : null;
  const nextKey = labyPosKey(normalizedStart);
  const allowedStarts = Array.isArray(state.labyrinthe.maze.start_points) && state.labyrinthe.maze.start_points.length > 0
    ? state.labyrinthe.maze.start_points
    : [state.labyrinthe.maze.start];
  const allowedKeys = new Set(allowedStarts.map((pos) => labyPosKey(pos)).filter(Boolean));

  if (!nextKey || !allowedKeys.has(nextKey)) {
    return { ok: false, reason: 'invalid-start' };
  }

  const isChoosingStart = participant.solo.choosing_start === true;
  const hasMovedAway = Array.isArray(participant.solo?.path) && participant.solo.path.length > 1;
  if (hasMovedAway && !isChoosingStart) {
    return { ok: false, reason: 'start-locked' };
  }

  participant.solo.pos = cloneJson(normalizedStart, [0, 0]);
  participant.solo.path = [cloneJson(normalizedStart, [0, 0])];
  participant.solo.st = 'pending';
  participant.solo.ss = true;
  participant.solo.fail = null;
  participant.solo.choosing_start = false;

  if (!state.labyrinthe.revealed_cells || typeof state.labyrinthe.revealed_cells !== 'object') {
    state.labyrinthe.revealed_cells = {};
  }
  state.labyrinthe.revealed_cells[nextKey] = true;

  return {
    ok: true,
    position: cloneJson(normalizedStart, [0, 0]),
  };
}

function isLabyPositionBlocked(maze, pos) {
  return countOpenLabyEdges(maze, pos) <= 0;
}

function isLabySoloStuckAtDeadEnd(maze, currentPos, path) {
  const normalizedCurrent = Array.isArray(currentPos)
    ? [Number(currentPos[0]), Number(currentPos[1])]
    : null;
  if (!normalizedCurrent) return false;

  const cell = getLabyCell(maze, normalizedCurrent);
  if (!cell) return true;

  const visitedKeys = new Set((Array.isArray(path) ? path : []).map((pos) => labyPosKey(pos)).filter(Boolean));
  const hasForwardOption = Object.entries(LABY_DIRS).some(([dir, delta]) => {
    if (!isLabyMoveAllowed(maze, normalizedCurrent, dir)) return false;
    const nextPos = [normalizedCurrent[0] + Number(delta.dr || 0), normalizedCurrent[1] + Number(delta.dc || 0)];
    if (!getLabyCell(maze, nextPos)) return false;
    const nextKey = labyPosKey(nextPos);
    return Boolean(nextKey) && !visitedKeys.has(nextKey);
  });

  return !hasForwardOption;
}

function isLabyTrapActive(trapMap, key) {
  if (!trapMap || typeof trapMap !== 'object' || !key) return false;
  return Object.prototype.hasOwnProperty.call(trapMap, key);
}

function finalizeLabyChallenge(state, result = {}) {
  if (!state || state.challengeKey !== 'labyrinthe_live_v1' || !state.labyrinthe) {
    return;
  }

  const normalizedStatus = String(result.status || '').trim().toLowerCase() || 'failed';
  const normalizedReason = String(result.reason || '').trim().toLowerCase() || 'unspecified';

  state.labyrinthe.phase = 'done';
  state.labyrinthe.reveal_exit_to_all = true;
  state.labyrinthe.result = {
    status: normalizedStatus,
    reason: normalizedReason,
    finished_at_ms: Date.now(),
    winner_participant_id: result.winner_participant_id != null ? String(result.winner_participant_id) : null,
  };

  stopTimer(state);
  state.timer.status = normalizedStatus === 'success' ? 'completed' : 'stopped';
  state.summary = buildSummary(state);
}

function applyLabySoloPenalty(state, participant, participantId, outcome, impactedPos, dir) {
  const normalizedOutcome = String(outcome || '').trim() || 'blocked';
  const normalizedPos = Array.isArray(impactedPos)
    ? [Number(impactedPos[0]), Number(impactedPos[1])]
    : [0, 0];

  participant.lives_remaining = Math.max(0, Number(participant.lives_remaining || 0) - 1);
  participant.solo.dec.push({ type: normalizedOutcome, at: cloneJson(normalizedPos, [0, 0]), dir: String(dir || '').trim(), at_ms: Date.now() });

  if (participant.lives_remaining <= 0) {
    participant.solo.st = 'failed';
    participant.solo.fail = cloneJson(normalizedPos, [0, 0]);
    participant.solo.pos = cloneJson(normalizedPos, [0, 0]);
    participant.solo.path = [];
    participant.solo.choosing_start = false;
    participant.ls = true;
  } else {
    // Participant must choose a new start point before moving again
    participant.solo.st = 'pending';
    participant.solo.pos = null;
    participant.solo.path = [];
    participant.solo.ss = false;
    participant.solo.choosing_start = true;
  }

  if (!state.labyrinthe.revealed_cells || typeof state.labyrinthe.revealed_cells !== 'object') {
    state.labyrinthe.revealed_cells = {};
  }

  const everyoneLost = Object.values(state.labyrinthe.parts || {}).every((part) => Number(part?.lives_remaining || 0) <= 0);
  if (everyoneLost) {
    state.labyrinthe.winner_participant_id = null;
    finalizeLabyChallenge(state, {
      status: 'failed',
      reason: 'no_lives',
      winner_participant_id: null,
    });
  }

  return {
    ok: true,
    outcome: normalizedOutcome,
    dir: String(dir || '').trim().toUpperCase() || null,
    position: Array.isArray(participant.solo.pos) ? cloneJson(participant.solo.pos, [0, 0]) : cloneJson(normalizedPos, [0, 0]),
    triggered_position: cloneJson(normalizedPos, [0, 0]),
    remaining_lives: participant.lives_remaining,
    all_lost: everyoneLost,
  };
}

function applyLabySoloMove(room, state, participantId, dir) {
  if (!state?.labyrinthe?.maze) {
    return { ok: false, reason: 'missing-maze' };
  }
  if (String(state.labyrinthe.phase || '').trim() === 'done') {
    return { ok: false, reason: 'already-finished' };
  }

  const participant = state.labyrinthe.parts?.[participantId];
  if (!participant) {
    return { ok: false, reason: 'missing-participant' };
  }

  ensureLabyParticipantRunState(state, participant);
  if (participant.solo.rg === true) {
    return { ok: false, reason: 'already-winner' };
  }
  if (Number(participant.lives_remaining || 0) <= 0) {
    return { ok: false, reason: 'no-lives' };
  }
  if (participant.solo.choosing_start === true) {
    return { ok: false, reason: 'start-required' };
  }
  if (participant.solo.ss !== true && Number(participant.solo?.dec?.length || 0) === 0) {
    return { ok: false, reason: 'start-required' };
  }

  const normalizedDir = String(dir || '').trim().toUpperCase();
  const delta = LABY_DIRS[normalizedDir];
  if (!delta) {
    return { ok: false, reason: 'invalid-direction' };
  }

  const maze = state.labyrinthe.maze;
  if (!state.labyrinthe.revealed_cells || typeof state.labyrinthe.revealed_cells !== 'object') {
    state.labyrinthe.revealed_cells = {};
  }
  if (!state.labyrinthe.revealed_traps || typeof state.labyrinthe.revealed_traps !== 'object') {
    state.labyrinthe.revealed_traps = {};
  }
  if (!state.labyrinthe.revealed_walls || typeof state.labyrinthe.revealed_walls !== 'object') {
    state.labyrinthe.revealed_walls = {};
  }
  const currentPos = Array.isArray(participant.solo.pos)
    ? [Number(participant.solo.pos[0]), Number(participant.solo.pos[1])]
    : resolveLabyParticipantStart(state, participantId);
  const currentCellKey = labyPosKey(currentPos);
  if (currentCellKey) {
    state.labyrinthe.revealed_cells[currentCellKey] = true;
  }

  if (isLabyPositionBlocked(maze, currentPos)) {
    return applyLabySoloPenalty(state, participant, participantId, 'blocked', currentPos, normalizedDir);
  }

  if (isLabySoloStuckAtDeadEnd(maze, currentPos, participant.solo.path || [])) {
    return applyLabySoloPenalty(state, participant, participantId, 'blocked', currentPos, normalizedDir);
  }

  const isAllowed = isLabyMoveAllowed(maze, currentPos, normalizedDir);
  if (!isAllowed) {
    if (currentCellKey) {
      const revealedWalls = state.labyrinthe.revealed_walls[currentCellKey] && typeof state.labyrinthe.revealed_walls[currentCellKey] === 'object'
        ? state.labyrinthe.revealed_walls[currentCellKey]
        : {};
      revealedWalls[normalizedDir] = true;
      state.labyrinthe.revealed_walls[currentCellKey] = revealedWalls;
    }
    participant.solo.st = 'playing';
    participant.solo.dec.push({ type: 'wall', from: cloneJson(currentPos, [0, 0]), dir: normalizedDir, at_ms: Date.now() });
    return { ok: true, outcome: 'wall', position: cloneJson(currentPos, [0, 0]), dir: normalizedDir };
  }

  const nextPos = [Number(currentPos[0]) + delta.dr, Number(currentPos[1]) + delta.dc];
  if (!getLabyCell(maze, nextPos)) {
    return { ok: false, reason: 'out-of-bounds' };
  }

  const visitedKeys = new Set((participant.solo.path || []).map((pos) => labyPosKey(pos)).filter(Boolean));
  if (visitedKeys.has(labyPosKey(nextPos))) {
    participant.solo.dec.push({ type: 'backtrack', from: cloneJson(currentPos, [0, 0]), tried: cloneJson(nextPos, [0, 0]), dir: normalizedDir, at_ms: Date.now() });
    return {
      ok: true,
      outcome: 'backtrack',
      position: cloneJson(currentPos, [0, 0]),
      triggered_position: cloneJson(nextPos, [0, 0]),
      dir: normalizedDir,
      remaining_lives: participant.lives_remaining,
    };
  }

  const nextKey = labyPosKey(nextPos);
  if (nextKey) {
    state.labyrinthe.revealed_cells[nextKey] = true;
  }
  participant.solo.pos = cloneJson(nextPos, [0, 0]);
  participant.solo.path.push(cloneJson(nextPos, [0, 0]));
  participant.solo.st = 'playing';
  // Cumulative across levels (unlike solo.path, which resets on advanceLabyLevel) - feeds the collective score.
  participant.total_cells_traversed = Number(participant.total_cells_traversed || 0) + 1;

  const trapMap = maze.traps && typeof maze.traps === 'object' ? maze.traps : {};
  if (isLabyTrapActive(trapMap, nextKey)) {
    state.labyrinthe.revealed_traps[nextKey] = {
      state: 'triggered',
      at_ms: Date.now()
    };
    return applyLabySoloPenalty(state, participant, participantId, 'trap', nextPos, normalizedDir);
  }

  // Entering a dead end costs a life immediately, without waiting for the next move attempt.
  if (!isLabyPositionEqual(nextPos, maze.end) && isLabySoloStuckAtDeadEnd(maze, nextPos, participant.solo.path)) {
    return applyLabySoloPenalty(state, participant, participantId, 'blocked', nextPos, normalizedDir);
  }

  participant.solo.dec.push({ type: 'free', at: cloneJson(nextPos, [0, 0]), dir: normalizedDir, at_ms: Date.now() });
  if (isLabyPositionEqual(nextPos, maze.end)) {
    const levelsTotal = clampInt(state.labyrinthe.levels_total, 1, 1, 6);
    const currentLevel = clampInt(state.labyrinthe.level, 1, 1, levelsTotal);
    const remainingLivesAtExit = participant.lives_remaining;

    if (currentLevel < levelsTotal) {
      const nextLevel = advanceLabyLevel(state);
      return {
        ok: true,
        outcome: 'level_complete',
        dir: normalizedDir,
        position: cloneJson(nextPos, [0, 0]),
        remaining_lives: remainingLivesAtExit,
        winner: String(participantId),
        level: nextLevel,
        levels_total: levelsTotal,
      };
    }

    participant.solo.st = 'done';
    participant.solo.rg = true;
    state.labyrinthe.winner_participant_id = String(participantId);
    finalizeLabyChallenge(state, {
      status: 'success',
      reason: 'exit',
      winner_participant_id: String(participantId),
    });
    return {
      ok: true,
      outcome: 'exit',
      dir: normalizedDir,
      position: cloneJson(nextPos, [0, 0]),
      remaining_lives: participant.lives_remaining,
      winner: String(participantId),
    };
  }

  return {
    ok: true,
    outcome: 'free',
    dir: normalizedDir,
    position: cloneJson(nextPos, [0, 0]),
    remaining_lives: participant.lives_remaining,
  };
}

function getConnectedLabyParticipantIds(state) {
  const parts = state && state.labyrinthe && state.labyrinthe.parts && typeof state.labyrinthe.parts === 'object'
    ? state.labyrinthe.parts
    : {};

  const connectedIds = Object.entries(parts)
    .filter(([, participant]) => participant && participant.connected === true)
    .map(([participantId]) => participantId);

  if (connectedIds.length > 0) {
    return connectedIds;
  }

  return Object.keys(parts);
}

function buildLabyVoteCounts(state, participantIds) {
  const counts = { N: 0, E: 0, S: 0, W: 0 };
  const parts = state.labyrinthe && state.labyrinthe.parts ? state.labyrinthe.parts : {};

  participantIds.forEach((participantId) => {
    const vote = String(parts[participantId]?.vote || '').trim().toUpperCase();
    if (counts[vote] != null) {
      counts[vote] += 1;
    }
  });

  return counts;
}

function isLabyPositionEqual(a, b) {
  return Array.isArray(a)
    && Array.isArray(b)
    && Number(a[0]) === Number(b[0])
    && Number(a[1]) === Number(b[1]);
}

function ensureLabyParticipant(state, participantId, displayName, slot) {
  if (!state.labyrinthe || typeof state.labyrinthe !== 'object') {
    state.labyrinthe = buildInitialLabyState(state.config || {});
  }

  const parts = state.labyrinthe.parts && typeof state.labyrinthe.parts === 'object'
    ? state.labyrinthe.parts
    : {};
  state.labyrinthe.parts = parts;

  if (!parts[participantId] || typeof parts[participantId] !== 'object') {
    parts[participantId] = defaultLabyParticipant(displayName, slot);
  }

  parts[participantId].name = displayName || parts[participantId].name || `Participant ${slot}`;
  parts[participantId].slot = slot;
  parts[participantId].connected = true;
  if (state.labyrinthe && state.labyrinthe.maze) {
    ensureLabyParticipantRunState(state, parts[participantId]);
  }
}

  return {
    normalizeLabyConfig,
    defaultLabyParticipant,
    buildInitialLabyState,
    cloneJson,
    countOpenLabyEdges,
    getLabyCell,
    isLabyMoveAllowed,
    labyPosKey,
    labyParsePosKey,
    getLabyNeighbors,
    findLabyPath,
    findLabyPathWithBlockedEdges,
    countLabySafePaths,
    hasLabySafePath,
    openLabyPassage,
    closeLabyPassage,
    getClosedLabyEdges,
    addLabyRiskyRoutes,
    enforceSingleLabySafePath,
    getLabyDeadEndKeys,
    carveLabyExtraLoops,
    pickLabyBoundaryCandidates,
    openLabyOuterStart,
    buildLabyStartPoints,
    resolveLabyParticipantStart,
    generateLabyTrapMap,
    filterLabyAccessibleTraps,
    normalizeLabyMaze,
    buildGeneratedLabyMaze,
    buildValidatedLabyMaze,
    buildLabyLevelConfig,
    advanceLabyLevel,
    ensureLabyRuntimeReady,
    ensureLabyParticipantRunState,
    applyLabySoloStartSelection,
    isLabyPositionBlocked,
    isLabySoloStuckAtDeadEnd,
    finalizeLabyChallenge,
    applyLabySoloPenalty,
    applyLabySoloMove,
    getConnectedLabyParticipantIds,
    buildLabyVoteCounts,
    isLabyPositionEqual,
    ensureLabyParticipant,
    LABY_DIRS,
    LABY_OPPOSITE_DIR,
  };
}

export { createLabyrintheLiveV1Engine };
