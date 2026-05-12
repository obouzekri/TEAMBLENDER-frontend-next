'use client';

import styles from './SessionBuilderHeader.module.css';

export default function SessionBuilderHeader({
  selectedCount,
  totalDuration,
  isLaunchDisabled,
  isLaunching,
  onLaunch,
}) {
  const minutes = Number.isFinite(Number(totalDuration)) ? Math.round(Number(totalDuration)) : 0;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Construire votre session</h1>
          <p className={styles.subtitle}>
            Sélectionnez et configurez les activités pour votre session d'équipe
          </p>
        </div>

        <div className={styles.statusSection}>
          <div className={styles.statusBadges}>
            <span className={styles.badge}>
              {selectedCount} activité{selectedCount !== 1 ? 's' : ''}
            </span>
            <span className={styles.separator}>•</span>
            <span className={styles.badge}>~{minutes} min</span>
          </div>

          <button
            className={`btn-primary ${styles.launchBtn}`}
            disabled={isLaunchDisabled || isLaunching}
            onClick={onLaunch}
            title={isLaunchDisabled ? 'Sélectionnez au moins une activité' : 'Lancer la session'}
          >
            {isLaunching ? 'Enregistrement...' : '▶ Lancer la session'}
          </button>
        </div>
      </div>
    </header>
  );
}
