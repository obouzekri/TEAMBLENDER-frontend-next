'use client';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './ProceduralMazeBoard.module.css';

const DIRS = Object.freeze([
  { key: 'N', dr: -1, dc: 0, opposite: 'S' },
  { key: 'E', dr: 0, dc: 1, opposite: 'W' },
  { key: 'S', dr: 1, dc: 0, opposite: 'N' },
  { key: 'W', dr: 0, dc: -1, opposite: 'E' },
]);

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const normalized = Number.isInteger(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, normalized));
}

function keyOf(pos) {
  if (!Array.isArray(pos)) return '';
  return `${Number(pos[0])},${Number(pos[1])}`;
}

function parseKey(raw) {
  const match = String(raw || '').match(/^(\d+),(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value) {
  const source = String(value || 'maze-seed');
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildGrid(rows, cols) {
  return Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => ({ N: false, E: false, S: false, W: false }))
  ));
}

function inBounds(rows, cols, row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function openPassage(cells, a, b) {
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  if (!inBounds(rows, cols, a[0], a[1]) || !inBounds(rows, cols, b[0], b[1])) return false;
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  const edge = DIRS.find((dir) => dir.dr === dr && dir.dc === dc);
  if (!edge) return false;
  cells[a[0]][a[1]][edge.key] = true;
  cells[b[0]][b[1]][edge.opposite] = true;
  return true;
}

function neighborsFrom(cells, row, col) {
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  const cell = cells[row]?.[col];
  if (!cell) return [];
  return DIRS
    .filter((dir) => cell[dir.key])
    .map((dir) => [row + dir.dr, col + dir.dc])
    .filter(([nr, nc]) => inBounds(rows, cols, nr, nc));
}

function chooseColumns(cols, count, rng) {
  const normalizedCount = Math.max(2, Math.min(Math.floor(cols / 2), count));
  const step = cols / (normalizedCount + 1);
  const picked = [];

  for (let i = 1; i <= normalizedCount; i += 1) {
    const jitter = Math.round((rng() - 0.5) * Math.max(1, step * 0.4));
    const col = Math.max(0, Math.min(cols - 1, Math.round(i * step) + jitter));
    picked.push(col);
  }

  const unique = [...new Set(picked)].sort((a, b) => a - b);
  while (unique.length < normalizedCount) {
    unique.push(Math.floor(rng() * cols));
  }
  return [...new Set(unique)].sort((a, b) => a - b);
}

function buildPerfectMaze(rows, cols, rng) {
  const cells = buildGrid(rows, cols);
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [[0, Math.floor(rng() * cols)]];
  visited[stack[0][0]][stack[0][1]] = true;

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1];
    const candidates = DIRS
      .map((dir) => ({ ...dir, nr: row + dir.dr, nc: col + dir.dc }))
      .filter((step) => inBounds(rows, cols, step.nr, step.nc) && !visited[step.nr][step.nc]);

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const next = candidates[Math.floor(rng() * candidates.length)];
    cells[row][col][next.key] = true;
    cells[next.nr][next.nc][next.opposite] = true;
    visited[next.nr][next.nc] = true;
    stack.push([next.nr, next.nc]);
  }

  return cells;
}

function shortestPath(cells, start, end) {
  const startKey = keyOf(start);
  const endKey = keyOf(end);
  if (!startKey || !endKey) return [];
  const queue = [start];
  const seen = new Set([startKey]);
  const parent = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = keyOf(current);
    if (currentKey === endKey) {
      const path = [];
      let cursor = currentKey;
      while (cursor) {
        const parsed = parseKey(cursor);
        if (!parsed) break;
        path.push(parsed);
        cursor = parent.get(cursor) || null;
      }
      path.reverse();
      return path;
    }

    neighborsFrom(cells, current[0], current[1]).forEach((next) => {
      const nextKey = keyOf(next);
      if (seen.has(nextKey)) return;
      seen.add(nextKey);
      parent.set(nextKey, currentKey);
      queue.push(next);
    });
  }

  return [];
}

function carveCorridor(cells, from, to) {
  const current = [from[0], from[1]];
  while (current[0] !== to[0]) {
    const step = current[0] < to[0] ? 1 : -1;
    const next = [current[0] + step, current[1]];
    openPassage(cells, current, next);
    current[0] = next[0];
  }
  while (current[1] !== to[1]) {
    const step = current[1] < to[1] ? 1 : -1;
    const next = [current[0], current[1] + step];
    openPassage(cells, current, next);
    current[1] = next[1];
  }
}

function countBranching(cells, row, col) {
  return neighborsFrom(cells, row, col).length;
}

