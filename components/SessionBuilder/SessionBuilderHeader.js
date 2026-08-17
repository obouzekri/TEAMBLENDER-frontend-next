'use client';

import styles from './SessionBuilderHeader.module.css';
import useI18n from '@/lib/i18n/useI18n';
import { Clock3, ListChecks, Settings, Users } from 'lucide-react';

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
          <div className={styles.summaryTitleRow}>
            <h1 className={styles.summaryTitle}>{resolvedSessionName}</h1>
            <span className={styles.statusBadge}>{t('sessionBuilder.statusDraft')}</span>
          </div>
          <div className={styles.summaryStats} aria-label={t('sessionBuilder.sessionSummaryAria')}>
            <span className={styles.summaryStat}>
              <Users size={15} strokeWidth={2.2} aria-hidden="true" />
              <strong>{participantCount}</strong>
              <span>{t('sessionBuilder.headerParticipants', { count: '' }).replace(/^\s*/, '')}</span>
            </span>
            <span className={styles.summaryStat}>
              <ListChecks size={15} strokeWidth={2.2} aria-hidden="true" />
              <strong>{selectedCount}</strong>
              <span>{selectedCount === 1 ? t('sessionBuilder.activitySingular') : t('sessionBuilder.activityPlural')}</span>
            </span>
            <span className={styles.summaryStat}>
              <Clock3 size={15} strokeWidth={2.2} aria-hidden="true" />
              <strong>{minutes}</strong>
              <span>min</span>
            </span>
          </div>
        </div>

        <div className={styles.invitePanel}>
          {invitePanel ? (
            invitePanel
          ) : null}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.detailsAction}`}
            onClick={onEditSessionInfo}
          >
            <Settings size={14} strokeWidth={2} aria-hidden="true" /> {t('sessionBuilder.editSessionDetails')}
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
