// Copy of backend/src/challenges/engines/labyrinthe_live_v1/maze-solvability.js (ES module syntax).
// Keep it in sync with the backend.

function posKey(pos) {
  if (!Array.isArray(pos)) return '';
  const row = Number(pos[0]);
  const col = Number(pos[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return '';
  return `${row},${col}`;
}

function hasReachableExit({ starts, end, blocked = new Set(), getNeighbors, requireAllStarts = false }) {
  const endKey = posKey(end);
  if (!endKey || typeof getNeighbors !== 'function') return false;

  const blockedKeys = blocked instanceof Set ? blocked : new Set(blocked || []);
  if (blockedKeys.has(endKey)) return false;

  const providedStarts = Array.isArray(starts) ? starts : [];
  const normalizedStarts = providedStarts
    .filter((start) => {
      const key = posKey(start);
      return key && !blockedKeys.has(key);
    });
  if (normalizedStarts.length === 0) return false;

  if (requireAllStarts) {
    if (normalizedStarts.length !== providedStarts.length) return false;
    return normalizedStarts.every((start) => hasReachableExit({
      starts: [start],
      end,
      blocked: blockedKeys,
      getNeighbors,
    }));
  }

  const queue = [];
  const visited = new Set();
  normalizedStarts.forEach((start) => {
    const key = posKey(start);
    if (!key || blockedKeys.has(key) || visited.has(key)) return;
    visited.add(key);
    queue.push(start);
  });

  while (queue.length > 0) {
    const current = queue.shift();
    if (posKey(current) === endKey) return true;

    const neighbors = getNeighbors(current);
    (Array.isArray(neighbors) ? neighbors : []).forEach((next) => {
      const key = posKey(next);
      if (!key || blockedKeys.has(key) || visited.has(key)) return;
      visited.add(key);
      queue.push(next);
    });
  }

  return false;
}

function pickFarthestExit({ starts, candidates, getPath }) {
  const normalizedStarts = Array.isArray(starts) ? starts : [];
  const normalizedCandidates = Array.isArray(candidates) ? candidates : [];
  if (normalizedStarts.length === 0 || normalizedCandidates.length === 0 || typeof getPath !== 'function') return null;

  return normalizedCandidates.reduce((best, candidate) => {
    const minDistance = normalizedStarts.reduce((min, start) => {
      const path = getPath(start, candidate);
      return Array.isArray(path) && path.length > 0
        ? Math.min(min, path.length - 1)
        : Number.NEGATIVE_INFINITY;
    }, Number.POSITIVE_INFINITY);

    if (!best || minDistance > best.minDistance) {
      return { candidate, minDistance };
    }
    return best;
  }, null)?.candidate || null;
}

function generateSolvableMaze({ generate, isSolvable, maxAttempts = 12 }) {
  if (typeof generate !== 'function' || typeof isSolvable !== 'function') {
    throw new TypeError('Maze generation and solvability functions are required');
  }

  const attempts = Math.max(1, Math.min(50, Number.parseInt(maxAttempts, 10) || 12));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const maze = generate();
    if (isSolvable(maze)) return maze;
  }

  throw new Error(`Unable to generate a solvable signal maze after ${attempts} attempts`);
}

export { generateSolvableMaze, hasReachableExit, pickFarthestExit };