function generateLayout(options) {
  const rows = clampInt(options.rows, 20, 10, 28);
  const cols = clampInt(options.cols, 20, 10, 30);
  const random = mulberry32(hashSeed(options.seed));
  const entryCount = clampInt(options.entryCount, 4, 3, 6);
  const exitCount = clampInt(options.exitCount, 4, 3, 6);

  const cells = buildPerfectMaze(rows, cols, random);

  const entries = chooseColumns(cols, entryCount, random);
  const exits = chooseColumns(cols, exitCount, random);
  const correctEntryCol = entries[Math.floor(random() * entries.length)];
  const correctExitCol = exits[Math.floor(random() * exits.length)];

  entries.forEach((col) => {
    cells[0][col].N = true;
  });
  exits.forEach((col) => {
    cells[rows - 1][col].S = true;
  });

  let mainPath = shortestPath(cells, [0, correctEntryCol], [rows - 1, correctExitCol]);
  if (mainPath.length > 8) {
    const first = mainPath[Math.floor(mainPath.length * 0.3)];
    const second = mainPath[Math.floor(mainPath.length * 0.7)];
    const linkA = [Math.max(0, first[0] - 1), Math.max(0, first[1] - 2)];
    const linkB = [Math.min(rows - 1, second[0] + 1), Math.min(cols - 1, second[1] + 2)];
    carveCorridor(cells, first, linkB);
    carveCorridor(cells, second, linkA);
  }

  mainPath = shortestPath(cells, [0, correctEntryCol], [rows - 1, correctExitCol]);
  const mainPathKeySet = new Set(mainPath.map((cell) => keyOf(cell)));

  const trapKeys = new Set();
  const branchCandidateIndexes = [];
  for (let i = 2; i < mainPath.length - 2; i += 1) {
    branchCandidateIndexes.push(i);
  }

  const wrongBranchTarget = Math.min(6, Math.max(3, Math.floor(mainPath.length * 0.12)));
  while (branchCandidateIndexes.length > 0 && trapKeys.size < wrongBranchTarget) {
    const index = Math.floor(random() * branchCandidateIndexes.length);
    const pathIndex = branchCandidateIndexes[index];
    branchCandidateIndexes.splice(index, 1);

    const pivot = mainPath[pathIndex];
    const prev = keyOf(mainPath[pathIndex - 1]);
    const next = keyOf(mainPath[pathIndex + 1]);
    const wrongNeighbors = neighborsFrom(cells, pivot[0], pivot[1])
      .map((pos) => ({ pos, key: keyOf(pos) }))
      .filter((entry) => entry.key !== prev && entry.key !== next);

    wrongNeighbors.forEach((entry) => {
      if (!mainPathKeySet.has(entry.key) && trapKeys.size < wrongBranchTarget + 2) {
        trapKeys.add(entry.key);
      }
    });
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const pos = [row, col];
      const key = keyOf(pos);
      if (mainPathKeySet.has(key)) continue;
      if (entries.includes(col) && row < 2) continue;
      if (exits.includes(col) && row > rows - 3) continue;
      const branching = countBranching(cells, row, col);
      if (branching === 1 && random() > 0.78) {
        trapKeys.add(key);
      }
    }
  }

  return {
    rows,
    cols,
    cells,
    entries,
    exits,
    correctEntryCol,
    correctExitCol,
    mainPath,
    traps: [...trapKeys],
  };
}

function movePos(pos, dir) {
  if (dir === 'N') return [pos[0] - 1, pos[1]];
  if (dir === 'E') return [pos[0], pos[1] + 1];
  if (dir === 'S') return [pos[0] + 1, pos[1]];
  if (dir === 'W') return [pos[0], pos[1] - 1];
  return pos;
}

function canMove(cells, pos, dir) {
  const cell = cells[pos[0]]?.[pos[1]];
  if (!cell) return false;
  if (!cell[dir]) return false;
  const next = movePos(pos, dir);
  return next[0] >= 0 && next[0] < cells.length && next[1] >= 0 && next[1] < cells[0].length;
}

