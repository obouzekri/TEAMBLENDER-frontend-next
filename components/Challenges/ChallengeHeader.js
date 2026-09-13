'use client';

import { createPortal } from 'react-dom';
import { useChallengeHeaderPortalNode } from '@/lib/challengeHeaderPortal';
import styles from './ChallengeHeader.module.css';

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export default function ChallengeHeader({
  title,
  className = '',
  headerAction = null,
  timer = null,
}) {
  const portalNode = useChallengeHeaderPortalNode();
  const normalizedTitle = String(title || '').trim();
  const hasTimer = timer && typeof timer === 'object';
  const timerContent = hasTimer ? (
    <div className={styles.timer} role="status" aria-live="polite">
      <span aria-hidden="true">⏱</span>
      <time>{formatTimer(timer.remainingSeconds)}</time>
    </div>
  ) : null;
  const actionContent = timerContent || headerAction ? (
    <div className={styles.action}>
      {timerContent}
      {headerAction}
    </div>
  ) : null;

  // Embedded mode: render as a sub-section of the unified SessionLiveHeader card.
  if (portalNode) {
    return createPortal(
      <div className={styles.embedded}>
        <div className={styles.copy}>
          <h2 className={styles.title}>{normalizedTitle}</h2>
        </div>
        {actionContent}
      </div>,
      portalNode
    );
  }

  return (
    <header className={['challenge-header', className].filter(Boolean).join(' ')}>
      <div className="challenge-header-line">
        <div className="challenge-header-copy">
          <h1 className="challenge-title">{normalizedTitle}</h1>
        </div>
        {actionContent}
      </div>
    </header>
  );
}