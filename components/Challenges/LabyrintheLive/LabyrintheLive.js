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

function posKey(pos) {
  if (!Array.isArray(pos)) return '';
  const row = Number(pos[0]);
  const col = Number(pos[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return '';
  return `${row},${col}`;
}

function safeInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const normalized = Number.isInteger(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, normalized));
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function generateMaze(rows, cols) {
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: false, e: false, s: false, w: false })));
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const opposite = { n: 's', e: 'w', s: 'n', w: 'e' };
  const vectors = [
    { key: 'n', dr: -1, dc: 0 },
    { key: 'e', dr: 0, dc: 1 },
    { key: 's', dr: 1, dc: 0 },
    { key: 'w', dr: 0, dc: -1 },
  ];

  function carve(row, col) {
    visited[row][col] = true;
    const dirs = shuffle(vectors);
    dirs.forEach(({ key, dr, dc }) => {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) return;
      if (visited[nextRow][nextCol]) return;
      cells[row][col][key] = true;
      cells[nextRow][nextCol][opposite[key]] = true;
      carve(nextRow, nextCol);
    });
  }

  carve(0, 0);

  function farthestFromStart() {
    const queue = [[0, 0, 0]];
    const seen = new Set(['0,0']);
    let farthest = [rows - 1, cols - 1];
    let maxDistance = -1;

    while (queue.length > 0) {
      const [row, col, distance] = queue.shift();
      if (distance > maxDistance) {
        maxDistance = distance;
        farthest = [row, col];
      }
      const cell = cells[row][col];
      if (cell.n && !seen.has(`${row - 1},${col}`)) {
        seen.add(`${row - 1},${col}`);
        queue.push([row - 1, col, distance + 1]);
      }
      if (cell.e && !seen.has(`${row},${col + 1}`)) {
        seen.add(`${row},${col + 1}`);
        queue.push([row, col + 1, distance + 1]);
      }
      if (cell.s && !seen.has(`${row + 1},${col}`)) {
        seen.add(`${row + 1},${col}`);
        queue.push([row + 1, col, distance + 1]);
      }
      if (cell.w && !seen.has(`${row},${col - 1}`)) {
        seen.add(`${row},${col - 1}`);
        queue.push([row, col - 1, distance + 1]);
      }
    }

    return farthest;
  }

  return {
    start: [0, 0],
    end: farthestFromStart(),
    cells,
  };
}

function getLabyRuntimeConfig(runtimePayload, laby) {
  const source = runtimePayload?.config?.labyrinthe && typeof runtimePayload.config.labyrinthe === 'object'
    ? runtimePayload.config.labyrinthe
    : runtimePayload?.config && typeof runtimePayload.config === 'object'
      ? runtimePayload.config
      : {};

  const rows = safeInt(source.rows ?? source.r ?? laby?.cfg?.rows ?? laby?.cfg?.r, 8, 6, 14);
  const cols = safeInt(source.cols ?? source.c ?? laby?.cfg?.cols ?? laby?.cfg?.c, 8, 6, 14);

  return {
    rows,
    cols,
    cx: Number(source.cx ?? laby?.cfg?.cx ?? 0.65) || 0.65,
    lives: safeInt(source.lives ?? source.lives_per_player ?? laby?.cfg?.lives, 3, 1, 8),
    trap_percent: Math.min(0.4, Math.max(0, Number(source.trap_percent ?? source.tp ?? laby?.cfg?.trap_percent ?? 0.12) || 0.12)),
  };
}

function getParticipantStatusMeta(participant) {
  const connected = Boolean(participant?.connected);
  const lives = Number(participant?.lives_remaining || 0);
  const soloStatus = String(participant?.solo?.st || '').trim().toLowerCase();

  if (!connected) {
    return { label: 'Hors ligne', tone: 'offline' };
  }
  if (lives <= 0 || soloStatus === 'eliminated' || soloStatus === 'dead') {
    return { label: 'Bloque', tone: 'blocked' };
  }
  if (soloStatus === 'moving' || soloStatus === 'play' || soloStatus === 'playing') {
    return { label: 'En action', tone: 'active' };
  }
  return { label: 'Connecte', tone: 'connected' };
}

