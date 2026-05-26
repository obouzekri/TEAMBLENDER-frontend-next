'use client';

import styles from './SessionBuilderHeader.module.css';

export default function SessionBuilderHeader({
  sessionName,
  participantCount,
  selectedCount,
  totalDuration,
  hasUnsavedChanges,
  isSavingDraft,
  onEditSessionInfo,
  onSaveConfig,
  isLaunchDisabled,
  isLaunching,
  onLaunch,
}) {
  const minutes = Number.isFinite(Number(totalDuration)) ? Math.round(Number(totalDuration)) : 0;
  const resolvedSessionName = String(sessionName || '').trim() || 'Session sans nom';

  return (
    <section className={styles.summaryBar} aria-label="Résumé de la session">
      <header className={styles.summaryContent}>
        <div className={styles.summaryLeft}>
          <h1 className={styles.summaryTitle}>Ajoutez et configurez les activités pour votre session</h1>
          <p className={styles.summaryMeta}>
            <span className={styles.summaryName}>{resolvedSessionName}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{selectedCount} activité{selectedCount !== 1 ? 's' : ''}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{minutes} min</span>
          </p>
          <p className={styles.saveState} role="status" aria-live="polite">
            {hasUnsavedChanges
              ? '● Modifications non enregistrées'
              : '✅ Configuration enregistrée'}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={onEditSessionInfo}
          >
            ⚙ Modifier les informations de la session
          </button>
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={onSaveConfig}
            disabled={isSavingDraft || selectedCount === 0}
            title={selectedCount === 0 ? 'Ajoutez au moins une activité.' : 'Enregistrer les paramètres de session'}
          >
            {isSavingDraft ? '💾 Enregistrement...' : '💾 Enregistrer la configuration'}
          </button>
          <button
            type="button"
            className={`btn-primary ${styles.actionBtn} ${styles.primaryAction}`}
            disabled={isLaunchDisabled || isLaunching}
            onClick={onLaunch}
            title={isLaunchDisabled ? 'Sélectionnez au moins une activité' : 'Lancer la session'}
          >
            {isLaunching ? '▶ Lancement...' : '▶ Lancer'}
          </button>
        </div>
      </header>
    </section>
  );
}
