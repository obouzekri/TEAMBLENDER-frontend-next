'use client';

import styles from './SessionBuilderHeader.module.css';
import useI18n from '@/lib/i18n/useI18n';

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
  invitePanel,
}) {
  const { t } = useI18n();
  const minutes = Number.isFinite(Number(totalDuration)) ? Math.round(Number(totalDuration)) : 0;
  const resolvedSessionName = String(sessionName || '').trim() || t('sessionBuilder.untitledSession');

  return (
    <section className={styles.summaryBar} aria-label={t('sessionBuilder.sessionSummaryAria')}>
      <header className={styles.summaryContent}>
        <div className={styles.summaryLeft}>
          <p className={styles.summaryEyebrow}>{t('sessionBuilder.headerEyebrow')}</p>
          <h1 className={styles.summaryTitle}>{t('sessionBuilder.headerTitle')}</h1>
          <p className={styles.summaryMeta}>
            <span className={styles.summaryName}>{resolvedSessionName}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{t('sessionBuilder.headerParticipants', { count: participantCount })}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{selectedCount} {selectedCount === 1 ? t('sessionBuilder.activitySingular') : t('sessionBuilder.activityPlural')}</span>
            <span aria-hidden="true" className={styles.dot}>•</span>
            <span>{minutes} min</span>
          </p>
        </div>

        <div className={styles.actions}>
          {invitePanel ? (
            <div className={styles.invitePanel}>
              {invitePanel}
            </div>
          ) : null}
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={onEditSessionInfo}
          >
            {t('sessionBuilder.editSessionDetails')}
          </button>
          <button
            type="button"
            className={`btn-secondary ${styles.actionBtn}`}
            onClick={onSaveConfig}
            disabled={isSavingDraft || selectedCount === 0}
            title={selectedCount === 0 ? t('sessionBuilder.addAtLeastOneActivity') : t('sessionBuilder.saveSessionSettings')}
          >
            {isSavingDraft ? t('sessionBuilder.saving') : t('sessionBuilder.saveConfiguration')}
          </button>
          <button
            type="button"
            className={`btn-primary ${styles.actionBtn} ${styles.primaryAction}`}
            disabled={isLaunchDisabled || isLaunching}
            onClick={onLaunch}
            title={isLaunchDisabled ? t('sessionBuilder.selectAtLeastOneActivity') : t('sessionBuilder.launchSession')}
          >
            {isLaunching ? t('sessionBuilder.launching') : t('sessionBuilder.launch')}
          </button>
        </div>
      </header>
    </section>
  );
}
