'use client';

import React, { useMemo, useState } from 'react';
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
  if (normalized === 'completed') return 'completed';
  if (normalized === 'stopped') return 'stopped';
  if (normalized === 'timeout') return 'timeout';
  if (normalized === 'disabled') return 'disabled';
  return 'idle';
}

function statusLabel(status) {
  if (status === 'running') return 'En cours';
  if (status === 'paused') return 'Pause';
  if (status === 'completed') return 'Termine';
  if (status === 'stopped') return 'Arrete';
  if (status === 'timeout') return 'Temps ecoule';
  if (status === 'disabled') return 'Desactive';
  return 'Attente';
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function ChallengeTimerCard({
  className = '',
  title = 'Chrono',
  remainingSeconds = 0,
  durationSeconds = 0,
  status = 'idle',
  progressPercent,
  isFacilitator = false,
  ringAction = null,
  actions = null,
  footer = null,
  waitingText = '⏳ En attente du facilitateur',
  collapsible = true,
  defaultCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));
  const normalizedStatus = normalizeStatus(status);
  const shouldShowWaitingText = !isFacilitator
    && Boolean(waitingText)
    && (normalizedStatus === 'idle' || normalizedStatus === 'disabled');

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
  const normalizedRingAction = React.isValidElement(ringAction)
    ? React.cloneElement(ringAction, {
      className: [styles.timerIconBtn, ringAction.props?.className || ''].filter(Boolean).join(' ')
    })
    : ringAction;

  return (
    <section className={`${styles.timerCard} ${className}`.trim()}>
      <div className={styles.timerHeader}>
        <h3 className={styles.timerTitle}>{title}</h3>
        {collapsible ? (
          <button
            type="button"
            className={styles.timerToggleBtn}
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Afficher le chrono' : 'Réduire le chrono'}
            title={collapsed ? 'Afficher' : 'Réduire'}
          >
            {collapsed ? '▾' : '▴'}
          </button>
        ) : null}
      </div>

      {collapsed ? null : (
        <>
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

                {ringAction ? (
                  <div className={styles.timerRingActions}>
                    {normalizedRingAction}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {shouldShowWaitingText ? <p className={styles.timerWaitingText}>{waitingText}</p> : null}
          {footer ? <div className={styles.timerFooter}>{footer}</div> : null}
          {actions ? <div className={styles.timerActions}>{actions}</div> : null}
        </>
      )}
    </section>
  );
}
