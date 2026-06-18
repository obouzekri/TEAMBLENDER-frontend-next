'use client';

import React, { useEffect, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import styles from './ChallengeRulesPanel.module.css';

export default function ChallengeRulesPanel({
  isStarted,
  isFacilitator = true,
  challengeName,
  briefTitle,
  objective,
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
  const { locale } = useI18n();
  const isEn = locale === 'en';

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
  const resolvedBriefTitle = briefTitle || (isEn ? 'Mission brief' : 'Brief de mission');
  const resolvedStartLabel = startLabel || (isEn ? 'Start challenge' : 'Démarrer le challenge');
  const facilitatorLabel = isEn ? 'Facilitator' : 'Facilitateur';
  const participantLabel = isEn ? 'Participants' : 'Participants';

  const cardContent = (
    <>
      <header className={styles.rulesHeader}>
        <h2 className="challenge-section-title">{challengeName} - {resolvedBriefTitle}</h2>
        <p className="challenge-text">{objective}</p>
      </header>

      {isFacilitator ? (
        <section className={styles.rulesSection}>
          <h3 className="challenge-section-title">{facilitatorLabel}</h3>
          <ul>
            {facilitatorRules.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${styles.rulesSection} ${styles.rulesSectionParticipant}`}>
        <h3 className="challenge-section-title">{participantLabel}</h3>
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
        {isEn ? 'Show rules' : 'Afficher les règles'}
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
              <h2 id="challenge-rules-modal-title">{isEn ? 'Rules' : 'Règles'} - {challengeName}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label={isEn ? 'Close rules' : 'Fermer les règles'}>
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </header>
            {cardContent}
          </section>
        </div>
      ) : null}
    </>
  );
}
