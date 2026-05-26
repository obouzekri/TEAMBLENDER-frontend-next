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
  const swipeStartRef = useRef(null);

  const canMoveSolo = !isFacilitator
    && String(laby?.phase || '').trim() !== 'done'
    && Boolean(laby?.maze)
    && Number(laby?.parts?.[String(participantId)]?.lives_remaining || 0) > 0;

  const chatEnabled = state?.config?.chat?.enabled !== false && Boolean(socket);

  const myParticipantState = laby?.parts?.[String(participantId)] || null;
  const revealedCells = laby?.revealed_cells && typeof laby.revealed_cells === 'object' ? laby.revealed_cells : {};
  const revealedTraps = laby?.revealed_traps && typeof laby.revealed_traps === 'object' ? laby.revealed_traps : {};
  const mazeRows = safeInt(laby?.cfg?.rows ?? laby?.cfg?.r, 8, 6, 14);
  const mazeCols = safeInt(laby?.cfg?.cols ?? laby?.cfg?.c, 8, 6, 14);
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

  const startCellKey = posKey(laby?.maze?.start);
  const endCellKey = posKey(laby?.maze?.end);

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
    () => resolveChallengeRules(state?.config || runtimePayload?.config),
    [runtimePayload?.config, state?.config]
  );

  useEffect(() => {
    if (!isFacilitator) return;
    if (!laby) return;
    const phase = String(laby.phase || '').trim();
    if (phase !== 'setup') return;
    if (didAutoSetupRef.current) return;
    didAutoSetupRef.current = true;
  }, [isFacilitator, laby]);

  useEffect(() => {
    if (!canMoveSolo) return () => {};

    const onKeyDown = (event) => {
      const map = {
        ArrowUp: 'N',
        ArrowRight: 'E',
        ArrowDown: 'S',
        ArrowLeft: 'W',
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      emitEvent('laby.solo.move', { dir });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [canMoveSolo, emitEvent]);

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

  function handleSwipeStart(event) {
    if (!canMoveSolo) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleSwipeEnd(event) {
    if (!canMoveSolo) return;
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
    const currentPos = Array.isArray(myParticipantState?.solo?.pos) ? myParticipantState.solo.pos : null;
    if (!currentPos || currentPos.length < 2) return;

    const dr = Number(row) - Number(currentPos[0]);
    const dc = Number(col) - Number(currentPos[1]);
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;

    if (dr === -1) emitEvent('laby.solo.move', { dir: 'N' });
    if (dr === 1) emitEvent('laby.solo.move', { dir: 'S' });
    if (dc === -1) emitEvent('laby.solo.move', { dir: 'W' });
    if (dc === 1) emitEvent('laby.solo.move', { dir: 'E' });
  }

  const colsClass = styles[`cols${mazeCols}`] || styles.cols8;

  return (
    <div className={styles.labyrinthContainer}>
      <section className={styles.hero}>
        <p className={styles.heroLine}>
          <span className={styles.headerBadge}>Labyrinthe</span>
          <span className={styles.headerInline}>Live : Orientez l'équipe vers la sortie en évitant les pièges, avec des décisions rapides et coordonnées.</span>
        </p>
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
                              if (key === startCellKey) classes.push(styles.cellStart);
                              if (key === endCellKey) classes.push(styles.cellExit);
                              if (Boolean(revealedTraps[key])) classes.push(styles.cellTrap);
                              if (key === playerPosKey) classes.push(styles.cellPlayer);
                              return (
                                <div key={`${id}-${key}`} className={classes.join(' ')} aria-label={`Case ${row + 1}-${col + 1}`}>
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
                <h2>Grille de jeu</h2>
                <div className={styles.livesRow}>
                  <span className={styles.muted}>Vies</span>
                  <strong>{'❤️'.repeat(Math.min(8, Math.max(0, Number(myParticipantState?.lives_remaining || 0)))) || '—'}</strong>
                </div>
              </div>

              <div
                className={`${styles.gameGrid} ${colsClass}`}
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
              >
                {Array.from({ length: mazeRows }).map((_, row) => (
                  Array.from({ length: mazeCols }).map((__, col) => {
                    const key = `${row},${col}`;
                    const classes = [styles.cell];
                    const isVisited = myVisited.has(key);
                    if (Boolean(revealedCells[key])) classes.push(styles.cellRevealed);
                    if (isVisited) classes.push(styles.cellVisited);
                    if (key === startCellKey) classes.push(styles.cellStart);
                    if (key === endCellKey) classes.push(styles.cellExit);
                    if (key === posKey(myParticipantState?.solo?.pos)) classes.push(styles.cellPlayer);

                    return (
                      <button
                        key={key}
                        type="button"
                        className={classes.join(' ')}
                        onClick={() => handleCellClick(row, col)}
                        disabled={!canMoveSolo}
                        aria-label={`Case ${row + 1}-${col + 1}`}
                      >
                        {key === posKey(myParticipantState?.solo?.pos) ? <span className={styles.cellPlayerDot}>●</span> : null}
                      </button>
                    );
                  })
                ))}
              </div>

              {String(laby?.phase || '').trim() === 'done' ? (
                <p className={styles.gameStatus}>
                  {laby?.winner_participant_id
                    ? `Victoire : ${participantNameById[String(laby.winner_participant_id)] || `Participant ${laby.winner_participant_id}`} a atteint la sortie.`
                    : 'Défaite : tous les joueurs ont perdu leurs tentatives.'}
                </p>
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
            title="CHRONO"
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
              title="CHAT"
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
    </div>
  );
}