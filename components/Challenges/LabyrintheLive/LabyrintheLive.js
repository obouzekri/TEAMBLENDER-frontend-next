'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import styles from './Labyrinthe.module.css';

const LABYRINTHE_RULES_FALLBACK = Object.freeze({
  objective: 'Atteindre la sortie en équipe : chaque joueur qui s\'échappe augmente le score collectif.',
  facilitator: [
    'Lancez le chrono une fois tous les participants connectés.',
    'Chaque participant choisit librement son point de départ (case START) avant son premier mouvement.',
    'Après chaque vie perdue, le joueur sélectionne un nouveau point de départ en cliquant sur une case START.',
    'Un retour en arrière est interdit mais ne coûte pas de vie — le mouvement est simplement bloqué.',
    'Pilotez les relances via le chat lors des phases critiques.',
  ],
  participant: [
    'Sélectionnez un point de départ (case START) avant votre premier mouvement.',
    'Après chaque vie perdue, choisissez un nouveau point de départ en cliquant sur une case START qui clignote.',
    'Un retour en arrière est interdit : vous ne pouvez pas revenir sur une case déjà visitée (sans pénalité).',
    'Les pièges sont invisibles avant passage — restez vigilant aux fausses pistes.',
    'Le retour en arrière est bloqué sans pénalité de vie. Après chaque vie perdue, choisissez un nouveau point de départ. Les pièges n\'apparaissent qu\'au déclenchement.',
    'Partagez vos découvertes avec l\'équipe via le chat.',
  ],
  footnote: ''
});

function safeInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const normalized = Number.isInteger(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, normalized));
}

