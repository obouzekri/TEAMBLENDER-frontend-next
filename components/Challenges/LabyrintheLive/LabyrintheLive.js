'use client';
import React from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import styles from './Labyrinthe.module.css';

export default function LabyrintheLive({ engineKey, runtimePayload, socket, context }) {
  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context });

  const laby = state?.labyrinthe || null;
  const timer = state?.timer || null;

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
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>

        <section className={`${styles.panel} ${styles.timerCard}`}>
          <h3 className={styles.timerTitle}>Chronomètre</h3>
          
          <div className={styles.timerRingContainer}>
            <div 
              className={styles.timerRing}
              style={{
                background: `conic-gradient(#22c55e ${(Number(timer?.remaining_seconds || 0) / (Number(runtimePayload?.config?.timer?.duration_seconds || 300)) * 360)}deg, rgba(148, 163, 184, 0.25) ${(Number(timer?.remaining_seconds || 0) / (Number(runtimePayload?.config?.timer?.duration_seconds || 300)) * 360)}deg)`
              }}
            >
              <div className={styles.timerDisplay}>
                <div className={styles.timerTime}>
                  {String(Math.floor(Number(timer?.remaining_seconds || 0) / 60)).padStart(2, '0')}:
                  {String(Number(timer?.remaining_seconds || 0) % 60).padStart(2, '0')}
                </div>
                <div className={styles.timerState}>
                  {timer?.status === 'running' ? 'En cours' : timer?.status === 'paused' ? 'Pause' : 'Attente'}
                </div>
              </div>
            </div>
          </div>

          {isFacilitator ? (
            <div className={styles.timerActionsGroup}>
              <button 
                className={styles.timerBtnStart} 
                type="button" 
                onClick={() => emitEvent('timer.start')}
                disabled={timer?.status === 'running'}
              >
                ▶️ Démarrer
              </button>
              <button 
                className={styles.timerBtnPauseResume} 
                type="button" 
                onClick={() => timer?.status === 'paused' ? emitEvent('timer.resume') : emitEvent('timer.pause')}
                disabled={timer?.status !== 'running' && timer?.status !== 'paused'}
              >
                {timer?.status === 'paused' ? '⏯️ Reprendre' : '⏸️ Pause'}
              </button>
              <button 
                className={styles.timerBtnStop} 
                type="button" 
                onClick={() => emitEvent('timer.stop')}
                disabled={timer?.status === 'idle'}
              >
                ⏹️ Arrêter
              </button>
            </div>
          ) : (
            <p style={{ margin: '0', fontSize: '0.8rem', color: '#86efac', textAlign: 'center' }}>
              ⏳ En attente du facilitateur
            </p>
          )}
        </section>
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>Actions</h2>
          {isFacilitator ? (
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.reset')}>Reset labyrinthe</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.phase.next', { phase: 'colAtt' })}>Phase colAtt</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.move', { dir: 'N' })}>Move N</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.move', { dir: 'E' })}>Move E</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.move', { dir: 'S' })}>Move S</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.move', { dir: 'W' })}>Move W</button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => emitEvent('laby.col.vote', { dir: 'N' })}>Vote N</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'E' })}>Vote E</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'S' })}>Vote S</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('laby.col.vote', { dir: 'W' })}>Vote W</button>
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