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
  startStatusText = '',
  stickyStartButton = false,
  startButtonFullWidth = false,
  inHeader = false,
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
  const minPlayers = String(participantsMeta?.min || '').trim();
  const recommendedPlayers = String(participantsMeta?.recommended || '').trim();
  const maxPlayers = String(participantsMeta?.max || '').trim();
  const playersRuleText = [
    minPlayers ? `${isEn ? 'minimum' : 'minimum'} ${minPlayers}` : '',
    recommendedPlayers ? `${isEn ? 'recommended' : 'recommandé'} ${recommendedPlayers}` : '',
    maxPlayers ? `${isEn ? 'maximum' : 'maximum'} ${maxPlayers}` : '',
  ].filter(Boolean);
  const facilitatorRulesWithPlayers = [
    ...(playersRuleText.length > 0
      ? [
        isEn
          ? `Player format: ${playersRuleText.join(' · ')}.`
          : `Format de joueurs : ${playersRuleText.join(' · ')}.`
      ]
      : []),
    ...facilitatorRules,
  ];

  const cardContent = (
    <>
      <header className={styles.rulesHeader}>
        <h3 className={styles.rulesBriefTitle}>{resolvedBriefTitle}</h3>
        <p className="challenge-text">{objective}</p>
      </header>

      {isFacilitator ? (
        <section className={styles.rulesSection}>
          <h3 className="challenge-section-title">🎯 {facilitatorLabel}</h3>
          <ul>
            {facilitatorRulesWithPlayers.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={`${styles.rulesSection} ${styles.rulesSectionParticipant}`}>
        <h3 className="challenge-section-title">🧭 {participantLabel}</h3>
        <div className={styles.rulesGroupedList}>
          <div className={styles.rulesGroup}>
            <ul>
              {participantRules.filter((rule) => !String(rule).toLowerCase().includes('barème') && !String(rule).toLowerCase().includes('score') && !String(rule).toLowerCase().includes('points')).map((rule) => (
                <li key={`participant-${rule}`}>{rule}</li>
              ))}
            </ul>
          </div>
          <div className={styles.rulesGroup}>
            <h3 className="challenge-section-title">{isEn ? 'Scoring' : 'Barème des points'}</h3>
            <ul>
              {participantRules.filter((rule) => String(rule).toLowerCase().includes('barème') || String(rule).toLowerCase().includes('score') || String(rule).toLowerCase().includes('points') || String(rule).toLowerCase().includes('bonne réponse') || String(rule).toLowerCase().includes('non posé') || String(rule).toLowerCase().includes('non répondu')).map((rule) => (
                <li key={`participant-score-${rule}`}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {footnote ? <p className={`${styles.rulesFootnote} challenge-text`}>{footnote}</p> : null}

      {extraContent}

      {canStartFromRules ? (
        <div className={`${styles.rulesActions}${stickyStartButton ? ` ${styles.rulesActionsSticky}` : ''}`}>
          <button
            type="button"
            className={`${styles.startButton}${compactStartButton ? ` ${styles.startButtonCompact}` : ''}${startButtonFullWidth ? ` ${styles.startButtonFullWidth}` : ''}`}
            onClick={onStart}
            disabled={startDisabled}
          >
            {resolvedStartLabel}
          </button>
          {startStatusText && startDisabled ? <p className={styles.startButtonStatus}>{startStatusText}</p> : null}
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
        className={`${styles.rulesButton} ${styles.rulesButtonIconOnly}${inHeader ? ` ${styles.desktopHeaderRulesButton} challenge-rules-header-button` : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label={t('challengeRulesPanel.showRules')}
        title={t('challengeRulesPanel.showRules')}
      >
        {inHeader ? null : <span aria-hidden="true">📜</span>}
        <span>{t('challengeRulesPanel.rulesLabel')}</span>
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
              <h2 id="challenge-rules-modal-title">{t('challengeRulesPanel.modalTitle')}</h2>
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
