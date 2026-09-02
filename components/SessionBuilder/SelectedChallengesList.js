'use client';

import styles from './SelectedChallengesList.module.css';
import { Button, EmptyState } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';

export default function SelectedChallengesList({
  challenges,
  onConfigure,
  onRemove,
  onMoveUp,
  onMoveDown,
  onClearAll,
}) {
  const { t, locale } = useI18n();

  function localizePlainValue(value) {
    if (value == null) return '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      const preferredLocale = locale === 'en' ? 'en' : 'fr';
      return String(value[preferredLocale] || value.fr || value.en || '').trim();
    }
    return String(value || '').trim();
  }

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
          <h2 className={styles.title}>✓ {t('sessionBuilder.selectedActivitiesTitle')}</h2>
          <span className={styles.count}>0</span>
        </div>
        <p className={styles.hint}>
          {t('sessionBuilder.selectedActivitiesHint')}
        </p>
        <EmptyState
          icon="📋"
          title={t('sessionBuilder.selectedActivitiesEmptyTitle')}
          description={t('sessionBuilder.selectedActivitiesEmptyDescription')}
          actions={<Button variant="secondary" size="sm" onClick={handleBrowseCatalog}>{t('sessionBuilder.selectedActivitiesBrowse')}</Button>}
          className={styles.emptyState}
        />
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>✓ {t('sessionBuilder.selectedActivitiesTitle')}</h2>
        <span className={styles.count}>{challenges.length}</span>
      </div>
      <p className={styles.hint}>
        {t('sessionBuilder.selectedActivitiesHint')}
      </p>

      <ul className={styles.list}>
        {challenges.map((challenge, index) => (
          <li key={challenge.id} className={styles.item}>
            <div className={styles.itemInfo}>
              <p className={styles.itemTitle}>{localizePlainValue(challenge.name) || t('sessionBuilder.activitySingular')}</p>
            </div>

            <div className={styles.itemActions}>
              {index > 0 && (
                <button
                  className={`${styles.actionBtn} ${styles.moveBtn}`}
                  onClick={() => onMoveUp(challenge.id)}
                  title={t('sessionBuilder.moveUp')}
                  aria-label={t('sessionBuilder.moveUpAria')}
                >
                  ▲
                </button>
              )}

              {index < challenges.length - 1 && (
                <button
                  className={`${styles.actionBtn} ${styles.moveBtn}`}
                  onClick={() => onMoveDown(challenge.id)}
                  title={t('sessionBuilder.moveDown')}
                  aria-label={t('sessionBuilder.moveDownAria')}
                >
                  ▼
                </button>
              )}

              <button
                className={`${styles.actionBtn} ${styles.configBtn}`}
                onClick={() => onConfigure(challenge.id)}
                title={t('sessionBuilder.catalogConfigureAction')}
                aria-label={t('sessionBuilder.configureActivityAria')}
              >
                ⚙
              </button>

              <button
                className={`${styles.actionBtn} ${styles.removeBtn}`}
                onClick={() => onRemove(challenge.id)}
                title={t('sessionBuilder.catalogRemoveAction')}
                aria-label={t('sessionBuilder.removeActivityAria')}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <Button className={styles.clearSelectionButton} variant="secondary" size="sm" block onClick={onClearAll}>
          {t('sessionBuilder.clearSelection')}
        </Button>
      </div>
    </aside>
  );
}
