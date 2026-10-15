'use client';

import { useEffect } from 'react';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import { getEscapeRoomRulesPreset } from '@/lib/challenges/escapeRoomRules';
import { getLabyrintheRulesPreset } from '@/lib/challenges/labyrintheRules';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getMissionCritiqueRulesPreset } from '@/lib/challenges/missionCritiqueRules';
import { getPixelArchitectRulesPreset } from '@/lib/challenges/pixelArchitectRules';
import { getTheQuizRulesPreset } from '@/lib/challenges/theQuizRules';
import { getPhraseMystereRulesPreset } from '@/lib/challenges/phraseMystereRules';
import { getCopuzzleRulesPreset } from '@/lib/challenges/copuzzleRules';
import { getLabInnovationRulesPreset } from '@/lib/challenges/labInnovationRules';
import { getCrosswordRulesPreset } from '@/lib/challenges/crosswordRules';
import { isScoringRule } from '@/lib/challenges/rules';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import styles from './ChallengeRulesPreviewModal.module.css';

function getFallbackRules(challenge, locale) {
  if (challenge?.engine_key === 'crossword_live_v1') return getCrosswordRulesPreset(locale);
  const isLabyrinthe = String(challenge?.engine_key || '').trim() === 'labyrinthe_live_v1';
  const isVom = String(challenge?.engine_key || '').trim() === 'vrai_ou_mensonge_v1';
  const isMissionCritique = String(challenge?.engine_key || '').trim() === 'mission_critique_v1';
  const isEscapeRoom = String(challenge?.engine_key || '').trim() === 'escape_room_v1';
  const isPixelArchitect = String(challenge?.engine_key || '').trim() === 'pixel_architect_v1';
  const isTheQuiz = String(challenge?.engine_key || '').trim() === 'the_quiz_v1';
  const isPhraseMystere = String(challenge?.engine_key || '').trim() === 'phrase_collaborative_v1';
  const isCopuzzle = String(challenge?.engine_key || '').trim() === 'copuzzle_live_v1';
  const isLabInnovation = String(challenge?.engine_key || '').trim() === 'lab_d_innovation_v1';
  if (isLabyrinthe) {
    const preset = getLabyrintheRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isVom) {
    const preset = getVraiOuMensongeRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isMissionCritique) {
    const preset = getMissionCritiqueRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isEscapeRoom) {
    const preset = getEscapeRoomRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isPixelArchitect) {
    const preset = getPixelArchitectRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isTheQuiz) {
    const preset = getTheQuizRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isPhraseMystere) {
    const preset = getPhraseMystereRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.hints],
      footnote: preset.footnote,
    };
  }

  if (isCopuzzle) {
    const preset = getCopuzzleRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  if (isLabInnovation) {
    const preset = getLabInnovationRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: preset.participant,
      footnote: preset.footnote,
    };
  }

  const description = String(challenge?.description || '').trim();
  const isEn = locale === 'en';
  return {
    objective: description || (isEn
      ? 'Review the rules for this activity before adding it to your session.'
      : 'Consultez les règles de cette activité avant de l’ajouter à votre session.'),
    facilitator: [isEn
      ? 'Set the frame, explain the context, and coordinate the team flow.'
      : 'Posez le cadre, expliquez le contexte et coordonnez le déroulé de l’équipe.'],
    participant: [isEn
      ? 'Align on the brief, assign roles, and progress together on the challenge.'
      : 'Alignez-vous sur le brief, répartissez les rôles et progressez ensemble sur le challenge.'],
    footnote: '',
  };
}