function posKey(pos) {
  if (!Array.isArray(pos)) return '';
  const row = Number(pos[0]);
  const col = Number(pos[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return '';
  return `${row},${col}`;
}

function normalizeVisited(rawVisited) {
  const set = new Set();
  if (!Array.isArray(rawVisited)) return set;

  rawVisited.forEach((entry) => {
    if (Array.isArray(entry) && entry.length >= 2) {
      const row = Number(entry[0]);
      const col = Number(entry[1]);
      if (Number.isInteger(row) && Number.isInteger(col)) {
        set.add(`${row},${col}`);
      }
      return;
    }

    if (typeof entry === 'string' && /^\d+,\d+$/.test(entry)) {
      set.add(entry);
    }
  });

  return set;
}

function normalizeTrapKeys(rawTraps) {
  const set = new Set();
  if (!rawTraps) return set;

  const addEntry = (entry) => {
    if (typeof entry === 'string' && /^\d+,\d+$/.test(entry)) {
      set.add(entry);
      return;
    }

    if (Array.isArray(entry) && entry.length >= 2) {
      const key = posKey(entry);
      if (key) set.add(key);
      return;
    }

    if (entry && typeof entry === 'object') {
      const key = posKey(entry.pos || entry.cell || entry.location || entry.coordinates || entry.position || entry);
      if (key) set.add(key);
    }
  };

  if (Array.isArray(rawTraps)) {
    rawTraps.forEach(addEntry);
    return set;
  }

  if (typeof rawTraps === 'object') {
    Object.entries(rawTraps).forEach(([key, value]) => {
      if (/^\d+,\d+$/.test(key)) {
        set.add(key);
      }
      addEntry(value);
    });
  }

  return set;
}

function getMazeCell(maze, row, col) {
  if (!maze || !Array.isArray(maze.cells)) return null;
  if (!Array.isArray(maze.cells[row])) return null;
  const cell = maze.cells[row][col];
  return cell && typeof cell === 'object' ? cell : null;
}

const WALL_THICK = '1.4px';
const OPEN_THICK = '0px';
const WALL_COLOR = 'rgba(248, 250, 252, 0.95)';
const OPEN_COLOR = 'transparent';
const FLOOR_BG = 'transparent';
const WALL_CELL_BG = '#030810';

function buildMazeCellStyle(maze, row, col) {
  const cell = getMazeCell(maze, row, col);
  if (!cell) {
    return {
      borderTopWidth: '0',
      borderRightWidth: '0',
      borderBottomWidth: '0',
      borderLeftWidth: '0',
      backgroundColor: WALL_CELL_BG,
      backgroundImage: 'none',
      boxShadow: 'none',
    };
  }

  return {
    borderTopWidth: cell.n ? OPEN_THICK : WALL_THICK,
    borderRightWidth: cell.e ? OPEN_THICK : WALL_THICK,
    borderBottomWidth: cell.s ? OPEN_THICK : WALL_THICK,
    borderLeftWidth: cell.w ? OPEN_THICK : WALL_THICK,
    borderTopColor: cell.n ? OPEN_COLOR : WALL_COLOR,
    borderRightColor: cell.e ? OPEN_COLOR : WALL_COLOR,
    borderBottomColor: cell.s ? OPEN_COLOR : WALL_COLOR,
    borderLeftColor: cell.w ? OPEN_COLOR : WALL_COLOR,
    backgroundColor: FLOOR_BG,
    backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 55%)',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.28)',
  };
}

function directionFromDelta(dr, dc) {
  if (dr === -1 && dc === 0) return 'N';
  if (dr === 1 && dc === 0) return 'S';
  if (dr === 0 && dc === -1) return 'W';
  if (dr === 0 && dc === 1) return 'E';
  return '';
}

function canMoveFromCell(maze, fromPos, dir) {
  const row = Number(Array.isArray(fromPos) ? fromPos[0] : Number.NaN);
  const col = Number(Array.isArray(fromPos) ? fromPos[1] : Number.NaN);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  const cell = getMazeCell(maze, row, col);
  if (!cell) return false;
  const key = String(dir || '').trim().toLowerCase();
  if (!['n', 'e', 's', 'w'].includes(key)) return false;
  return Boolean(cell[key]);
}

function toParticipantLabel(value, fallback = 'Participant') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (!raw.includes('@')) return raw;

  const localPart = raw.split('@')[0] || '';
  const chunks = localPart
    .replace(/[^a-zA-Z._-]/g, ' ')
    .split(/[._\-\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!chunks.length) return fallback;
  if (chunks.length === 1) {
    const token = chunks[0];
    return `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`;
  }

  const first = `${chunks[0].charAt(0).toUpperCase()}${chunks[0].slice(1).toLowerCase()}`;
  const lastToken = chunks[chunks.length - 1];
  const last = `${lastToken.charAt(0).toUpperCase()}${lastToken.slice(1).toLowerCase()}`;
  return `${first} ${last}`;
}

export default function LabyrintheLive({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [optimisticPos, setOptimisticPos] = useState(null);
  const [moveFeedback, setMoveFeedback] = useState('');
  const [moveFeedbackTone, setMoveFeedbackTone] = useState('info');
  const [flashCellKey, setFlashCellKey] = useState('');
  const [flashCellTone, setFlashCellTone] = useState('');
  const [microCue, setMicroCue] = useState(null);
  const microCueTimerRef = useRef(null);
  const {
    state,
    error,
    isFacilitator,
    emitEvent,
    participantId,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const laby = state?.labyrinthe || null;
  const timer = state?.timer || null;
  const didAutoSetupRef = useRef(false);
  const swipeStartRef = useRef(null);
  const gridRef = useRef(null);
  const myParticipantState = laby?.parts?.[String(participantId)] || null;
  const isRespawning = myParticipantState?.solo?.choosing_start === true;

  const labyPhase = String(laby?.phase || '').trim();
  const canMoveSolo = !isFacilitator
    && labyPhase !== 'done'
    && Boolean(laby?.maze)
    && Number(laby?.parts?.[String(participantId)]?.lives_remaining || 0) > 0;

  const canMoveDir = canMoveSolo && !isRespawning;

  const chatEnabled = state?.config?.chat?.enabled !== false && Boolean(socket);

  const revealedCells = laby?.revealed_cells && typeof laby.revealed_cells === 'object' ? laby.revealed_cells : {};
  const revealedTraps = laby?.revealed_traps && typeof laby.revealed_traps === 'object' ? laby.revealed_traps : {};
  const revealedWalls = laby?.revealed_walls && typeof laby.revealed_walls === 'object' ? laby.revealed_walls : {};
  const mazeRows = safeInt(laby?.cfg?.rows ?? laby?.cfg?.r, 20, 6, 20);
  const mazeCols = safeInt(laby?.cfg?.cols ?? laby?.cfg?.c, 20, 6, 20);
  const participantEntries = useMemo(() => Object.entries(laby?.parts || {}), [laby?.parts]);
  const participantNameById = useMemo(() => {
    return participantEntries.reduce((acc, [id, participant]) => {
      acc[String(id)] = toParticipantLabel(participant?.name, `Participant ${id}`);
      return acc;
    }, {});
  }, [participantEntries]);
  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasChallengeStarted = timerStatus === 'running'
    || timerStatus === 'paused'
    || timerStatus === 'completed'
    || timerStatus === 'stopped'
    || timerStatus === 'timeout'
    || (Boolean(laby?.phase) && String(laby.phase).trim() !== 'setup');

  const labyDebrief = useMemo(() => {
    if (String(laby?.phase || '').trim() !== 'done') return null;
    const winnerId = String(laby?.winner_participant_id || '').trim();
    const totalPlayers = participantEntries.length;
    const alivePlayers = participantEntries.filter(([, participant]) => Number(participant?.lives_remaining || 0) > 0).length;
    return {
      winnerId,
      totalPlayers,
      alivePlayers,
      moves: Number(laby?.col?.att || 0),
      completed: winnerId.length > 0,
    };
  }, [laby?.phase, laby?.winner_participant_id, laby?.col?.att, participantEntries]);

  const startCellKey = posKey(laby?.maze?.start);
  const endCellKey = posKey(laby?.maze?.end);
  const maze = laby?.maze || null;
  const playerPosKey = posKey(myParticipantState?.solo?.pos);
  const mySpawnKey = posKey(myParticipantState?.solo?.path?.[0]);
  const mazeTrapKeys = useMemo(() => normalizeTrapKeys(maze?.traps), [maze?.traps]);
  const revealMazeTraps = isFacilitator || labyPhase === 'done';
  const allStartKeys = useMemo(() => {
    const starts = Array.isArray(maze?.start_points) && maze.start_points.length > 0
      ? maze.start_points
      : Array.isArray(maze?.start)
        ? [maze.start]
        : [];
    const next = new Set();
    starts.forEach((pos) => {
      const key = posKey(pos);
      if (key) next.add(key);
    });
    if (startCellKey) next.add(startCellKey);
    return next;
  }, [maze?.start_points, maze?.start, startCellKey]);

  const safePathKeys = useMemo(() => {
    const next = new Set();
    const path = Array.isArray(maze?.safe_path) ? maze.safe_path : [];
    path.forEach((pos) => {
      const key = posKey(pos);
      if (key) next.add(key);
    });
    return next;
  }, [maze?.safe_path]);

  const myVisited = useMemo(() => {
    const visitedFromState = normalizeVisited(myParticipantState?.solo?.visited || myParticipantState?.solo?.visited_cells || myParticipantState?.visited_cells);
    if (visitedFromState.size > 0) return visitedFromState;
    const fallback = new Set();
    Object.entries(revealedCells).forEach(([key, value]) => {
      if (value) fallback.add(key);
    });
    return fallback;
  }, [myParticipantState, revealedCells]);

  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config, LABYRINTHE_RULES_FALLBACK),
    [runtimePayload?.config, state?.config]
  );

  useEffect(() => {
    const serverPos = Array.isArray(myParticipantState?.solo?.pos) ? myParticipantState.solo.pos : null;
    setOptimisticPos(serverPos && serverPos.length >= 2 ? [Number(serverPos[0]), Number(serverPos[1])] : null);
  }, [myParticipantState?.solo?.pos]);

  useEffect(() => {
    if (!isFacilitator) return;
    if (!laby) return;
    const phase = String(laby.phase || '').trim();
    if (phase !== 'setup') return;
    if (didAutoSetupRef.current) return;
    didAutoSetupRef.current = true;
  }, [isFacilitator, laby]);

  useEffect(() => {
    if (!canMoveDir) return () => {};

    if (gridRef.current && typeof gridRef.current.focus === 'function') {
      gridRef.current.focus();
    }

    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = String(target?.tagName || '').toLowerCase();
      if (target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName)) {
        return;
      }

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
      const dir = map[String(event.key || '').toLowerCase()] || map[event.key];
      if (!dir) return;
      event.preventDefault();
      emitEvent('laby.solo.move', { dir });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [canMoveDir, emitEvent]);

  useEffect(() => {
    if (!canMoveDir || !gridRef.current) return () => {};
    const grid = gridRef.current;
    const preventTouchScroll = (e) => { e.preventDefault(); };
    grid.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => { grid.removeEventListener('touchmove', preventTouchScroll); };
  }, [canMoveSolo]);

  useEffect(() => {
    if (!socket || !participantId) return () => {};

    const clearMicroCueTimer = () => {
      if (microCueTimerRef.current) {
        window.clearTimeout(microCueTimerRef.current);
        microCueTimerRef.current = null;
      }
    };

    const showMicroCue = (cellKey, tone, text, lifeDelta = '') => {
      if (!cellKey || !text) return;
      clearMicroCueTimer();
      setMicroCue({ cellKey, tone, text, lifeDelta });
      microCueTimerRef.current = window.setTimeout(() => {
        setMicroCue((current) => (current?.cellKey === cellKey ? null : current));
      }, 1200);
    };

    const onChallengeEvent = (packet = {}) => {
      if (String(packet?.type || '').trim() !== 'laby.solo.resolved') return;
      const payload = packet?.payload || {};
      if (String(payload?.participant_id || '').trim() !== String(participantId || '').trim()) return;

      const impactedPos = Array.isArray(payload?.triggered_position)
        ? payload.triggered_position
        : Array.isArray(payload?.position)
          ? payload.position
          : null;
      const impactedCellKey = posKey(impactedPos);
      if (impactedCellKey) {
        const visualTone = String(payload?.outcome || '').trim() === 'backtrack'
          ? 'blocked'
          : String(payload?.outcome || '').trim();
        setFlashCellKey(impactedCellKey);
        setFlashCellTone(visualTone);
        window.setTimeout(() => {
          setFlashCellKey((prev) => (prev === impactedCellKey ? '' : prev));
          setFlashCellTone((prev) => (prev === visualTone ? '' : prev));
        }, 700);
      }

      const outcome = String(payload?.outcome || '').trim();
      if (outcome === 'exit') {
        setMoveFeedback('Bravo ! Vous avez atteint la sortie.');
        setMoveFeedbackTone('success');
        showMicroCue(impactedCellKey || playerPosKey, 'success', '🏁 Sortie !');
        return;
      }
      if (outcome === 'trap') {
        setMoveFeedback('💥 Piège déclenché : -1 vie');
        setMoveFeedbackTone('danger');
        showMicroCue(impactedCellKey, 'danger', '💥 Boom !', '−1 vie');
        return;
      }
      if (outcome === 'blocked') {
        setMoveFeedback('🚧 Chemin bloqué : -1 vie');
        setMoveFeedbackTone('danger');
        showMicroCue(impactedCellKey, 'danger', '🚧 Chemin bloqué', '−1 vie');
        return;
      }
      if (outcome === 'backtrack') {
        setMoveFeedback('↩️ Retour interdit — ce couloir se referme derrière vous.');
        setMoveFeedbackTone('warning');
        showMicroCue(impactedCellKey || playerPosKey, 'warning', '↩️ Retour interdit');
        return;
      }
      if (outcome === 'wall') {
        setMoveFeedback('Mur détecté dans cette direction.');
        setMoveFeedbackTone('warning');
        showMicroCue(impactedCellKey || playerPosKey, 'warning', '🚧 Impasse');
        return;
      }
      setMoveFeedback('Déplacement validé. Continuez vers la sortie.');
      setMoveFeedbackTone('info');
      showMicroCue(impactedCellKey || playerPosKey, 'info', '✨ Bien joué');
    };

    socket.on('challenge:event', onChallengeEvent);
    return () => {
      clearMicroCueTimer();
      socket.off('challenge:event', onChallengeEvent);
    };
  }, [socket, participantId, playerPosKey]);

  const displayName = useMemo(() => {
    const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
    const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return toParticipantLabel(fromPayload, fromPayload);
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return toParticipantLabel(fromContext, fromContext);
    const id = String(participantId || context?.userId || context?.participantId || '').trim();
    return `Participant ${id || 'unknown'}`;
  }, [runtimePayload, context, participantId]);

  const {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
    sendQuickChat,
  } = useChallengeChat({
    socket,
    emitEvent,
    author: displayName,
    enabled: chatEnabled,
    maxMessages: 80,
    maxLength: 240,
  });

  function handleSwipeStart(event) {
    if (!canMoveDir) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleSwipeEnd(event) {
    if (!canMoveDir) return;
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const threshold = 24;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      emitEvent('laby.solo.move', { dir: dx > 0 ? 'E' : 'W' });
      return;
    }
    emitEvent('laby.solo.move', { dir: dy > 0 ? 'S' : 'N' });
  }

  function handleCellClick(row, col) {
    if (!canMoveSolo) return;
    const clickedKey = `${row},${col}`;
    const hasMovedAway = Array.isArray(myParticipantState?.solo?.path) && myParticipantState.solo.path.length > 1;
    if (allStartKeys.has(clickedKey) && (!hasMovedAway || isRespawning)) {
      emitEvent('laby.solo.select_start', { pos: [row, col] });
      setOptimisticPos([row, col]);
      setMoveFeedback(isRespawning
        ? 'Nouveau point de départ sélectionné. Reprenez votre parcours depuis ici.'
        : 'Point de départ sélectionné. Cliquez ensuite sur la case voisine voulue, ou utilisez les commandes.');
      setMoveFeedbackTone('success');
      return;
    }

    const currentPos = Array.isArray(optimisticPos)
      ? optimisticPos
      : Array.isArray(myParticipantState?.solo?.pos)
        ? myParticipantState.solo.pos
        : null;
    if (!currentPos || currentPos.length < 2) return;

    const dr = Number(row) - Number(currentPos[0]);
    const dc = Number(col) - Number(currentPos[1]);
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;

    const dir = directionFromDelta(dr, dc);
    if (!dir || !canMoveFromCell(maze, currentPos, dir)) {
      setMoveFeedback('Mur detecte dans cette direction.');
      setMoveFeedbackTone('warning');
      return;
    }

    const nextPos = [Number(row), Number(col)];
    emitEvent('laby.solo.move', { dir });
    setOptimisticPos(nextPos);
  }

  function moveByDirection(dir) {
    if (!canMoveDir) return;
    emitEvent('laby.solo.move', { dir });
    if (gridRef.current && typeof gridRef.current.focus === 'function') {
      gridRef.current.focus();
    }
  }

  const colsClass = styles[`cols${mazeCols}`] || styles.cols20;

  return (
    <div className={styles.labyrinthContainer}>
      <section className={styles.hero}>
        <div className={styles.headerTitleLine}>
          <span className={styles.headerTitle}>Labyrinthe des Signaux</span>
          <span className={styles.headerDescription}>— OBSERVEZ LES TRACES, EVITEZ LES PIEGES, OUVREZ LA SORTIE.</span>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.mainRail}>
          {!hasChallengeStarted ? (
            <section className={styles.panel}>
              <ChallengeRulesPanel
                isStarted={false}
                isFacilitator={isFacilitator}
                challengeName="Labyrinthe Live"
                objective={rulesContent.objective}
                facilitatorRules={rulesContent.facilitator}
                participantRules={rulesContent.participant}
                footnote={rulesContent.footnote}
                onStart={isFacilitator ? () => emitEvent('timer.start') : null}
              />
              {error ? <p className={styles.error}>{error}</p> : null}
            </section>
          ) : isFacilitator ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Vue Facilitateur</h2>
                <p className={styles.muted}>Mini-grilles de suivi par participant</p>
              </div>
              {labyDebrief ? (
                <div className={styles.debriefCard}>
                  <h3>Debrief final</h3>
                  <p>
                    {labyDebrief.completed
                      ? `Victoire de ${participantNameById[labyDebrief.winnerId] || `Participant ${labyDebrief.winnerId}`}.`
                      : 'Echec collectif : aucun joueur n a atteint la sortie.'}
                  </p>
                  <p>Participants: {labyDebrief.totalPlayers} | Encore en vie: {labyDebrief.alivePlayers}</p>
                  {maze ? (
                    <div className={`${styles.miniGrid} ${colsClass} ${styles.solutionMiniGrid} ${styles.debriefMiniGrid}`}>
                      {Array.from({ length: mazeRows }).map((_, row) => (
                        Array.from({ length: mazeCols }).map((__, col) => {
                          const key = `${row},${col}`;
                          const classes = [styles.cell, styles.cellThumb];
                          if (allStartKeys.has(key)) classes.push(styles.cellStart);
                          if (key === endCellKey) classes.push(styles.cellExit);
                          if (safePathKeys.has(key)) classes.push(styles.cellSolution);
                          if (revealMazeTraps && mazeTrapKeys.has(key)) classes.push(styles.cellTrapKnown);
                          return (
                            <div
                              key={`debrief-${key}`}
                              className={classes.join(' ')}
                              style={buildMazeCellStyle(maze, row, col)}
                              aria-hidden="true"
                            >
                              {allStartKeys.has(key) ? <span className={styles.cellStartBadge}>START</span> : null}
                              {key === endCellKey ? <span className={styles.cellExitBadge}>EXIT</span> : null}
                              {safePathKeys.has(key) ? <span className={styles.cellTrapKnownIcon}>●</span> : null}
                              {revealMazeTraps && mazeTrapKeys.has(key) ? <span className={styles.cellTrapKnownIcon}>💣</span> : null}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {error ? <p className={styles.error}>{error}</p> : null}
              {participantEntries.length === 0 ? (
                <p className={styles.empty}>Aucun participant connecté pour le moment.</p>
              ) : (
                <div className={styles.miniGridList}>
                  {participantEntries.map(([id, participant]) => {
                    const playerPosKey = posKey(participant?.solo?.pos);
                    const playerVisited = normalizeVisited(participant?.solo?.visited || participant?.solo?.visited_cells || participant?.visited_cells);
                    const lives = Math.max(0, Number(participant?.lives_remaining || 0));
                    const lifeIcons = '❤️'.repeat(Math.min(8, lives));

                    return (
                      <article key={id} className={styles.miniGridCard}>
                        <div className={styles.panelHeader}>
                          <strong>{participantNameById[String(id)] || `Participant ${id}`}</strong>
                          <span className={styles.muted}>Vies: {lifeIcons || '—'}</span>
                        </div>

                        <div className={`${styles.miniGrid} ${colsClass}`}>
                          {Array.from({ length: mazeRows }).map((_, row) => (
                            Array.from({ length: mazeCols }).map((__, col) => {
                              const key = `${row},${col}`;
                              const classes = [styles.cell];
                              if (Boolean(revealedCells[key])) classes.push(styles.cellRevealed);
                              if (playerVisited.has(key)) classes.push(styles.cellVisited);
                              if (allStartKeys.has(key)) classes.push(styles.cellStart);
                              if (key !== startCellKey && allStartKeys.has(key)) classes.push(styles.cellStartAlt);
                              if (key === endCellKey) classes.push(styles.cellExit);
                              if (safePathKeys.has(key)) classes.push(styles.cellSafeLane);
                              if (revealMazeTraps && mazeTrapKeys.has(key)) classes.push(styles.cellTrapKnown);
                              if (revealedWalls[key]) classes.push(styles.cellTestedZone);
                              if (Boolean(revealedTraps[key])) {
                                const trapStatus = typeof revealedTraps[key] === 'object' ? String(revealedTraps[key]?.state || 'triggered') : 'triggered';
                                if (trapStatus === 'triggered') classes.push(styles.cellTrapTriggered);
                                if (trapStatus === 'resolved') classes.push(styles.cellTrapResolved);
                              }
                              if (key === playerPosKey) classes.push(styles.cellPlayer);
                              if (hasChallengeStarted && allStartKeys.has(key)) classes.push(styles.cellStartGlow);
                              if (flashCellKey === key) classes.push(flashCellTone === 'blocked' ? styles.cellBlockedFlash : styles.cellTrapFlash);
                              return (
                                <div
                                  key={`${id}-${key}`}
                                  className={classes.join(' ')}
                                  style={buildMazeCellStyle(maze, row, col)}
                                  aria-label={`Case ${row + 1}-${col + 1}`}
                                >
                                  {allStartKeys.has(key) ? <span className={styles.cellStartBadge}>D</span> : null}
                                  {key === endCellKey ? <span className={styles.cellExitBadge}>S</span> : null}
                                  {revealMazeTraps && mazeTrapKeys.has(key) ? <span className={styles.cellTrapKnownIcon}>💣</span> : null}
                                  {key === flashCellKey && flashCellTone === 'trap' ? <span className={styles.cellTrapIcon}>💥</span> : null}
                                  {key === flashCellKey && flashCellTone === 'blocked' ? <span className={styles.cellBlockedIcon}>⛔</span> : null}
                                  {key === playerPosKey ? <span className={styles.cellPlayerDot}>●</span> : null}
                                </div>
                              );
                            })
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Labyrinthe participant</h2>
                <div className={styles.livesRow}>
                  <span className={styles.muted}>Vies</span>
                  <strong>{'❤️'.repeat(Math.min(8, Math.max(0, Number(myParticipantState?.lives_remaining || 0)))) || '—'}</strong>
                </div>
              </div>

              {labyPhase === 'done' ? (
                <>
                  {labyDebrief ? (
                    <div className={styles.debriefCard}>
                      <h3>Débrief final</h3>
                      <p>
                        {labyDebrief.completed
                          ? `Victoire de ${participantNameById[labyDebrief.winnerId] || `Participant ${labyDebrief.winnerId}`} !`
                          : 'Échec collectif : aucun joueur n\'a atteint la sortie.'}
                      </p>
                      <p>Participants : {labyDebrief.totalPlayers} | Encore en vie : {labyDebrief.alivePlayers}</p>
                    </div>
                  ) : null}
                  <p className={styles.gameStatus}>
                    {laby?.winner_participant_id
                      ? `${participantNameById[String(laby.winner_participant_id)] || `Participant ${laby.winner_participant_id}`} a atteint la sortie.`
                      : 'Tous les joueurs ont épuisé leurs tentatives.'}
                  </p>
                  <p className={styles.muted}>Routes possibles du labyrinthe :</p>
                </>
              ) : null}

              <div
                className={`${styles.gameGrid} ${colsClass}`}
                ref={labyPhase !== 'done' ? gridRef : null}
                tabIndex={canMoveSolo ? 0 : -1}
                onTouchStart={labyPhase !== 'done' ? handleSwipeStart : undefined}
                onTouchEnd={labyPhase !== 'done' ? handleSwipeEnd : undefined}
                aria-label="Grille du labyrinthe"
              >
                {Array.from({ length: mazeRows }).map((_, row) => (
                  Array.from({ length: mazeCols }).map((__, col) => {
                    const key = `${row},${col}`;
                    const classes = [styles.cell];
                    const isVisited = myVisited.has(key);
                    if (Boolean(revealedCells[key])) classes.push(styles.cellRevealed);
                    if (isVisited) classes.push(styles.cellVisited);
                    if (allStartKeys.has(key)) classes.push(styles.cellStart);
                    if (key !== startCellKey && allStartKeys.has(key)) classes.push(styles.cellStartAlt);
                    if (key === endCellKey) classes.push(styles.cellExit);
                    if (revealedWalls[key]) classes.push(styles.cellTestedZone);
                    if (Boolean(revealedTraps[key])) {
                      const trapStatus = typeof revealedTraps[key] === 'object' ? String(revealedTraps[key]?.state || 'triggered') : 'triggered';
                      if (trapStatus === 'triggered') classes.push(styles.cellTrapTriggered);
                      if (trapStatus === 'resolved') classes.push(styles.cellTrapResolved);
                    }
                    if (key === playerPosKey) classes.push(styles.cellPlayerCursorCell);
                    if (key === mySpawnKey) classes.push(styles.cellMySpawn);
                    if (labyPhase === 'done' && safePathKeys.has(key)) classes.push(styles.cellSolution);
                    if (isRespawning && allStartKeys.has(key)) classes.push(styles.cellStartGlow);
                    if (flashCellKey === key) classes.push(flashCellTone === 'blocked' ? styles.cellBlockedFlash : styles.cellTrapFlash);

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`${classes.join(' ')}${!canMoveSolo ? ` ${styles.cellDisabled}` : ''}`}
                        style={buildMazeCellStyle(maze, row, col)}
                        onClick={() => handleCellClick(row, col)}
                        aria-disabled={!canMoveSolo}
                        aria-label={`Case ${row + 1}-${col + 1}`}
                      >
                        {allStartKeys.has(key) ? <span className={styles.cellStartBadge}>START</span> : null}
                        {key === endCellKey ? <span className={styles.cellExitBadge}>EXIT</span> : null}
                        {key === flashCellKey && flashCellTone === 'trap' ? <span className={styles.cellTrapIcon}>💥</span> : null}
                        {key === flashCellKey && flashCellTone === 'blocked' ? <span className={styles.cellBlockedIcon}>⛔</span> : null}
                        {microCue?.cellKey === key ? (
                          <span className={`${styles.cellMicroCue} ${styles[`cellMicroCue--${microCue.tone}`] || ''}`}>
                            {microCue.text}
                            {microCue.lifeDelta ? <em className={styles.cellMicroCueLife}>{microCue.lifeDelta}</em> : null}
                          </span>
                        ) : null}
                        {key === playerPosKey ? <span className={styles.cellPlayerDot}>●</span> : null}
                      </button>
                    );
                  })
                ))}
              </div>

              {labyPhase !== 'done' ? (
                <div className={styles.controlDock}>
                  <div className={styles.controlHeadLegendWrap}>
                    <div className={styles.controlHead}>
                      <span className={styles.muted}>Commandes</span>
                      <strong>Flèches, ZQSD/WASD, ou clic</strong>
                    </div>
                    <div className={styles.legendRow}>
                      <span className={`${styles.legendChip} ${styles.legendStart}`}>START</span>
                      <span className={`${styles.legendChip} ${styles.legendExit}`}>EXIT</span>
                      <span className={`${styles.legendChip} ${styles.legendTrap}`}>Piège</span>
                      <span className={`${styles.legendChip} ${styles.legendTrail}`}>Curseur joueur</span>
                    </div>
                  </div>
                  <div className={styles.directionPad}>
                    <span />
                    <button type="button" className={styles.dirBtn} onClick={() => moveByDirection('N')} disabled={!canMoveDir} aria-label="Monter">↑</button>
                    <span />
                    <button type="button" className={styles.dirBtn} onClick={() => moveByDirection('W')} disabled={!canMoveDir} aria-label="Aller à gauche">←</button>
                    <button type="button" className={styles.dirBtn} onClick={() => moveByDirection('S')} disabled={!canMoveDir} aria-label="Descendre">↓</button>
                    <button type="button" className={styles.dirBtn} onClick={() => moveByDirection('E')} disabled={!canMoveDir} aria-label="Aller à droite">→</button>
                  </div>
                  <p className={`${styles.moveFeedback} ${moveFeedbackTone === 'success' ? styles.feedbackSuccess : ''}${moveFeedbackTone === 'danger' ? ` ${styles.feedbackDanger}` : ''}${moveFeedbackTone === 'warning' ? ` ${styles.feedbackWarning}` : ''}`}>
                    {moveFeedback || (isRespawning ? 'Choisissez un point de départ pour reprendre.' : canMoveSolo ? 'Parcourez le maze en solo : une seule sortie est valide.' : (labyPhase === 'setup' ? 'En attente du lancement de la manche...' : 'Déplacement indisponible pour le moment.'))}
                  </p>
                </div>
              ) : null}

              {error ? <p className={styles.error}>{error}</p> : null}
            </section>
          )}
        </div>

        <aside className={styles.sideStack}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName="Labyrinthe Live"
            objective={rulesContent.objective}
            facilitatorRules={rulesContent.facilitator}
            participantRules={rulesContent.participant}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={Number(timer?.remaining_seconds || 0)}
            durationSeconds={Number(runtimePayload?.config?.timer?.duration_seconds || 300)}
            status={String(timer?.status || 'idle')}
            isFacilitator={isFacilitator}
            waitingText=""
            ringAction={isFacilitator && hasChallengeStarted ? (
              <button
                type="button"
                onClick={() => {
                  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
                  if (timerStatus === 'running') {
                    emitEvent('timer.pause');
                  } else if (timerStatus === 'paused') {
                    emitEvent('timer.resume');
                  }
                }}
                title={String(timer?.status || '').trim().toLowerCase() === 'running' ? 'Mettre en pause' : 'Reprendre'}
                aria-label={String(timer?.status || '').trim().toLowerCase() === 'running' ? 'Mettre en pause' : 'Reprendre'}
              >
                {String(timer?.status || '').trim().toLowerCase() === 'running' ? '⏸' : '▶'}
              </button>
            ) : null}
          />

          {chatEnabled ? (
            <ChallengeChatCard
              title="Chat"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              onQuickMessage={sendQuickChat}
              placeholder="Message a l'équipe"
              maxLength={240}
            />
          ) : null}

          {isFacilitator && maze ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--challenge-text-primary)' }}>Carte solution</h4>
                <span className={styles.muted}>chemin(s) possible(s)</span>
              </div>
              <div className={`${styles.miniGrid} ${colsClass} ${styles.solutionMiniGrid}`}>
                {Array.from({ length: mazeRows }).map((_, row) => (
                  Array.from({ length: mazeCols }).map((__, col) => {
                    const key = `${row},${col}`;
                    const cls = [styles.cell, styles.cellThumb];
                    if (allStartKeys.has(key)) cls.push(styles.cellStart);
                    if (key === endCellKey) cls.push(styles.cellExit);
                    if (safePathKeys.has(key)) cls.push(styles.cellSolution);
                    if (revealMazeTraps && mazeTrapKeys.has(key)) cls.push(styles.cellTrapKnown);
                    return (
                      <div
                        key={`sol-${key}`}
                        className={cls.join(' ')}
                        style={buildMazeCellStyle(maze, row, col)}
                        aria-hidden="true"
                      >
                        {allStartKeys.has(key) ? <span className={styles.cellStartBadge}>START</span> : null}
                        {key === endCellKey ? <span className={styles.cellExitBadge}>EXIT</span> : null}
                        {safePathKeys.has(key) ? <span className={styles.cellTrapKnownIcon}>●</span> : null}
                        {revealMazeTraps && mazeTrapKeys.has(key) ? <span className={styles.cellTrapKnownIcon}>💣</span> : null}
                      </div>
                    );
                  })
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}