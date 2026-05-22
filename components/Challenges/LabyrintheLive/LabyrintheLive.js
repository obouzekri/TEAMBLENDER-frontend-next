'use client';
import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import ChallengeTimerCard from '../ChallengeTimerCard';
import styles from './Labyrinthe.module.css';

export default function LabyrintheLive({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const laby = state?.labyrinthe || null;
  const timer = state?.timer || null;

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
  const voteTotal = Number(voteCounts.N || 0) + Number(voteCounts.E || 0) + Number(voteCounts.S || 0) + Number(voteCounts.W || 0);
  const lastResolution = laby?.col?.last_resolution || null;

  return (
    <div className={styles.labyrinthContainer}>
      <section className={styles.hero}>
        <h1>Labyrinthe Live</h1>
        <p>Challenge collaboratif en temps réel</p>
      </section>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>État labyrinthe</h2>
          <p>Phase: {laby?.phase || '-'}</p>
          <p>Config: {laby?.cfg ? `${laby.cfg.r}x${laby.cfg.c}` : '-'}</p>
          <p>Participants: {laby?.parts ? Object.keys(laby.parts).length : 0}</p>
          <p>Connectés: {connectedCount}</p>
          <p>Votes (tour courant): {voteTotal}</p>
          <p>Fin du vote: {voteWindowRemainingSeconds > 0 ? `${voteWindowRemainingSeconds}s` : '—'}</p>
          {lastResolution ? (
            <p>
              Dernière résolution: {String(lastResolution.dir || '-')} ({String(lastResolution.outcome || 'progress')})
            </p>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>

        <ChallengeTimerCard
          className={`${styles.panel} ${styles.timerCard}`}
          title="Chronometre"
          remainingSeconds={Number(timer?.remaining_seconds || 0)}
          durationSeconds={Number(runtimePayload?.config?.timer?.duration_seconds || 300)}
          status={String(timer?.status || 'idle')}
          isFacilitator={isFacilitator}
          waitingText="⏳ En attente du facilitateur"
          actions={isFacilitator ? (
            <div className={styles.timerActionsGroup}>
              <button
                className={styles.timerBtnStart}
                type="button"
                onClick={() => emitEvent('timer.start')}
                disabled={timer?.status === 'running'}
              >
                ▶ Demarrer
              </button>
              <button
                className={styles.timerBtnPauseResume}
                type="button"
                onClick={() => timer?.status === 'paused' ? emitEvent('timer.resume') : emitEvent('timer.pause')}
                disabled={timer?.status !== 'running' && timer?.status !== 'paused'}
              >
                {timer?.status === 'paused' ? '⏯ Reprendre' : '⏸ Pause'}
              </button>
              <button
                className={styles.timerBtnStop}
                type="button"
                onClick={() => emitEvent('timer.stop')}
                disabled={timer?.status === 'idle'}
              >
                ⏹ Arreter
              </button>
            </div>
          ) : null}
        />
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>Actions collectives</h2>
          <div className={styles.voteGrid}>
            <span>N: {voteCounts.N}</span>
            <span>E: {voteCounts.E}</span>
            <span>S: {voteCounts.S}</span>
            <span>W: {voteCounts.W}</span>
          </div>
          {isFacilitator ? (
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.reset')}>Reset labyrinthe</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.phase.next', { phase: 'colAtt' })}>Phase colAtt</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.resolve.now')}>Résoudre les votes</button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => emitEvent('laby.col.vote', { dir: 'N' })} disabled={!canVote}>Vote N</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'E' })} disabled={!canVote}>Vote E</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'S' })} disabled={!canVote}>Vote S</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'W' })} disabled={!canVote}>Vote W</button>
            </div>
          )}
        </section>
      </div>

      <details className={styles.debug}>
        <summary>Debug events</summary>
        <pre>{JSON.stringify(events.slice(0, 8), null, 2)}</pre>
      </details>
    </div>
  );
}