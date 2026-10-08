'use client';

import React, { useContext, useMemo, useState } from 'react';
import { ChallengeConnectionContext } from '@/lib/challenges/connection-context';
import styles from './ChallengeTimerCard.module.css';
import useI18n from '@/lib/i18n/useI18n';

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

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function ChallengeTimerCard({
  className = '',
  title,
  remainingSeconds = 0,
  durationSeconds = 0,
  status = 'idle',
  progressPercent,
  isFacilitator = false,
  actions = null,
  onPause = null,
  onResume = null,
  controlPending = false,
  controlFeedback = null,
  footer = null,
  waitingText,
  collapsible = true,
  defaultCollapsed = false,
  showCompactBar = true,
}) {
  const { t } = useI18n();
  const connected = useContext(ChallengeConnectionContext);
  const resolvedTitle = title ?? t('challengeTimer.title');
  const resolvedWaitingText = waitingText ?? t('challengeTimer.waiting');
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));
  const normalizedStatus = normalizeStatus(status);
  const shouldShowWaitingText = !isFacilitator
    && Boolean(resolvedWaitingText)
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
  const isStartedState = ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(normalizedStatus);

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
  const compactTime = formatTimer(remainingSeconds);
  const compactStatus = t(`challengeTimer.${normalizedStatus}`);
  const automaticControl = isFacilitator && normalizedStatus === 'running' && typeof onPause === 'function'
    ? (
        <button
          type="button"
          className={styles.timerControlButton}
          onClick={onPause}
          disabled={controlPending || !connected}
        >
          <span aria-hidden="true">Ⅱ</span>
          {controlPending ? t('challengeTimer.actionPending') : t('challengeTimer.pause')}
        </button>
      )
    : isFacilitator && normalizedStatus === 'paused' && typeof onResume === 'function'
      ? (
          <button
            type="button"
            className={`${styles.timerControlButton} ${styles.timerResumeButton}`}
            onClick={onResume}
            disabled={controlPending || !connected}
          >
            <span aria-hidden="true">▶</span>
            {controlPending ? t('challengeTimer.actionPending') : t('challengeTimer.resume')}
          </button>
        )
      : null;
  const resolvedActions = actions || automaticControl;
  const feedbackMessage = controlFeedback?.status === 'failed' ? controlFeedback.message : '';

  return (
    <section className={`${styles.timerCard}${isStartedState ? ` ${styles.timerCardStarted}` : ''} ${className}`.trim()}>
      {showCompactBar ? (
        <div className={styles.timerCompactBar}>
          <span className={styles.timerCompactIcon} aria-hidden="true">⏱</span>
          <span className={styles.timerCompactTime} role="timer" aria-live="off" aria-label={resolvedTitle}>{compactTime}</span>
          <span className={styles.timerCompactState}>{compactStatus}</span>
        </div>
      ) : null}
      <span className={styles.statusAnnouncement} role="status" aria-live="polite" aria-atomic="true">{resolvedTitle}: {compactStatus}</span>

      <div className={styles.timerHeader}>
        <h3 className={`${styles.timerTitle} challenge-section-title`}>{resolvedTitle}</h3>
        {collapsible ? (
          <button
            type="button"
            className={styles.timerToggleBtn}
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('challengeTimer.expand') : t('challengeTimer.collapse')}
            title={collapsed ? t('challengeTimer.expand') : t('challengeTimer.collapse')}
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
                <div className={styles.timerTime} role="timer" aria-label={resolvedTitle} aria-live="off">{formatTimer(remainingSeconds)}</div>
              </div>
            </div>
          </div>

          {shouldShowWaitingText ? <p className={styles.timerWaitingText}>{resolvedWaitingText}</p> : null}
          {footer ? <div className={styles.timerFooter}>{footer}</div> : null}
          {resolvedActions ? <fieldset disabled={!connected} className={styles.timerActions}>{resolvedActions}</fieldset> : null}
          {feedbackMessage ? <p className={styles.timerControlError} role="alert">{feedbackMessage}</p> : null}
        </>
      )}
    </section>
  );
}
