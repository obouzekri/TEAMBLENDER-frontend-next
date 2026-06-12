'use client';

import styles from './SessionBuilderHeader.module.css';

export default function SessionBuilderHeader({
  sessionName,
  participantCount,
  selectedCount,
  totalDuration,
  isSavingDraft,
  onEditSessionInfo,
  onSaveConfig,
  isLaunchDisabled,
  isLaunching,
  onLaunch,
}) {
  const minutes = Number.isFinite(Number(totalDuration)) ? Math.round(Number(totalDuration)) : 0;
  const resolvedSessionName = String(sessionName || '').trim() || 'Untitled session';

  return (
    <section className={styles.summaryBar} aria-label="Session summary">
      <header className={styles.summaryContent}>
        <div className={styles.summaryLeft}>
          <p className={styles.summaryEyebrow}>Session builder</p>
          <h1 className={styles.summaryTitle}>Add and configure activities for your session</h1>
          <p className={styles.summaryMeta}>
            <span className={styles.summaryName}>{resolvedSessionName}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{selectedCount} activit{selectedCount !== 1 ? 'ies' : 'y'}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{minutes} min</span>
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={onEditSessionInfo}
          >
            Edit session details
          </button>
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={onSaveConfig}
            disabled={isSavingDraft || selectedCount === 0}
            title={selectedCount === 0 ? 'Add at least one activity.' : 'Save session settings'}
          >
            {isSavingDraft ? 'Saving...' : 'Save configuration'}
          </button>
          <button
            type="button"
            className={`btn-primary ${styles.actionBtn} ${styles.primaryAction}`}
            disabled={isLaunchDisabled || isLaunching}
            onClick={onLaunch}
            title={isLaunchDisabled ? 'Select at least one activity' : 'Launch session'}
          >
            {isLaunching ? 'Launching...' : 'Launch'}
          </button>
        </div>
      </header>
    </section>
  );
}