export default function ProceduralMazeBoard({
  seed = 'teamblender-default',
  rows = 20,
  cols = 20,
  participantIndex = 0,
  totalPlayers = 4,
  showTrailByDefault = true,
}) {
  const [refresh, setRefresh] = useState(0);
  const [showTrail, setShowTrail] = useState(showTrailByDefault);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState('Choisissez un chemin: 1 bonne direction, les autres peuvent pieger.');
  const [feedbackTone, setFeedbackTone] = useState('neutral');
  const [lives, setLives] = useState(3);
  const [shake, setShake] = useState(false);
  const [hoveredKey, setHoveredKey] = useState('');

  const layout = useMemo(() => {
    return generateLayout({
      rows,
      cols,
      entryCount: Math.max(3, Math.min(6, clampInt(totalPlayers, 4, 3, 12))),
      exitCount: 4,
      seed: `${seed}:${refresh}`,
    });
  }, [rows, cols, totalPlayers, seed, refresh]);

  const assignedEntryCol = layout.entries[Math.abs(Number(participantIndex) || 0) % layout.entries.length];
  const startPos = useMemo(() => [0, assignedEntryCol], [assignedEntryCol]);
  const correctStart = assignedEntryCol === layout.correctEntryCol;

  const [position, setPosition] = useState(startPos);
  const [trail, setTrail] = useState([startPos]);

  useEffect(() => {
    setPosition(startPos);
    setTrail([startPos]);
    setLives(3);
    setFeedback(correctStart
      ? 'Votre entree est potentiellement la bonne. Restez vigilant aux faux choix.'
      : 'Faux depart possible: votre entree est differente de l entree optimale.');
    setFeedbackTone(correctStart ? 'good' : 'bad');
  }, [startPos, correctStart, refresh]);

  const trapSet = useMemo(() => new Set(layout.traps), [layout.traps]);
  const trailSet = useMemo(() => new Set(trail.map((pos) => keyOf(pos))), [trail]);
  const solutionPoints = useMemo(() => layout.mainPath.map((pos) => `${10 + pos[1] * 18},${28 + pos[0] * 18}`).join(' '), [layout.mainPath]);

  const gridWidth = layout.cols * 18 + 20;
  const gridHeight = layout.rows * 18 + 56;

  function markBad(message) {
    setFeedback(message);
    setFeedbackTone('bad');
    setShake(true);
    window.setTimeout(() => setShake(false), 250);
  }

  function tryMove(dir) {
    if (lives <= 0) {
      markBad('Plus de vies: regenerez le labyrinthe pour rejouer.');
      return;
    }
    if (!canMove(layout.cells, position, dir)) {
      markBad('Mur bloquant: mauvaise direction.');
      return;
    }

    const next = movePos(position, dir);
    const nextKey = keyOf(next);
    setPosition(next);
    setTrail((prev) => [...prev, next]);

    if (trapSet.has(nextKey)) {
      const nextLives = Math.max(0, lives - 1);
      setLives(nextLives);
      setPosition(startPos);
      setTrail((prev) => [...prev, startPos]);
      markBad(nextLives > 0
        ? 'Zone piegee detectee: explosion visuelle et retour au depart.'
        : 'Explosion fatale: toutes les vies sont perdues.');
      return;
    }

    if (next[0] === layout.rows - 1 && layout.exits.includes(next[1])) {
      if (next[1] === layout.correctExitCol && correctStart) {
        setFeedback('Sortie valide: excellent parcours.');
        setFeedbackTone('good');
      } else {
        markBad('Sortie leurre: ce n est pas la bonne issue.');
      }
      return;
    }

    setFeedback('Progression valide. Attention aux prochains embranchements.');
    setFeedbackTone('neutral');
  }

  function onKeyDown(event) {
    const map = {
      ArrowUp: 'N',
      ArrowRight: 'E',
      ArrowDown: 'S',
      ArrowLeft: 'W',
      z: 'N',
      w: 'N',
      d: 'E',
      s: 'S',
      q: 'W',
      a: 'W',
    };
    const direction = map[event.key] || map[String(event.key || '').toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    tryMove(direction);
  }

  return (
    <section className={styles.boardRoot}>
      <div className={styles.boardHead}>
        <h3 className={styles.boardTitle}>Preview Procedural: multi-entrees, multi-sorties, faux choix</h3>
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} onClick={() => setRefresh((v) => v + 1)}>Regenerer</button>
          <button
            type="button"
            className={`${styles.toolBtn}${showTrail ? ` ${styles.toolBtnActive}` : ''}`}
            onClick={() => setShowTrail((v) => !v)}
          >
            Trace
          </button>
          <button
            type="button"
            className={`${styles.toolBtn}${showSolution ? ` ${styles.toolBtnActive}` : ''}`}
            onClick={() => setShowSolution((v) => !v)}
          >
            Solution
          </button>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaChip}>Vies: {lives}</span>
        <span className={styles.metaChip}>Entree assignee: {assignedEntryCol + 1}</span>
        <span className={styles.metaChip}>Mode: progression solo independante</span>
      </div>

      <div
        className={`${styles.viewport}${shake ? ` ${styles.badPulse}` : ''}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Labyrinthe procedural interactif"
      >
        {layout.entries.map((col) => {
          const left = ((10 + col * 18) / gridWidth) * 100;
          const isGood = col === layout.correctEntryCol;
          return (
            <span
              key={`entry-${col}`}
              className={`${styles.markerTop} ${isGood ? styles.markerGood : styles.markerBad}`}
              style={{ left: `${left}%` }}
            >
              IN
            </span>
          );
        })}

        {layout.exits.map((col) => {
          const left = ((10 + col * 18) / gridWidth) * 100;
          const isGood = col === layout.correctExitCol;
          return (
            <span
              key={`exit-${col}`}
              className={`${styles.markerBottom} ${isGood ? styles.markerGood : styles.markerBad}`}
              style={{ left: `${left}%` }}
            >
              OUT
            </span>
          );
        })}

        <svg className={styles.svg} width={gridWidth} height={gridHeight} viewBox={`0 0 ${gridWidth} ${gridHeight}`} role="img">
          <rect x="0" y="0" width={gridWidth} height={gridHeight} fill="#02060d" />

          {showSolution && solutionPoints ? (
            <polyline
              points={solutionPoints}
              fill="none"
              stroke="rgba(34, 197, 94, 0.75)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {showTrail ? trail.map((pos, index) => (
            <circle
              key={`trail-${index}-${keyOf(pos)}`}
              cx={10 + pos[1] * 18}
              cy={28 + pos[0] * 18}
              r="3.2"
              fill="rgba(56, 189, 248, 0.42)"
            />
          )) : null}

          {layout.traps.map((key) => {
            const pos = parseKey(key);
            if (!pos) return null;
            const cx = 10 + pos[1] * 18;
            const cy = 28 + pos[0] * 18;
            return (
              <g key={`trap-${key}`}>
                <circle cx={cx} cy={cy} r="6" fill="rgba(239, 68, 68, 0.14)" />
                <path d={`M ${cx} ${cy - 4} L ${cx + 4} ${cy} L ${cx} ${cy + 4} L ${cx - 4} ${cy} Z`} fill="rgba(248, 113, 113, 0.9)" />
              </g>
            );
          })}

          {Array.from({ length: layout.rows }).map((_, row) => (
            Array.from({ length: layout.cols }).map((__, col) => {
              const cell = layout.cells[row][col];
              const x = 10 + col * 18;
              const y = 28 + row * 18;
              const key = `${row},${col}`;
              const isHovered = hoveredKey === key;
              const isPlayer = position[0] === row && position[1] === col;
              const isTrail = trailSet.has(key);

              return (
                <g key={key}>
                  {isHovered ? <rect x={x - 7} y={y - 7} width="14" height="14" fill="rgba(56, 189, 248, 0.22)" rx="4" /> : null}
                  {isTrail && !isPlayer ? <circle cx={x} cy={y} r="4" fill="rgba(56, 189, 248, 0.18)" /> : null}
                  <rect
                    x={x - 8}
                    y={y - 8}
                    width="16"
                    height="16"
                    fill="transparent"
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey('')}
                    onClick={() => {
                      const dr = row - position[0];
                      const dc = col - position[1];
                      if (Math.abs(dr) + Math.abs(dc) !== 1) return;
                      if (dr === -1 && dc === 0) tryMove('N');
                      if (dr === 1 && dc === 0) tryMove('S');
                      if (dr === 0 && dc === 1) tryMove('E');
                      if (dr === 0 && dc === -1) tryMove('W');
                    }}
                  />
                  {!cell.N ? <line x1={x - 9} y1={y - 9} x2={x + 9} y2={y - 9} stroke="#f8fafc" strokeWidth="1.5" /> : null}
                  {!cell.E ? <line x1={x + 9} y1={y - 9} x2={x + 9} y2={y + 9} stroke="#f8fafc" strokeWidth="1.5" /> : null}
                  {!cell.S ? <line x1={x - 9} y1={y + 9} x2={x + 9} y2={y + 9} stroke="#f8fafc" strokeWidth="1.5" /> : null}
                  {!cell.W ? <line x1={x - 9} y1={y - 9} x2={x - 9} y2={y + 9} stroke="#f8fafc" strokeWidth="1.5" /> : null}
                </g>
              );
            })
          ))}

          <circle
            cx={10 + position[1] * 18}
            cy={28 + position[0] * 18}
            r="5.2"
            fill="#38bdf8"
            stroke="#dbeafe"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>IN: entree (une seule correcte)</span>
        <span className={styles.legendItem}>OUT: sortie (une seule correcte)</span>
        <span className={styles.legendItem}>Losange rouge: zone piegee</span>
        <span className={styles.legendItem}>Fleches clavier, ZQSD/WASD ou clic</span>
      </div>

      <p className={`${styles.feedback}${feedbackTone === 'good' ? ` ${styles.feedbackGood}` : ''}${feedbackTone === 'bad' ? ` ${styles.feedbackBad}` : ''}`}>
        {feedback}
      </p>
    </section>
  );
}
