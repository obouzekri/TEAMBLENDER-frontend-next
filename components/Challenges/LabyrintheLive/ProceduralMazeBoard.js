'use client';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './ProceduralMazeBoard.module.css';

const DIRS = Object.freeze([
  { key: 'N', dr: -1, dc: 0, opposite: 'S' },
  { key: 'E', dr: 0, dc: 1, opposite: 'W' },
  { key: 'S', dr: 1, dc: 0, opposite: 'N' },
  { key: 'W', dr: 0, dc: -1, opposite: 'E' },
]);

const CELL = 35;
const HALF = 17.5;
const PAD_X = 28;
const PAD_Y = 50;

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

function inBounds(rows, cols, row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function buildGrid(rows, cols) {
  return Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => ({ N: false, E: false, S: false, W: false }))
  ));
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

function closePassage(cells, a, b) {
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  if (!inBounds(rows, cols, a[0], a[1]) || !inBounds(rows, cols, b[0], b[1])) return false;

  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  const edge = DIRS.find((dir) => dir.dr === dr && dir.dc === dc);
  if (!edge) return false;

  cells[a[0]][a[1]][edge.key] = false;
  cells[b[0]][b[1]][edge.opposite] = false;
  return true;
}

function buildPerfectMaze(rows, cols, random) {
  const cells = buildGrid(rows, cols);
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const start = [0, Math.floor(random() * cols)];
  const stack = [start];
  visited[start[0]][start[1]] = true;

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1];
    const candidates = DIRS
      .map((dir) => ({ ...dir, nr: row + dir.dr, nc: col + dir.dc }))
      .filter((step) => inBounds(rows, cols, step.nr, step.nc) && !visited[step.nr][step.nc]);

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const next = candidates[Math.floor(random() * candidates.length)];
    cells[row][col][next.key] = true;
    cells[next.nr][next.nc][next.opposite] = true;
    visited[next.nr][next.nc] = true;
    stack.push([next.nr, next.nc]);
  }

  return cells;
}

function shortestPath(cells, start, end, blocked = new Set()) {
  const startKey = keyOf(start);
  const endKey = keyOf(end);
  if (!startKey || !endKey || blocked.has(startKey) || blocked.has(endKey)) return [];

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
      if (!nextKey || seen.has(nextKey) || blocked.has(nextKey)) return;
      seen.add(nextKey);
      parent.set(nextKey, currentKey);
      queue.push(next);
    });
  }

  return [];
}

function chooseBoundaryStarts(rows, cols) {
  const rightRowA = Math.max(1, Math.floor(rows * 0.28));
  const rightRowB = Math.min(rows - 2, Math.floor(rows * 0.72));
  const topCol = Math.max(1, Math.min(cols - 2, Math.floor(cols * 0.34)));

  return [
    [0, topCol],
    [rightRowA, cols - 1],
    [rightRowB, cols - 1],
  ];
}

function pickFarthestExit(entries, exits) {
  if (exits.length === 0) return 0;
  return exits
    .map((candidate) => {
      const minDistance = entries.reduce((min, entry) => Math.min(min, Math.abs(candidate - entry)), Number.POSITIVE_INFINITY);
      return { candidate, minDistance };
    })
    .sort((a, b) => b.minDistance - a.minDistance)[0].candidate;
}

function countBranches(cells, row, col) {
  return neighborsFrom(cells, row, col).length;
}

function edgeCount(cells) {
  let total = 0;
  for (let row = 0; row < cells.length; row += 1) {
    for (let col = 0; col < cells[0].length; col += 1) {
      if (cells[row][col].E) total += 1;
      if (cells[row][col].S) total += 1;
    }
  }
  return total;
}

function canStillReachExit(cells, entries, exitCol) {
  const end = [cells.length - 1, exitCol];
  return entries.some((entry) => shortestPath(cells, [0, entry], end).length > 0);
}

