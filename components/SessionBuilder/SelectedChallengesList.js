'use client';

import styles from './SelectedChallengesList.module.css';
import { Button, EmptyState } from '@/components/ui';

export default function SelectedChallengesList({
  challenges,
  onConfigure,
  onRemove,
  onMoveUp,
  onMoveDown,
  onClearAll,
}) {
  if (challenges.length === 0) {
    function handleBrowseCatalog() {
      const catalog = document.querySelector('[data-catalog]');
      if (catalog) {
        catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.title}>✓ Selected activities</h2>
          <span className={styles.count}>0</span>
        </div>
        <p className={styles.hint}>
          Activities will run in this order. Use Move up/Move down to adjust it.
        </p>
        <EmptyState
          icon="📋"
          title="No activity selected"
          description="Browse the catalog on the right to add activities."
          actions={<Button variant="secondary" size="sm" onClick={handleBrowseCatalog}>Browse catalog</Button>}
          className={styles.emptyState}
        />
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>✓ Selected activities</h2>
        <span className={styles.count}>{challenges.length}</span>
      </div>
      <p className={styles.hint}>
        Activities will run in this order. Use Move up/Move down to adjust it.
      </p>

      <ul className={styles.list}>
        {challenges.map((challenge, index) => (
          <li key={challenge.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <p className={styles.itemTitle}>{challenge.name}</p>
            </div>

            <div className={styles.itemActions}>
              {index > 0 && (
                <button
                  className={`${styles.actionBtn} ${styles.moveBtn}`}
                  onClick={() => onMoveUp(challenge.id)}
                  title="Move up"
                  aria-label="Move this activity up"
                >
                  ▲
                </button>
              )}

              {index < challenges.length - 1 && (
                <button
                  className={`${styles.actionBtn} ${styles.moveBtn}`}
                  onClick={() => onMoveDown(challenge.id)}
                  title="Move down"
                  aria-label="Move this activity down"
                >
                  ▼
                </button>
              )}

              <button
                className={`${styles.actionBtn} ${styles.configBtn}`}
                onClick={() => onConfigure(challenge.id)}
                title="Configure"
                aria-label="Configure this activity"
              >
                ⚙
              </button>

              <button
                className={`${styles.actionBtn} ${styles.removeBtn}`}
                onClick={() => onRemove(challenge.id)}
                title="Remove"
                aria-label="Remove this activity"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <Button variant="secondary" size="sm" block onClick={onClearAll}>
          Clear selection
        </Button>
      </div>
    </aside>
  );
}
