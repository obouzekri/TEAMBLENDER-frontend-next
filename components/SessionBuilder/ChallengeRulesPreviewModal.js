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
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import styles from './ChallengeRulesPreviewModal.module.css';

function getFallbackRules(challenge, locale) {
  const isLabyrinthe = String(challenge?.engine_key || '').trim() === 'labyrinthe_live_v1';
  const isVom = String(challenge?.engine_key || '').trim() === 'vrai_ou_mensonge_v1';
  const isMissionCritique = String(challenge?.engine_key || '').trim() === 'mission_critique_v1';
  const isEscapeRoom = String(challenge?.engine_key || '').trim() === 'escape_room_v1';
  const isPixelArchitect = String(challenge?.engine_key || '').trim() === 'pixel_architect_v1';
  const isTheQuiz = String(challenge?.engine_key || '').trim() === 'the_quiz_v1';
  const isPhraseMystere = String(challenge?.engine_key || '').trim() === 'phrase_collaborative_v1';
  const isCopuzzle = String(challenge?.engine_key || '').trim() === 'copuzzle_live_v1';
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
      participant: [...preset.participant, ...preset.scoring],
      footnote: preset.footnote,
    };
  }

  if (isMissionCritique) {
    const preset = getMissionCritiqueRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.scoring],
      footnote: preset.footnote,
    };
  }

  if (isEscapeRoom) {
    const preset = getEscapeRoomRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.scoring],
      footnote: preset.footnote,
    };
  }

  if (isPixelArchitect) {
    const preset = getPixelArchitectRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.scoring],
      footnote: preset.footnote,
    };
  }

  if (isTheQuiz) {
    const preset = getTheQuizRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.scoring],
      footnote: preset.footnote,
    };
  }

  if (isPhraseMystere) {
    const preset = getPhraseMystereRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.hints, ...preset.scoring],
      footnote: preset.footnote,
    };
  }

  if (isCopuzzle) {
    const preset = getCopuzzleRulesPreset(locale);
    return {
      objective: preset.objective,
      facilitator: preset.facilitator,
      participant: [...preset.participant, ...preset.scoring],
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
  const labyrintheParticipants = isLabyrinthe ? getLabyrintheRulesPreset(locale).participants : null;
  const vomParticipants = isVom ? getVraiOuMensongeRulesPreset(locale).participants : null;
  const missionCritiqueParticipants = isMissionCritique ? getMissionCritiqueRulesPreset(locale).participants : null;
  const escapeRoomParticipants = isEscapeRoom ? getEscapeRoomRulesPreset(locale).participants : null;
  const participantTags = playerRange.hasRange
    ? [
      { key: 'min', label: t('challengeRulesPanel.min'), value: isLabyrinthe ? labyrintheParticipants?.min : isVom ? vomParticipants?.min : isMissionCritique ? missionCritiqueParticipants?.min : isEscapeRoom ? escapeRoomParticipants?.min : playerRange.min, highlighted: false },
      { key: 'recommended', label: t('challengeRulesPanel.recommended'), value: isLabyrinthe ? labyrintheParticipants?.recommended : isVom ? vomParticipants?.recommended : isMissionCritique ? missionCritiqueParticipants?.recommended : isEscapeRoom ? escapeRoomParticipants?.recommended : playerRange.recommended, highlighted: true },
      { key: 'max', label: t('challengeRulesPanel.max'), value: isLabyrinthe ? labyrintheParticipants?.max : isVom ? vomParticipants?.max : isMissionCritique ? missionCritiqueParticipants?.max : isEscapeRoom ? escapeRoomParticipants?.max : playerRange.max, highlighted: false },
    ].filter((entry) => String(entry.value || '').trim())
    : [];

  const modalTitleId = 'challenge-rules-preview-title';
  const isEn = locale === 'en';

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
            <p className={styles.kicker}>📜 {t('challengeRulesPanel.kicker')}</p>
            <div className={styles.titleRow}>
              <h2 id={modalTitleId}>{challenge?.name || (isEn ? 'Activity' : 'Activité')}</h2>
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
            <p className={styles.duration}>{duration > 0 ? `${t('challengeRulesPanel.averageDuration')}: ${duration} min` : t('challengeRulesPanel.averageDurationUnknown')}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('challengeRulesPanel.closeRulesWindow')}>
            {t('challengeRulesPanel.closeRules')}
          </button>
        </header>

        <section className={styles.block}>
          <h3 className={styles.briefTitle}>{t('challengeRulesPanel.briefTitle')}</h3>
          <p>{rules.objective}</p>
        </section>

        <section className={styles.block}>
          <h3>{t('challengeRulesPanel.facilitator')}</h3>
          <ul>
            {rules.facilitator.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h3>{t('challengeRulesPanel.participants')}</h3>
          <ul>
            {rules.participant.map((rule) => (
              <li key={`participant-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>

        {rules.footnote ? <p className={styles.footnote}>{rules.footnote}</p> : null}
      </section>
    </div>
  );
}