function hardenWalls(cells, entries, exitCol, random) {
  const rows = cells.length;
  const cols = cells[0]?.length || 0;
  const candidates = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (col + 1 < cols && cells[row][col].E) candidates.push([[row, col], [row, col + 1]]);
      if (row + 1 < rows && cells[row][col].S) candidates.push([[row, col], [row + 1, col]]);
    }
  }

  const targetClosures = Math.max(0, Math.floor(candidates.length * 0.14));
  let closed = 0;

  while (candidates.length > 0 && closed < targetClosures) {
    const index = Math.floor(random() * candidates.length);
    const [a, b] = candidates[index];
    candidates.splice(index, 1);

    closePassage(cells, a, b);
    if (!canStillReachExit(cells, entries, exitCol)) {
      openPassage(cells, a, b);
      continue;
    }

    closed += 1;
  }
}

function generateLayout(options) {
  const rows = clampInt(options.rows, 26, 16, 36);
  const cols = clampInt(options.cols, 26, 16, 36);
  const random = mulberry32(hashSeed(options.seed));
  const exitCount = clampInt(options.exitCount, 4, 3, 6);

  const cells = buildPerfectMaze(rows, cols, random);
  const entries = chooseBoundaryStarts(rows, cols);
  const topEntries = entries.filter((entry) => entry[0] === 0);
  const exits = [Math.max(1, Math.floor(cols * 0.18)), Math.max(2, Math.floor(cols * 0.5)), Math.min(cols - 2, Math.floor(cols * 0.82))];
  const correctEntry = entries[0];
  const correctExitCol = pickFarthestExit(topEntries.map((entry) => entry[1]), exits);

  entries.forEach(([row, col]) => {
    if (row === 0) cells[row][col].N = true;
    if (col === cols - 1) cells[row][col].E = true;
  });

  exits.forEach((col) => {
    cells[rows - 1][col].S = true;
  });

  hardenWalls(cells, entries, correctExitCol, random);

  const mainPath = shortestPath(cells, correctEntry, [rows - 1, correctExitCol]);
  const mainPathKeys = new Set(mainPath.map((pos) => keyOf(pos)));

  const traps = new Set();
  const branchIndexes = [];
  for (let i = 2; i < mainPath.length - 2; i += 1) {
    branchIndexes.push(i);
  }

  const trapTarget = Math.max(18, Math.floor((rows * cols) * 0.14));

  while (branchIndexes.length > 0 && traps.size < trapTarget) {
    const idx = Math.floor(random() * branchIndexes.length);
    const pathIndex = branchIndexes[idx];
    branchIndexes.splice(idx, 1);

    const pivot = mainPath[pathIndex];
    const prevKey = keyOf(mainPath[pathIndex - 1]);
    const nextKey = keyOf(mainPath[pathIndex + 1]);

    const wrongNeighbors = neighborsFrom(cells, pivot[0], pivot[1])
      .map((pos) => ({ pos, key: keyOf(pos) }))
      .filter((entry) => entry.key !== prevKey && entry.key !== nextKey)
      .filter((entry) => !mainPathKeys.has(entry.key));

    wrongNeighbors.forEach((entry) => {
      if (traps.size < trapTarget) traps.add(entry.key);
    });
  }

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const key = `${row},${col}`;
      if (mainPathKeys.has(key)) continue;
      if (traps.has(key)) continue;

      const branchCount = countBranches(cells, row, col);
      if ((branchCount <= 1 && random() > 0.52) || (branchCount === 2 && random() > 0.86)) {
        traps.add(key);
      }

      if (traps.size >= trapTarget) break;
    }
    if (traps.size >= trapTarget) break;
  }

  return {
    rows,
    cols,
    cells,
    entries,
    exits,
    correctEntry,
    correctExitCol,
    mainPath,
    traps: [...traps],
    edgeCount: edgeCount(cells),
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
  if (!cell || !cell[dir]) return false;
  const next = movePos(pos, dir);
  return inBounds(cells.length, cells[0].length, next[0], next[1]);
}

