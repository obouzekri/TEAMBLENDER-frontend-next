'use client';

import { useId } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import styles from './SessionPreparation.module.css';

export default function SessionPreparation({
  selectedCount = 0,
  sessionAvailable = false,
  busy = false,
}) {
  const { t } = useI18n();
  const headingId = useId();
  const hasSelection = Number.isInteger(selectedCount) && selectedCount > 0;
  const stages = [
    {
      label: t('sessionPreparation.stageCompose'),
      status: hasSelection ? 'done' : 'active',
      statusLabel: t(
        hasSelection ? 'sessionPreparation.statusDone' : 'sessionPreparation.statusActive'
      ),
      detail: hasSelection
        ? selectedCount === 1
          ? t('sessionPreparation.activitySelected', { count: selectedCount })
          : t('sessionPreparation.activitiesSelected', { count: selectedCount })
        : t('sessionPreparation.chooseActivity'),
    },
    {
      label: t('sessionPreparation.stageConfigure'),
      status: hasSelection ? 'active' : 'waiting',
      statusLabel: t(
        hasSelection ? 'sessionPreparation.statusActive' : 'sessionPreparation.statusWaiting'
      ),
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
          : t('sessionPreparation.chooseActivity'),
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
                {index + 1}
              </span>
              <h3>{stage.label}</h3>
              <span className={styles.status}>{stage.statusLabel}</span>
            </div>
            <p className={styles.detail}>{stage.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