export default function ChallengeRulesPreviewModal({ challenge, onClose }) {
  const { locale, t } = useI18n();
  useBodyScrollLock(true);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rules = getFallbackRules(challenge, locale);
  const duration = Number(challenge?.duration || challenge?.config?.duration_minutes || 0);
  const playerRange = resolveChallengePlayerRange(challenge);
  const isLabyrinthe = String(challenge?.engine_key || '').trim() === 'labyrinthe_live_v1';
  const isVom = String(challenge?.engine_key || '').trim() === 'vrai_ou_mensonge_v1';
  const isMissionCritique = String(challenge?.engine_key || '').trim() === 'mission_critique_v1';
  const isEscapeRoom = String(challenge?.engine_key || '').trim() === 'escape_room_v1';
  const isLabInnovation = String(challenge?.engine_key || '').trim() === 'lab_d_innovation_v1';
  const labyrintheParticipants = isLabyrinthe ? getLabyrintheRulesPreset(locale).participants : null;
  const vomParticipants = isVom ? getVraiOuMensongeRulesPreset(locale).participants : null;
  const missionCritiqueParticipants = isMissionCritique ? getMissionCritiqueRulesPreset(locale).participants : null;
  const escapeRoomParticipants = isEscapeRoom ? getEscapeRoomRulesPreset(locale).participants : null;
  const labInnovationParticipants = isLabInnovation ? getLabInnovationRulesPreset(locale).participants : null;
  const minPlayers = String(isLabyrinthe ? labyrintheParticipants?.min : isVom ? vomParticipants?.min : isMissionCritique ? missionCritiqueParticipants?.min : isEscapeRoom ? escapeRoomParticipants?.min : isLabInnovation ? labInnovationParticipants?.min : playerRange.min || '').trim();
  const recommendedPlayers = String(isLabyrinthe ? labyrintheParticipants?.recommended : isVom ? vomParticipants?.recommended : isMissionCritique ? missionCritiqueParticipants?.recommended : isEscapeRoom ? escapeRoomParticipants?.recommended : isLabInnovation ? labInnovationParticipants?.recommended : playerRange.recommended || '').trim();
  const maxPlayers = String(isLabyrinthe ? labyrintheParticipants?.max : isVom ? vomParticipants?.max : isMissionCritique ? missionCritiqueParticipants?.max : isEscapeRoom ? escapeRoomParticipants?.max : isLabInnovation ? labInnovationParticipants?.max : playerRange.max || '').trim();
  const playersRuleText = [
    minPlayers ? `${t('challengeRulesPanel.min')} ${minPlayers}` : '',
    recommendedPlayers ? `${t('challengeRulesPanel.recommended')} ${recommendedPlayers}` : '',
    maxPlayers ? `${t('challengeRulesPanel.max')} ${maxPlayers}` : '',
  ].filter(Boolean);
  const regularParticipantRules = rules.participant.filter((rule) => !isScoringRule(rule));
  const scoringRules = rules.participant.filter(isScoringRule);

  const modalTitleId = 'challenge-rules-preview-title';

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id={modalTitleId} className={styles.challengeTitle}>{t('challengeRulesPanel.modalTitle')}</h2>
            <p className={styles.objective}>{rules.objective}</p>
            {playersRuleText.length > 0 ? (
              <p className={styles.playersMeta}>{playersRuleText.join(' · ')}</p>
            ) : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('challengeRulesPanel.closeRulesWindow')}>
            {t('challengeRulesPanel.closeRules')}
          </button>
        </header>

        {regularParticipantRules.length > 0 || scoringRules.length > 0 ? (
          <section className={styles.rulesSection}>
            <h3 className={styles.sectionTitle}>🧭 {t('challengeRulesPanel.playFlow')}</h3>
            {regularParticipantRules.length > 0 ? (
              <ul>
                {regularParticipantRules.map((rule) => (
                  <li key={`participant-${rule}`}>{rule}</li>
                ))}
              </ul>
            ) : null}
            {scoringRules.length > 0 ? (
              <div className={styles.scoringRules}>
                <h3 className={styles.sectionTitle}>🏆 {t('challengeRulesPanel.scoringSuccess')}</h3>
                <ul>
                  {scoringRules.map((rule) => (
                    <li key={`participant-score-${rule}`}>{rule}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {rules.facilitator.length > 0 ? (
          <details className={styles.facilitatorDetails}>
            <summary>{t('challengeRulesPanel.facilitatorTips')}</summary>
            <ul>
              {rules.facilitator.map((rule) => (
                <li key={`facilitator-${rule}`}>{rule}</li>
              ))}
            </ul>
          </details>
        ) : null}

        {rules.footnote ? <p className={`${styles.footnote}`}>{rules.footnote}</p> : null}

        <div className={styles.durationMeta}>
          {duration > 0 ? `${t('challengeRulesPanel.averageDuration')}: ${duration} min` : t('challengeRulesPanel.averageDurationUnknown')}
        </div>
      </section>
    </div>
  );
}