function worldX(col) {
  return PAD_X + col * CELL;
}

function worldY(row) {
  return PAD_Y + row * CELL;
}

export default function ProceduralMazeBoard({
  seed = 'teamblender-default',
  rows = 20,
  cols = 20,
  totalPlayers = 5,
  showTrailByDefault = true,
}) {
  const [refresh, setRefresh] = useState(0);
  const [showTrail, setShowTrail] = useState(showTrailByDefault);
  const [showSolution, setShowSolution] = useState(false);
  const [feedback, setFeedback] = useState('Choisissez librement une entree en haut, puis tentez d atteindre la seule vraie sortie.');
  const [feedbackTone, setFeedbackTone] = useState('neutral');
  const [lives, setLives] = useState(3);
  const [shake, setShake] = useState(false);
  const [hoveredKey, setHoveredKey] = useState('');
  const [selectedStartKey, setSelectedStartKey] = useState('');
  const [position, setPosition] = useState(null);
  const [trail, setTrail] = useState([]);
  const [pulseCursor, setPulseCursor] = useState(false);

  const layout = useMemo(() => {
    return generateLayout({
      rows,
      cols,
      entryCount: Math.max(4, Math.min(7, clampInt(totalPlayers, 5, 3, 12))),
      exitCount: 4,
      seed: `${seed}:${refresh}`,
    });
  }, [rows, cols, totalPlayers, seed, refresh]);

  const trapSet = useMemo(() => new Set(layout.traps), [layout.traps]);
  const trailSet = useMemo(() => new Set(trail.map((cell) => keyOf(cell))), [trail]);
  const solutionPoints = useMemo(() => (
    layout.mainPath.map((cell) => `${worldX(cell[1])},${worldY(cell[0])}`).join(' ')
  ), [layout.mainPath]);

  const gridWidth = (layout.cols * CELL) + (PAD_X * 2);
  const gridHeight = (layout.rows * CELL) + PAD_Y + 24;
  const cursorLeft = position ? worldX(position[1]) : 0;
  const cursorTop = position ? worldY(position[0]) : 0;
  const correctStart = Array.isArray(position)
    && Array.isArray(layout.correctEntry)
    && trail.length > 0
    && position.length > 1
    && trail[0]?.[0] === layout.correctEntry[0]
    && trail[0]?.[1] === layout.correctEntry[1];

  useEffect(() => {
    setSelectedStartKey('');
    setPosition(null);
    setTrail([]);
    setLives(3);
    setFeedback('Choisissez librement une entree en haut, puis tentez d atteindre la seule vraie sortie.');
    setFeedbackTone('neutral');
    setShowSolution(false);
  }, [refresh, layout.correctEntry, layout.correctExitCol]);

  function markBad(message) {
    setFeedback(message);
    setFeedbackTone('bad');
    setShake(true);
    window.setTimeout(() => setShake(false), 240);
  }

  function markGood(message) {
    setFeedback(message);
    setFeedbackTone('good');
    setPulseCursor(true);
    window.setTimeout(() => setPulseCursor(false), 240);
  }

  function chooseEntry(start) {
    setSelectedStartKey(keyOf(start));
    setPosition(start);
    setTrail([start]);
    setLives(3);
    setFeedback(keyOf(start) === keyOf(layout.correctEntry)
      ? 'Bonne intuition. Cette entree peut mener a la vraie sortie.'
      : 'Entree selectionnee. Attention: certaines entrees menent a des branches tres piegees.');
    setFeedbackTone(keyOf(start) === keyOf(layout.correctEntry) ? 'good' : 'neutral');
  }

  function tryMove(dir) {
    if (!position || !selectedStartKey) {
      markBad('Selectionnez d abord une entree.');
      return;
    }
    if (lives <= 0) {
      markBad('Plus de vies. Regenerer ou changer d entree.');
      return;
    }
    if (!canMove(layout.cells, position, dir)) {
      markBad('Mur bloquant. Direction invalide.');
      return;
    }

    const next = movePos(position, dir);
    const nextKey = keyOf(next);

    if (trailSet.has(nextKey)) {
      markBad('Retour arriere bloque: ce couloir se referme derriere vous.');
      return;
    }

    setPosition(next);
    setTrail((prev) => [...prev, next]);

    if (trapSet.has(nextKey)) {
      const nextLives = Math.max(0, lives - 1);
      const restart = parseKey(selectedStartKey) || layout.correctEntry;
      setLives(nextLives);
      setPosition(restart);
      setTrail([restart]);
      markBad(nextLives > 0
        ? 'Explosion detectee: vie perdue et retour entree.'
        : 'Explosion critique: toutes les vies sont perdues.');
      return;
    }

    if (next[0] === layout.rows - 1 && layout.exits.includes(next[1])) {
      if (next[1] === layout.correctExitCol && correctStart) {
        markGood('Sortie valide atteinte. Parcours strategique reussi.');
      } else {
        markBad('Fausse sortie: ce chemin etait un leurre.');
      }
      return;
    }

    markGood('Mouvement valide. Restez vigilant aux faux embranchements.');
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
        <h3 className={styles.boardTitle}>Maze Hard Mode: entrees libres, sortie unique, pieges denses</h3>
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
        <span className={styles.metaChip}>Entree: {selectedStartKey || 'a choisir'}</span>
        <span className={styles.metaChip}>Murs actifs: {layout.rows * layout.cols * 4 - (layout.edgeCount * 2)}</span>
        <span className={styles.metaChip}>Zones piegees: {layout.traps.length}</span>
      </div>

      <div
        className={`${styles.viewport}${shake ? ` ${styles.badPulse}` : ''}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Labyrinthe procedural difficile"
      >
        {layout.entries.map((start) => {
          const top = `${worldY(start[0]) - (start[0] === 0 ? 22 : 0)}px`;
          const left = `${worldX(start[1]) + (start[1] === layout.cols - 1 ? 22 : 0)}px`;
          const isGood = keyOf(start) === keyOf(layout.correctEntry);
          const isSelected = selectedStartKey === keyOf(start);
          return (
            <button
              key={`entry-${keyOf(start)}`}
              type="button"
              className={`${styles.markerStart} ${start[0] === 0 ? styles.markerStartTop : styles.markerStartRight} ${isGood ? styles.markerGood : styles.markerBad}${isSelected ? ` ${styles.markerSelected}` : ''}`}
              style={{ left, top }}
              onClick={() => chooseEntry(start)}
            >
              START
            </button>
          );
        })}

        {layout.exits.map((col) => {
          const left = (worldX(col) / gridWidth) * 100;
          const isGood = col === layout.correctExitCol;
          return (
            <span
              key={`exit-${col}`}
              className={`${styles.markerBottom} ${isGood ? styles.markerGood : styles.markerBad}`}
              style={{ left: `${left}%` }}
            >
              EXIT
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
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {showTrail ? trail.map((cell, index) => (
            <circle
              key={`trail-${index}-${keyOf(cell)}`}
              cx={worldX(cell[1])}
              cy={worldY(cell[0])}
              r="2.8"
              fill="rgba(56, 189, 248, 0.4)"
            />
          )) : null}

          {layout.traps.map((rawKey) => {
            const cell = parseKey(rawKey);
            if (!cell) return null;
            const cx = worldX(cell[1]);
            const cy = worldY(cell[0]);
            return (
              <g key={`trap-${rawKey}`}>
                <circle cx={cx} cy={cy} r="5.2" fill="rgba(239, 68, 68, 0.15)" />
                <path d={`M ${cx} ${cy - 3.8} L ${cx + 3.8} ${cy} L ${cx} ${cy + 3.8} L ${cx - 3.8} ${cy} Z`} fill="rgba(248, 113, 113, 0.92)" />
              </g>
            );
          })}

          {Array.from({ length: layout.rows }).map((_, row) => (
            Array.from({ length: layout.cols }).map((__, col) => {
              const cell = layout.cells[row][col];
              const x = worldX(col);
              const y = worldY(row);
              const rawKey = `${row},${col}`;
              const isHovered = hoveredKey === rawKey;
              const isVisited = trailSet.has(rawKey);
              return (
                <g key={rawKey}>
                  {isHovered ? <rect x={x - HALF + 1} y={y - HALF + 1} width={CELL - 2} height={CELL - 2} fill="rgba(56, 189, 248, 0.2)" rx="3" /> : null}
                  {isVisited ? <circle cx={x} cy={y} r="2.2" fill="rgba(56, 189, 248, 0.28)" /> : null}
                  <rect
                    x={x - HALF}
                    y={y - HALF}
                    width={CELL}
                    height={CELL}
                    fill="transparent"
                    onMouseEnter={() => setHoveredKey(rawKey)}
                    onMouseLeave={() => setHoveredKey('')}
                    onClick={() => {
                      if (!position) return;
                      const dr = row - position[0];
                      const dc = col - position[1];
                      if (Math.abs(dr) + Math.abs(dc) !== 1) return;
                      if (dr === -1 && dc === 0) tryMove('N');
                      if (dr === 1 && dc === 0) tryMove('S');
                      if (dr === 0 && dc === 1) tryMove('E');
                      if (dr === 0 && dc === -1) tryMove('W');
                    }}
                  />
                  {!cell.N ? <line x1={x - HALF} y1={y - HALF} x2={x + HALF} y2={y - HALF} stroke="#f8fafc" strokeWidth="1.2" /> : null}
                  {!cell.E ? <line x1={x + HALF} y1={y - HALF} x2={x + HALF} y2={y + HALF} stroke="#f8fafc" strokeWidth="1.2" /> : null}
                  {!cell.S ? <line x1={x - HALF} y1={y + HALF} x2={x + HALF} y2={y + HALF} stroke="#f8fafc" strokeWidth="1.2" /> : null}
                  {!cell.W ? <line x1={x - HALF} y1={y - HALF} x2={x - HALF} y2={y + HALF} stroke="#f8fafc" strokeWidth="1.2" /> : null}
                </g>
              );
            })
          ))}
        </svg>

        {position ? (
          <div
            className={`${styles.playerCursor}${pulseCursor ? ` ${styles.playerCursorPulse}` : ''}`}
            style={{ left: `${cursorLeft}px`, top: `${cursorTop}px` }}
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className={styles.controlsRow}>
        <button type="button" className={styles.moveBtn} onClick={() => tryMove('N')} aria-label="Monter">↑</button>
        <button type="button" className={styles.moveBtn} onClick={() => tryMove('W')} aria-label="Aller a gauche">←</button>
        <button type="button" className={styles.moveBtn} onClick={() => tryMove('S')} aria-label="Descendre">↓</button>
        <button type="button" className={styles.moveBtn} onClick={() => tryMove('E')} aria-label="Aller a droite">→</button>
        <div className={styles.legendInline}>
          <span className={styles.legendItem}>START</span>
          <span className={styles.legendItem}>EXIT</span>
          <span className={styles.legendItem}>Piège</span>
          <span className={styles.legendItem}>Curseur joueur</span>
        </div>
      </div>

      <p className={`${styles.feedback}${feedbackTone === 'good' ? ` ${styles.feedbackGood}` : ''}${feedbackTone === 'bad' ? ` ${styles.feedbackBad}` : ''}`}>
        {feedback}
      </p>
    </section>
  );
}
