'use client';

import { createPortal } from 'react-dom';
import { useChallengeHeaderPortalNode } from '@/lib/challengeHeaderPortal';
import styles from './ChallengeHeader.module.css';

export default function ChallengeHeader({
  title,
  className = '',
  headerAction = null,
}) {
  const portalNode = useChallengeHeaderPortalNode();
  const normalizedTitle = String(title || '').trim();

  // Embedded mode: render as a sub-section of the unified SessionLiveHeader card.
  if (portalNode) {
    return createPortal(
      <div className={styles.embedded}>
        <div className={styles.copy}>
          <h2 className={styles.title}>{normalizedTitle}</h2>
        </div>
        {headerAction ? <div className={styles.action}>{headerAction}</div> : null}
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
        {headerAction ? <div className="challenge-header-action">{headerAction}</div> : null}
      </div>
    </header>
  );
}