'use client';

import { useId, useState } from 'react';
import { Check, Info, Save } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import styles from './SessionPreparation.module.css';

export default function SessionPreparation({
  selectedCount = 0,
  sessionAvailable = false,
  busy = false,
  isSavingDraft = false,
  isLaunching = false,
  isLaunchDisabled = false,
  onEditSessionInfo,
  onSaveConfig,
  onLaunch,
}) {
  const { t } = useI18n();
  const headingId = useId();
  const [tooltipsDismissed, setTooltipsDismissed] = useState(false);
  const hasSelection = Number.isInteger(selectedCount) && selectedCount > 0;
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
  const stages = [
    {
      label: t('sessionPreparation.stageCompose'),
      status: hasSelection ? 'done' : 'active',
      statusLabel: t(
        hasSelection ? 'sessionPreparation.statusDone' : 'sessionPreparation.statusActive'
      ),
      detail: hasSelection
        ? t('sessionPreparation.activitiesSelected', { count: selectedCount })
        : t('sessionPreparation.chooseActivity'),
    },
    {
      label: t('sessionPreparation.stageConfigure'),
      status: hasSelection ? 'optional' : 'waiting',
      statusLabel: t('sessionBuilder.optionalLabel'),
      detail: t('sessionPreparation.configureHint'),
    },
    {
      label: t('sessionPreparation.stageLaunch'),
      status: hasSelection && sessionAvailable ? 'ready' : 'waiting',
      statusLabel: t(
        hasSelection && sessionAvailable
          ? 'sessionPreparation.statusReady'
          : 'sessionPreparation.statusWaiting'
      ),
      detail: !sessionAvailable
        ? t('sessionPreparation.sessionMissing')
        : hasSelection
          ? t('sessionPreparation.launchHint')
          : t('sessionPreparation.launchLocked'),
    },
  ];

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId}>{t('sessionPreparation.title')}</h2>
        <p className={styles.intro}>{t('sessionPreparation.intro')}</p>
      </header>
      {busy ? (
        <p className={styles.busy} role="status">
          {t('sessionPreparation.busy')}
        </p>
      ) : null}
      <ol className={styles.stages} aria-label={t('sessionPreparation.progressLabel')}>
        {stages.map((stage, index) => (
          <li
            key={stage.label}
            className={styles.stage}
            data-stage-status={stage.status}
            aria-current={stage.status === 'active' ? 'step' : undefined}
          >
            <div className={styles.stageHeading}>
              <span className={styles.stepNumber} aria-hidden="true">
                {stage.status === 'done' ? <Check size={13} strokeWidth={3} /> : index + 1}
              </span>
              <h3>{stage.label}</h3>
              <span className={styles.status}>{stage.statusLabel}</span>
            </div>
            <p className={styles.detail}>{stage.detail}</p>
          </li>
        ))}
      </ol>
      <div
        className={styles.actions}
        role="group"
        aria-label={t('sessionBuilder.sessionActions')}
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
            className={styles.iconAction}
            onClick={onEditSessionInfo}
            aria-label={t('sessionBuilder.editSessionDetails')}
            aria-describedby={`${headingId}-info`}
          >
            <Info size={17} strokeWidth={2} aria-hidden="true" />
          </button>
          <span
            id={`${headingId}-info`}
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
          aria-describedby={`${headingId}-save`}
          onMouseEnter={() => setTooltipsDismissed(false)}
          onFocus={() => setTooltipsDismissed(false)}
        >
          <button
            type="button"
            className={styles.iconAction}
            onClick={onSaveConfig}
            disabled={isSavingDraft || selectedCount === 0}
            aria-label={t('sessionBuilder.saveConfiguration')}
            aria-busy={isSavingDraft ? 'true' : 'false'}
            aria-describedby={`${headingId}-save`}
          >
            <Save size={17} strokeWidth={2} aria-hidden="true" />
          </button>
          <span
            id={`${headingId}-save`}
            className={styles.actionTooltip}
            role="tooltip"
            hidden={tooltipsDismissed}
          >
            {saveDescription}
          </span>
        </span>
        <Button
          className={styles.primaryAction}
          disabled={isLaunchDisabled || isLaunching}
          onClick={onLaunch}
          aria-describedby={launchDescription ? `${headingId}-launch` : undefined}
          aria-busy={isLaunching}
        >
          {isLaunching ? t('sessionBuilder.launching') : t('sessionBuilder.launch')}
        </Button>
      </div>
      {launchDescription ? (
        <p id={`${headingId}-launch`} className={styles.launchHint} role="status">
          {launchDescription}
        </p>
      ) : null}
    </section>
  );
}
