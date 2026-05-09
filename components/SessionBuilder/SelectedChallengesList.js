'use client';

import styles from './SelectedChallengesList.module.css';

export default function SelectedChallengesList({
  challenges,
  onConfigure,
  onRemove,
  onMoveUp,
  onMoveDown,
  onClearAll,
}) {
  if (challenges.length === 0) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.title}>✓ Activités sélectionnées</h2>
          <span className={styles.count}>0</span>
        </div>
        <p className={styles.hint}>
          Les activités seront jouées dans cet ordre. Utilisez Monter/Descendre pour le modifier.
        </p>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyText}>Aucune activité sélectionnée</p>
          <p className={styles.emptyHint}>Explorez la grille à droite pour ajouter des activités</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>✓ Activités sélectionnées</h2>
        <span className={styles.count}>{challenges.length}</span>
      </div>
      <p className={styles.hint}>
        Les activités seront jouées dans cet ordre. Utilisez Monter/Descendre pour le modifier.
      </p>

      <ul className={styles.list}>
        {challenges.map((challenge, index) => (
          <li key={challenge.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <p className={styles.itemTitle}>{challenge.name}</p>
              <p className={styles.itemMeta}>{challenge.duration} min</p>
            </div>

            <div className={styles.itemActions}>
              {index > 0 && (
                <button
                  className={`${styles.actionBtn} ${styles.moveBtn}`}
                  onClick={() => onMoveUp(challenge.id)}
                  title="Monter"
                  aria-label="Monter cette activité"
                >
                  ▲
                </button>
              )}

              {index < challenges.length - 1 && (
                <button
                  className={`${styles.actionBtn} ${styles.moveBtn}`}
                  onClick={() => onMoveDown(challenge.id)}
                  title="Descendre"
                  aria-label="Descendre cette activité"
                >
                  ▼
                </button>
              )}

              <button
                className={`${styles.actionBtn} ${styles.configBtn}`}
                onClick={() => onConfigure(challenge.id)}
                title="Configurer"
                aria-label="Configurer cette activité"
              >
                ⚙
              </button>

              <button
                className={`${styles.actionBtn} ${styles.removeBtn}`}
                onClick={() => onRemove(challenge.id)}
                title="Supprimer"
                aria-label="Supprimer cette activité"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <button className="btn-secondary btn-sm btn-block" onClick={onClearAll}>
          Effacer la sélection
        </button>
      </div>
    </aside>
  );
}
