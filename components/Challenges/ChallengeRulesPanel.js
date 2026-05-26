'use client';

import React, { useEffect, useState } from 'react';
import styles from './ChallengeRulesPanel.module.css';

export default function ChallengeRulesPanel({
  isStarted,
  isFacilitator = true,
  challengeName,
  objective,
  facilitatorRules = [],
  participantRules = [],
  footnote = '',
  showPrestartCard = true,
  startLabel = 'Démarrer le challenge',
  onStart = null,
  startDisabled = false,
  compactStartButton = false,
}) {
  const [isOpen, setIsOpen] = useState(false);

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

  const cardContent = (
    <>
      <header className={styles.rulesHeader}>
        <h2>{challengeName} - Brief de mission</h2>
        <p>{objective}</p>
      </header>

      {isFacilitator ? (
        <section className={styles.rulesSection}>
          <h3>Facilitateur</h3>
          <ul>
            {facilitatorRules.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.rulesSection}>
        <h3>Participants</h3>
        <ul>
          {participantRules.map((rule) => (
            <li key={`participant-${rule}`}>{rule}</li>
          ))}
        </ul>
      </section>

      {footnote ? <p className={styles.rulesFootnote}>{footnote}</p> : null}

      {canStartFromRules ? (
        <div className={styles.rulesActions}>
          <button
            type="button"
            className={`${styles.startButton}${compactStartButton ? ` ${styles.startButtonCompact}` : ''}`}
            onClick={onStart}
            disabled={startDisabled}
          >
            {startLabel}
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
        Afficher les règles
      </button>

      {isOpen ? (
        <div className={styles.modalBackdrop} onClick={() => setIsOpen(false)} role="dialog" aria-modal="true">
          <section className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHead}>
              <h2>Règles - {challengeName}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                Fermer
              </button>
            </header>
            {cardContent}
          </section>
        </div>
      ) : null}
    </>
  );
}
