'use client';
import React from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import styles from './Icebreaker.module.css';

export default function IcebreakerChallenge({ engineKey, runtimePayload, socket, context }) {
  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context });

  const timer = state?.timer || null;
  const summary = state?.summary || null;

  return (
    <div className={styles.icebreakerContainer}>
      <section className={styles.hero}>
        <h1>Icebreaker</h1>
        <p>Session live</p>
      </section>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>État challenge</h2>
          <p>Engine: {engineKey}</p>
          <p>Timer: {timer?.status || '-'} / {Number(timer?.remaining_seconds || 0)}s</p>
          <p>Actions: {Number(state?.summary?.action_count || 0)}</p>
          {summary ? <p>Score équipe: {Number(summary.collective_score || 0)}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>

        <section className={styles.panel}>
          <h2>Contrôles</h2>
          {isFacilitator ? (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => emitEvent('timer.start')}>Start timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.pause')}>Pause timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.resume')}>Resume timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.stop')}>Stop timer</button>
            </div>
          ) : (
            <p>Le facilitateur pilote le timing de la session.</p>
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