'use client';

import React, { useEffect, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import styles from './ChallengeRulesPanel.module.css';

export default function ChallengeRulesPanel({
  isStarted,
  isFacilitator = true,
  challengeName,
  briefTitle,
  objective,
  participantsMeta = null,
  facilitatorRules = [],
  participantRules = [],
  footnote = '',
  extraContent = null,
  showPrestartCard = true,
  startLabel,
  onStart = null,
  startDisabled = false,
  compactStartButton = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, t } = useI18n();
  const isEn = locale === 'en';

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isStarted) {
      setIsOpen(false);
    }
  }, [isStarted]);

  useEffect(() => {
    if (!isOpen) return () => {};

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const canStartFromRules = !isStarted && isFacilitator && typeof onStart === 'function';
  const resolvedBriefTitle = briefTitle || t('challengeRulesPanel.briefTitle');
  const resolvedStartLabel = startLabel || t('challengeRulesPanel.startChallenge');
  const facilitatorLabel = t('challengeRulesPanel.facilitator');
  const participantLabel = t('challengeRulesPanel.participants');
  const participantTags = [
    { key: 'min', label: t('challengeRulesPanel.min'), value: participantsMeta?.min || '', highlighted: false },
    { key: 'recommended', label: t('challengeRulesPanel.recommended'), value: participantsMeta?.recommended || '', highlighted: true },
    { key: 'max', label: t('challengeRulesPanel.max'), value: participantsMeta?.max || '', highlighted: false },
  ].filter((entry) => String(entry.value || '').trim());

  const cardContent = (
    <>
      <header className={styles.rulesHeader}>
        <p className={styles.rulesKicker}>📜 {t('challengeRulesPanel.kicker')}</p>
        <div className={styles.titleRow}>
          <h2 className="challenge-section-title">{challengeName}</h2>
          {participantTags.length > 0 ? (
            <div className={styles.tagsRow}>
              {participantTags.map((item) => (
                <span
                  key={`tag-${item.key}`}
                  className={`${styles.playerTag}${item.highlighted ? ` ${styles.playerTagRecommended}` : ''}`}
                >
                  {item.highlighted ? '⭐ ' : ''}{item.label} {item.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <h3 className={styles.rulesBriefTitle}>{resolvedBriefTitle}</h3>
        <p className="challenge-text">{objective}</p>
      </header>

      {isFacilitator ? (
        <section className={styles.rulesSection}>
          <h3 className="challenge-section-title">🎯 {facilitatorLabel}</h3>
          <ul>
            {facilitatorRules.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${styles.rulesSection} ${styles.rulesSectionParticipant}`}>
        <h3 className="challenge-section-title">🧭 {participantLabel}</h3>
        <ul>
          {participantRules.map((rule) => (
            <li key={`participant-${rule}`}>{rule}</li>
          ))}
        </ul>
      </section>

      {footnote ? <p className={`${styles.rulesFootnote} challenge-text`}>{footnote}</p> : null}

      {extraContent}

      {canStartFromRules ? (
        <div className={styles.rulesActions}>
          <button
            type="button"
            className={`${styles.startButton}${compactStartButton ? ` ${styles.startButtonCompact}` : ''}`}
            onClick={onStart}
            disabled={startDisabled}
          >
            {resolvedStartLabel}
          </button>
        </div>
      ) : null}
    </>
  );

  if (!isStarted && showPrestartCard) {
    return <section className={styles.rulesCard}>{cardContent}</section>;
  }

  if (!isStarted && !showPrestartCard) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={styles.rulesButton}
        onClick={() => setIsOpen(true)}
      >
        📜 {t('challengeRulesPanel.showRules')}
      </button>

      {isOpen ? (
        <div className={styles.modalBackdrop} onClick={() => setIsOpen(false)} role="presentation">
          <section
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="challenge-rules-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHead}>
              <h2 id="challenge-rules-modal-title">{t('challengeRulesPanel.modalTitle', { challengeName })}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label={t('challengeRulesPanel.closeRules')}>
                {t('challengeRulesPanel.closeRules')}
              </button>
            </header>
            {cardContent}
          </section>
        </div>
      ) : null}
    </>
  );
}
