'use client';

import React, { useContext, useEffect, useId, useRef, useState } from 'react';
import { ChallengeConnectionContext } from '@/lib/challenges/connection-context';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import useModalFocus from '@/lib/useModalFocus';
import { isScoringRule } from '@/lib/challenges/rules';
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
  const connected = useContext(ChallengeConnectionContext);

  useBodyScrollLock(isOpen);
  const dialogRef = useRef(null);
  const titleId = useId();
  useModalFocus(isOpen, dialogRef, () => setIsOpen(false));

  useEffect(() => {
    if (!isStarted) {
      setIsOpen(false);
    }
  }, [isStarted]);

  const canStartFromRules = !isStarted && isFacilitator && typeof onStart === 'function';
  const resolvedBriefTitle = briefTitle || t('challengeRulesPanel.briefTitle');
  const resolvedStartLabel = startLabel || t('challengeRulesPanel.startChallenge');
  const minPlayers = String(participantsMeta?.min || '').trim();
  const recommendedPlayers = String(participantsMeta?.recommended || '').trim();
  const maxPlayers = String(participantsMeta?.max || '').trim();
  const playersRuleText = [
    minPlayers ? `${t('challengeRulesPanel.min')} ${minPlayers}` : '',
    recommendedPlayers ? `${t('challengeRulesPanel.recommended')} ${recommendedPlayers}` : '',
    maxPlayers ? `${t('challengeRulesPanel.max')} ${maxPlayers}` : '',
  ].filter(Boolean);
  const regularParticipantRules = participantRules.filter((rule) => !isScoringRule(rule));
  const scoringRules = participantRules.filter((rule) => isScoringRule(rule));

  const cardContent = (
    <>
      <header className={styles.rulesHeader}>
        <h3 className={styles.rulesBriefTitle}>{resolvedBriefTitle}</h3>
        <p className="challenge-text">{objective}</p>
        {playersRuleText.length > 0 ? (
          <p className={styles.rulesMeta}>{playersRuleText.join(' · ')}</p>
        ) : null}
      </header>

      {regularParticipantRules.length > 0 || scoringRules.length > 0 ? (
        <section className={styles.rulesSection}>
          <h3 className="challenge-section-title">🧭 {t('challengeRulesPanel.playFlow')}</h3>
          {regularParticipantRules.length > 0 ? (
            <ul>
              {regularParticipantRules.map((rule) => (
                <li key={`participant-${rule}`}>{rule}</li>
              ))}
            </ul>
          ) : null}
          {scoringRules.length > 0 ? (
            <div className={styles.rulesScoring}>
              <h3 className="challenge-section-title">🏆 {t('challengeRulesPanel.scoringSuccess')}</h3>
              <ul>
                {scoringRules.map((rule) => (
                  <li key={`participant-score-${rule}`}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {isFacilitator && facilitatorRules.length > 0 ? (
        <details className={styles.rulesFacilitator}>
          <summary>{t('challengeRulesPanel.facilitatorTips')}</summary>
          <ul>
            {facilitatorRules.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {footnote ? <p className={`${styles.rulesFootnote} challenge-text`}>{footnote}</p> : null}

      {extraContent}

      {canStartFromRules ? (
        <div className={`${styles.rulesActions}${stickyStartButton ? ` ${styles.rulesActionsSticky}` : ''}`}>
          <button
            type="button"
            className={`${styles.startButton}${compactStartButton ? ` ${styles.startButtonCompact}` : ''}${startButtonFullWidth ? ` ${styles.startButtonFullWidth}` : ''}`}
            onClick={onStart}
            disabled={startDisabled || !connected}
          >
            {resolvedStartLabel}
          </button>
          {startStatusText ? <p className={styles.startButtonStatus}>{startStatusText}</p> : null}
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
            ref={dialogRef}
            tabIndex={-1}
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHead}>
              <h2 id={titleId}>{t('challengeRulesPanel.modalTitle')}</h2>
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
