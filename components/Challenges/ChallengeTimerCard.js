'use client';

import React, { useMemo } from 'react';
import styles from './ChallengeTimerCard.module.css';

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function normalizeStatus(status) {
  const normalized = String(status || 'idle').trim().toLowerCase();
  if (normalized === 'running') return 'running';
  if (normalized === 'paused') return 'paused';
  return 'idle';
}

function statusLabel(status) {
  if (status === 'running') return 'En cours';
  if (status === 'paused') return 'Pause';
  return 'Attente';
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function ChallengeTimerCard({
  className = '',
  title = 'Chronometre',
  remainingSeconds = 0,
  durationSeconds = 0,
  status = 'idle',
  progressPercent,
  isFacilitator = false,
  ringAction = null,
  actions = null,
  footer = null,
  waitingText = '⏳ En attente du facilitateur',
}) {
  const normalizedStatus = normalizeStatus(status);

  const computedProgress = useMemo(() => {
    if (progressPercent != null) {
      return clampPercent(progressPercent);
    }
    if ((normalizedStatus === 'running' || normalizedStatus === 'paused') && Number(durationSeconds) > 0) {
      return clampPercent((Number(remainingSeconds) / Number(durationSeconds)) * 100);
    }
    return normalizedStatus === 'running' ? 100 : 0;
  }, [durationSeconds, normalizedStatus, progressPercent, remainingSeconds]);

  const tone = useMemo(() => {
    if (normalizedStatus !== 'running') return 'idle';
    if (computedProgress <= 20) return 'danger';
    if (computedProgress <= 55) return 'warn';
    return 'safe';
  }, [computedProgress, normalizedStatus]);

  const ringClassName = `${styles.timerRing} ${
    tone === 'safe'
      ? styles.timerRingSafe
      : tone === 'warn'
        ? styles.timerRingWarn
        : tone === 'danger'
          ? styles.timerRingDanger
          : styles.timerRingIdle
  }`;

  const ringColor = tone === 'danger' ? '#ef4444' : tone === 'warn' ? '#f59e0b' : tone === 'safe' ? '#22c55e' : '#38bdf8';
  const ringSweep = clampPercent(computedProgress);

  return (
    <section className={`${styles.timerCard} ${className}`.trim()}>
      <h3 className={styles.timerTitle}>{title}</h3>

      <div className={styles.timerRingContainer}>
        <div
          className={ringClassName}
          style={{
            background: `conic-gradient(${ringColor} ${Math.round((ringSweep / 100) * 360)}deg, rgba(148, 163, 184, 0.18) ${Math.round((ringSweep / 100) * 360)}deg)`
          }}
        >
          <div className={styles.timerDisplay}>
            <div className={styles.timerTime}>{formatTimer(remainingSeconds)}</div>
            <div className={styles.timerState}>{statusLabel(normalizedStatus)}</div>
          </div>

          {ringAction ? (
            <div className={styles.timerRingActions}>
              {ringAction}
            </div>
          ) : null}
        </div>
      </div>

      {!isFacilitator && waitingText ? <p className={styles.timerWaitingText}>{waitingText}</p> : null}
      {footer ? <div className={styles.timerFooter}>{footer}</div> : null}
      {actions ? <div className={styles.timerActions}>{actions}</div> : null}
    </section>
  );
}
