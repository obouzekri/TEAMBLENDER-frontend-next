'use client';

import { useId, useState } from 'react';
import styles from './SessionBuilderHeader.module.css';
import useI18n from '@/lib/i18n/useI18n';
import { Clock3, Info, ListChecks, Save, Users } from 'lucide-react';

export default function SessionBuilderHeader({
  sessionName,
  participantCount,
  expectedParticipantCount,
  objectiveLabel,
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
  const id = useId();
  const [tooltipsDismissed, setTooltipsDismissed] = useState(false);
  const saveDescription =
    selectedCount === 0
      ? t('sessionBuilder.addAtLeastOneActivity')
      : isSavingDraft
        ? t('sessionBuilder.saving')
        : t('sessionBuilder.saveSessionSettings');
  const launchDescription = isLaunching
    ? t('sessionBuilder.launching')
    : isLaunchDisabled
      ? t('sessionBuilder.selectAtLeastOneActivity')
      : '';
  const minutes = Number.isFinite(Number(totalDuration)) ? Math.round(Number(totalDuration)) : 0;
  const resolvedSessionName =
    String(sessionName || '').trim() || t('sessionBuilder.untitledSession');

  return (
    <section className={styles.summaryBar} aria-label={t('sessionBuilder.sessionSummaryAria')}>
      <header className={styles.summaryContent}>
        <div className={styles.summaryTop}>
          <div className={styles.summaryLeft}>
            <h1 className={styles.summaryTitle}>{resolvedSessionName}</h1>
          </div>
          <div className={styles.summaryStats} aria-label={t('sessionBuilder.sessionSummaryAria')}>
            {expectedParticipantCount != null ? (
              <span className={styles.summaryStat}>
                {t('sessionBuilder.plannedCount', { count: expectedParticipantCount })}
              </span>
            ) : null}
            {objectiveLabel ? <span className={styles.summaryStat}>{objectiveLabel}</span> : null}
            <span className={styles.summaryStat}>
              <Users size={15} strokeWidth={2.2} aria-hidden="true" />
              <strong>{participantCount}</strong>
              <span>{t('sessionBuilder.assignedCount', { count: '' }).trim()}</span>
            </span>
            <span className={styles.summaryStat}>
              <ListChecks size={15} strokeWidth={2.2} aria-hidden="true" />
              <strong>{selectedCount}</strong>
              <span>
                {selectedCount === 1
                  ? t('sessionBuilder.activitySingular')
                  : t('sessionBuilder.activityPlural')}
              </span>
            </span>
            <span className={styles.summaryStat}>
              <Clock3 size={15} strokeWidth={2.2} aria-hidden="true" />
              <strong>~{minutes} min</strong>
            </span>
          </div>
        </div>

        {invitePanel ? <div className={styles.invitePanel}>{invitePanel}</div> : null}

        <div
          className={styles.actions}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setTooltipsDismissed(true);
          }}
        >
          <span
            className={styles.iconActionWrapper}
            onMouseEnter={() => setTooltipsDismissed(false)}
            onFocus={() => setTooltipsDismissed(false)}
          >
            <button
              type="button"
              className={`${styles.iconAction}`}
              onClick={onEditSessionInfo}
              aria-label={t('sessionBuilder.editSessionDetails')}
              aria-describedby={`${id}-info`}
            >
              <Info size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <span
              id={`${id}-info`}
              className={styles.actionTooltip}
              role="tooltip"
              hidden={tooltipsDismissed}
            >
              {t('sessionBuilder.editSessionDetails')}
            </span>
          </span>
          <span
            className={styles.iconActionWrapper}
            tabIndex={isSavingDraft || selectedCount === 0 ? 0 : undefined}
            aria-label={
              isSavingDraft || selectedCount === 0
                ? t('sessionBuilder.saveConfiguration')
                : undefined
            }
            aria-describedby={`${id}-save`}
            onMouseEnter={() => setTooltipsDismissed(false)}
            onFocus={() => setTooltipsDismissed(false)}
          >
            <button
              type="button"
              className={`${styles.iconAction}`}
              onClick={onSaveConfig}
              disabled={isSavingDraft || selectedCount === 0}
              aria-label={t('sessionBuilder.saveConfiguration')}
              aria-busy={isSavingDraft ? 'true' : 'false'}
              aria-describedby={`${id}-save`}
            >
              <Save size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <span
              id={`${id}-save`}
              className={styles.actionTooltip}
              role="tooltip"
              hidden={tooltipsDismissed}
            >
              {saveDescription}
            </span>
          </span>
          <button
            type="button"
            className={`btn-primary ${styles.actionBtn} ${styles.primaryAction}`}
            disabled={isLaunchDisabled || isLaunching}
            onClick={onLaunch}
            title={
              isLaunchDisabled
                ? t('sessionBuilder.selectAtLeastOneActivity')
                : t('sessionBuilder.launchSession')
            }
            aria-describedby={launchDescription ? `${id}-launch` : undefined}
            aria-busy={isLaunching}
          >
            {isLaunching ? t('sessionBuilder.launching') : t('sessionBuilder.launch')}
          </button>
        </div>
        {launchDescription ? (
          <p id={`${id}-launch`} className={styles.launchHint} role="status">
            {launchDescription}
          </p>
        ) : null}
      </header>
    </section>
  );
}