export default function LabyrintheLive({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
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

  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  const voteCounts = useMemo(() => {
    const counts = { N: 0, E: 0, S: 0, W: 0 };
    const parts = laby?.parts && typeof laby.parts === 'object' ? Object.values(laby.parts) : [];
    parts.forEach((participant) => {
      const vote = String(participant?.vote || '').trim().toUpperCase();
      if (counts[vote] != null) {
        counts[vote] += 1;
      }
    });
    return counts;
  }, [laby?.parts]);

  const connectedCount = useMemo(() => {
    const parts = laby?.parts && typeof laby.parts === 'object' ? Object.values(laby.parts) : [];
    return parts.filter((participant) => participant?.connected === true).length;
  }, [laby?.parts]);

  const voteEndsAtMs = Number(laby?.col?.vote_ends_at_ms || 0);
  const voteWindowRemainingSeconds = voteEndsAtMs > 0
    ? Math.max(0, Math.ceil((voteEndsAtMs - nowMs) / 1000))
    : 0;

  const canVote = !isFacilitator && String(laby?.phase || '').trim() === 'colAtt';
  const canMoveSolo = !isFacilitator
    && String(laby?.phase || '').trim() === 'solo'
    && Boolean(laby?.maze)
    && Number(laby?.parts?.[String(participantId)]?.lives_remaining || 0) > 0;
  const voteTotal = Number(voteCounts.N || 0) + Number(voteCounts.E || 0) + Number(voteCounts.S || 0) + Number(voteCounts.W || 0);
  const lastResolution = laby?.col?.last_resolution || null;
  const chatEnabled = state?.config?.chat?.enabled !== false && Boolean(socket);

  const myParticipantState = laby?.parts?.[String(participantId)] || null;
  const revealedCells = laby?.revealed_cells && typeof laby.revealed_cells === 'object' ? laby.revealed_cells : {};
  const revealedTraps = laby?.revealed_traps && typeof laby.revealed_traps === 'object' ? laby.revealed_traps : {};
  const mazeRows = safeInt(laby?.cfg?.rows ?? laby?.cfg?.r, 8, 1, 24);
  const mazeCols = safeInt(laby?.cfg?.cols ?? laby?.cfg?.c, 8, 1, 24);
  const mazeCells = Array.isArray(laby?.maze?.cells) ? laby.maze.cells : [];
  const participantEntries = useMemo(() => Object.entries(laby?.parts || {}), [laby?.parts]);
  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasChallengeStarted = timerStatus === 'running'
    || timerStatus === 'paused'
    || timerStatus === 'completed'
    || timerStatus === 'stopped'
    || timerStatus === 'timeout'
    || (Boolean(laby?.phase) && String(laby.phase).trim() !== 'setup');

  const [participantActionFeed, setParticipantActionFeed] = useState({});
  const previousParticipantSnapshotRef = useRef({});
  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config),
    [runtimePayload?.config, state?.config]
  );

  useEffect(() => {
    if (!isFacilitator) return;

    const nextSnapshot = {};

    if (!hasChallengeStarted) {
      previousParticipantSnapshotRef.current = {};
      setParticipantActionFeed({});
      return;
    }

    const nowLabel = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const updatesByParticipant = {};

    participantEntries.forEach(([id, participant]) => {
      const position = Array.isArray(participant?.solo?.pos)
        ? [Number(participant.solo.pos[0]), Number(participant.solo.pos[1])]
        : null;
      const snapshot = {
        connected: Boolean(participant?.connected),
        lives: Number(participant?.lives_remaining || 0),
        status: String(participant?.solo?.st || '').trim(),
        vote: String(participant?.vote || '').trim().toUpperCase(),
        position,
      };

      nextSnapshot[id] = snapshot;

      const previous = previousParticipantSnapshotRef.current[id];
      if (!previous) {
        updatesByParticipant[id] = {
          text: 'Session de jeu activee',
          at: nowLabel,
        };
        return;
      }

      const updates = [];
      if (previous.connected !== snapshot.connected) {
        updates.push(snapshot.connected ? 'connexion' : 'deconnexion');
      }
      if (previous.lives !== snapshot.lives) {
        const diff = snapshot.lives - previous.lives;
        updates.push(diff < 0 ? `-${Math.abs(diff)} vie` : `+${diff} vie`);
      }
      if (previous.status !== snapshot.status && snapshot.status) {
        updates.push(`statut: ${snapshot.status}`);
      }
      if (previous.vote !== snapshot.vote && snapshot.vote) {
        updates.push(`vote: ${snapshot.vote}`);
      }

      const previousPos = Array.isArray(previous.position) ? previous.position : null;
      const currentPos = Array.isArray(snapshot.position) ? snapshot.position : null;
      const moved = previousPos
        && currentPos
        && (previousPos[0] !== currentPos[0] || previousPos[1] !== currentPos[1]);
      if (moved) {
        updates.push(`deplacement vers (${currentPos[0] + 1}, ${currentPos[1] + 1})`);
      }

      if (updates.length > 0) {
        updatesByParticipant[id] = {
          text: updates.join(' · '),
          at: nowLabel,
        };
      }
    });

    previousParticipantSnapshotRef.current = nextSnapshot;

    if (Object.keys(updatesByParticipant).length === 0) return;

    setParticipantActionFeed((prev) => {
      const next = { ...prev };
      Object.entries(updatesByParticipant).forEach(([id, update]) => {
        const existing = Array.isArray(prev[id]) ? prev[id] : [];
        next[id] = [update, ...existing].slice(0, 6);
      });
      return next;
    });
  }, [hasChallengeStarted, isFacilitator, participantEntries]);

  useEffect(() => {
    if (!isFacilitator) return;
    if (!laby) return;
    const phase = String(laby.phase || '').trim();
    if (phase !== 'setup') return;
    if (laby.maze && Array.isArray(laby.maze.cells)) return;
    if (didAutoSetupRef.current) return;

    const cfg = getLabyRuntimeConfig(runtimePayload, laby);
    const maze = generateMaze(cfg.rows, cfg.cols);
    didAutoSetupRef.current = true;
    emitEvent('laby.setup.apply', {
      cfg,
      maze,
    });
  }, [isFacilitator, laby, runtimePayload, emitEvent]);

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    const id = String(participantId || context?.userId || context?.participantId || '').trim();
    return `participant-${id || 'unknown'}`;
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

  return (
    <div className={styles.labyrinthContainer}>
      <section className={styles.hero}>
        {isFacilitator ? (
          <p className={styles.heroSingleLine}>
            <strong>Labyrinthe Live</strong>
            <span> Orientez l'equipe vers la sortie en evitant les pieges, avec des decisions rapides et coordonnees.</span>
          </p>
        ) : (
          <>
            <h1>Labyrinthe Live</h1>
            <p>Coordination en temps reel: trouvez la sortie avec votre equipe et gerer les risques.</p>
          </>
        )}
      </section>

      <div className={`${styles.layout} ${styles.layoutWithRightRail}`}>
        <div className={styles.mainRail}>
          {!hasChallengeStarted ? (
            <section className={styles.panel}>
              <ChallengeRulesPanel
                isStarted={false}
                challengeName="Labyrinthe Live"
                objective={rulesContent.objective}
                facilitatorRules={rulesContent.facilitator}
                participantRules={rulesContent.participant}
                footnote={rulesContent.footnote}
              />
              {error ? <p className={styles.error}>{error}</p> : null}
            </section>
          ) : isFacilitator ? (
            <section className={styles.panel}>
              <h2>Suivi facilitateur - actions par participant</h2>
              <p>Ce tableau se met a jour automatiquement pour aider l'animation et les relances en session.</p>
              {error ? <p className={styles.error}>{error}</p> : null}
              {participantEntries.length === 0 ? (
                <p>Aucun participant connecte pour le moment.</p>
              ) : (
                <div className={styles.actionFeedList}>
                  {participantEntries.map(([id, participant]) => {
                    const position = Array.isArray(participant?.solo?.pos)
                      ? `(${Number(participant.solo.pos[0]) + 1}, ${Number(participant.solo.pos[1]) + 1})`
                      : '-';
                    const feedItems = Array.isArray(participantActionFeed[id]) ? participantActionFeed[id] : [];
                    const statusMeta = getParticipantStatusMeta(participant);

                    return (
                      <article key={id} className={styles.actionFeedCard}>
                        <div className={styles.actionFeedHead}>
                          <strong>{participant?.name || `participant-${id}`}</strong>
                          <span>Vies: {Number(participant?.lives_remaining || 0)} · Position: {position}</span>
                          <span className={`${styles.statusBadge} ${styles[`statusBadge${statusMeta.tone.charAt(0).toUpperCase()}${statusMeta.tone.slice(1)}`]}`}>
                            {statusMeta.label}
                          </span>
                          <span>Statut jeu: {participant?.solo?.st || '-'} · Connecte: {participant?.connected ? 'oui' : 'non'}</span>
                        </div>

                        {feedItems.length === 0 ? (
                          <p className={styles.actionFeedEmpty}>Aucune action recente detectee.</p>
                        ) : (
                          <ul className={styles.actionFeedEntries}>
                            {feedItems.map((item, idx) => (
                              <li key={`${id}-${idx}`}>
                                <span>{item.at}</span>
                                <span>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className={styles.panel}>
              <h2>Vue de jeu participant</h2>
              <p>Le challenge est en cours. Votre zone de jeu est active.</p>
              <p>Phase: {laby?.phase || '-'}</p>
              <p>Config: {laby?.cfg ? `${laby.cfg.rows || laby.cfg.r}x${laby.cfg.cols || laby.cfg.c}` : '-'}</p>
              <p>Connectes: {connectedCount}</p>
              <p>Mes vies: {myParticipantState ? Number(myParticipantState.lives_remaining || 0) : '-'}</p>
              <p>Votes (si phase colAtt): {voteTotal}</p>
              <p>Fin du vote: {voteWindowRemainingSeconds > 0 ? `${voteWindowRemainingSeconds}s` : '—'}</p>
              {lastResolution ? (
                <p>
                  Derniere resolution: {String(lastResolution.dir || '-')} ({String(lastResolution.outcome || 'progress')})
                </p>
              ) : null}
              {String(laby?.phase || '').trim() === 'done' ? (
                <p className={styles.statusSuccess}>
                  {laby?.winner_participant_id
                    ? `Victoire: participant ${laby.winner_participant_id} a atteint la sortie.`
                    : 'Defaite: tous les joueurs ont perdu leurs tentatives.'}
                </p>
              ) : null}
              {error ? <p className={styles.error}>{error}</p> : null}
            </section>
          )}
        </div>

        <aside className={`${styles.sideStack} ${styles.rightRail} ${isFacilitator ? styles.sideStackEqual : ''}`}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            showPrestartCard={false}
            challengeName="Labyrinthe Live"
            objective={rulesContent.objective}
            facilitatorRules={rulesContent.facilitator}
            participantRules={rulesContent.participant}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            className={`${styles.panel} ${isFacilitator ? styles.timerPanelEqual : styles.timerPanel}`}
            title="Chrono session"
            remainingSeconds={Number(timer?.remaining_seconds || 0)}
            durationSeconds={Number(runtimePayload?.config?.timer?.duration_seconds || 300)}
            status={String(timer?.status || 'idle')}
            isFacilitator={isFacilitator}
            waitingText="⏳ En attente du lancement par le facilitateur"
            ringAction={isFacilitator ? (
              <button
                className={styles.timerIconBtn}
                type="button"
                onClick={() => {
                  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
                  if (timerStatus === 'running') {
                    emitEvent('timer.pause');
                  } else if (timerStatus === 'paused') {
                    emitEvent('timer.resume');
                  } else {
                    emitEvent('timer.start');
                  }
                }}
                title={String(timer?.status || '').trim().toLowerCase() === 'running' ? 'Mettre en pause' : 'Demarrer / Reprendre'}
                aria-label={String(timer?.status || '').trim().toLowerCase() === 'running' ? 'Mettre en pause' : 'Demarrer / Reprendre'}
              >
                {String(timer?.status || '').trim().toLowerCase() === 'running' ? '⏸' : '▶'}
              </button>
            ) : null}
          />

          {chatEnabled ? (
            <ChallengeChatCard
              className={`${styles.panel} ${isFacilitator ? styles.chatPanelEqual : ''}`}
              title="Canal equipe"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              onQuickMessage={sendQuickChat}
              placeholder="Message a l'equipe"
              maxLength={240}
            />
          ) : null}
        </aside>
      </div>

      {!isFacilitator ? (
        hasChallengeStarted ? (
        <>
          <div className={styles.layout}>
            <section className={styles.panel}>
              <h2>Déplacements</h2>
              <p>Les joueurs peuvent jouer dans n'importe quel ordre.</p>
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={() => emitEvent('laby.solo.move', { dir: 'N' })} disabled={!canMoveSolo}>Haut</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('laby.solo.move', { dir: 'E' })} disabled={!canMoveSolo}>Droite</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('laby.solo.move', { dir: 'S' })} disabled={!canMoveSolo}>Bas</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('laby.solo.move', { dir: 'W' })} disabled={!canMoveSolo}>Gauche</button>
              </div>

              <h3 className={styles.subTitle}>Votes collectifs (compat)</h3>
              <div className={styles.voteGrid}>
                <span>N: {voteCounts.N}</span>
                <span>E: {voteCounts.E}</span>
                <span>S: {voteCounts.S}</span>
                <span>W: {voteCounts.W}</span>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={() => emitEvent('laby.col.vote', { dir: 'N' })} disabled={!canVote}>Vote N</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'E' })} disabled={!canVote}>Vote E</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'S' })} disabled={!canVote}>Vote S</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'W' })} disabled={!canVote}>Vote W</button>
              </div>
            </section>

            <section className={styles.panel}>
              <h2>Grille découverte</h2>
              <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${mazeCols}, minmax(22px, 1fr))` }}>
                {Array.from({ length: mazeRows }).map((_, row) => (
                  Array.from({ length: mazeCols }).map((__, col) => {
                    const key = `${row},${col}`;
                    const cell = Array.isArray(mazeCells[row]) ? mazeCells[row][col] : null;
                    const isRevealed = Boolean(revealedCells[key]);
                    const isStart = posKey(laby?.maze?.start) === key;
                    const isExit = posKey(laby?.maze?.end) === key;
                    const showExit = isExit && Boolean(laby?.reveal_exit_to_all);
                    const hasTrap = Boolean(revealedTraps[key]);

                    const participantsHere = Object.entries(laby?.parts || {}).filter(([, participant]) => {
                      const pos = participant?.solo?.pos;
                      return posKey(pos) === key;
                    });

                    const cellClasses = [styles.cell];
                    if (isRevealed) cellClasses.push(styles.cellRevealed);
                    if (isStart) cellClasses.push(styles.cellStart);
                    if (showExit) cellClasses.push(styles.cellExit);
                    if (hasTrap) cellClasses.push(styles.cellTrap);

                    const wallTop = isRevealed && cell && !cell.n;
                    const wallRight = isRevealed && cell && !cell.e;
                    const wallBottom = isRevealed && cell && !cell.s;
                    const wallLeft = isRevealed && cell && !cell.w;

                    return (
                      <div
                        key={key}
                        className={cellClasses.join(' ')}
                        style={{
                          borderTopWidth: wallTop ? 3 : 1,
                          borderRightWidth: wallRight ? 3 : 1,
                          borderBottomWidth: wallBottom ? 3 : 1,
                          borderLeftWidth: wallLeft ? 3 : 1,
                        }}
                        title={isRevealed ? `Case ${row + 1},${col + 1}` : 'Inconnue'}
                      >
                        {isStart ? <span className={styles.cellLabel}>D</span> : null}
                        {showExit ? <span className={styles.cellLabel}>S</span> : null}
                        {hasTrap ? <span className={styles.cellTrapMark}>⚠</span> : null}
                        {participantsHere.length > 0 ? <span className={styles.cellCount}>{participantsHere.length}</span> : null}
                      </div>
                    );
                  })
                ))}
              </div>
            </section>

          </div>

          <section className={styles.layout}>
            <div className={styles.panel}>
              <h2>Participants</h2>
              <div className={styles.participantList}>
                {Object.entries(laby?.parts || {}).map(([id, participant]) => {
                  const position = Array.isArray(participant?.solo?.pos)
                    ? `(${Number(participant.solo.pos[0]) + 1}, ${Number(participant.solo.pos[1]) + 1})`
                    : '-';
                  return (
                    <div key={id} className={styles.participantItem}>
                      <strong>{participant?.name || `participant-${id}`}</strong>
                      <span>Vies: {Number(participant?.lives_remaining || 0)}</span>
                      <span>Position: {position}</span>
                      <span>Statut: {participant?.solo?.st || '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
        ) : (
          <section className={styles.layoutSingle}>
            <div className={styles.panel}>
              <h2>En attente du lancement</h2>
              <p>La zone de jeu participant s'active automatiquement des que le facilitateur lance le challenge.</p>
            </div>
          </section>
        )
      ) : null}
    </div>
  );
}