'use client';

import { useEffect } from 'react';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import { getEscapeRoomRulesPreset } from '@/lib/challenges/escapeRoomRules';
import { getLabyrintheRulesPreset } from '@/lib/challenges/labyrintheRules';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getMissionCritiqueRulesPreset } from '@/lib/challenges/missionCritiqueRules';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import styles from './ChallengeRulesPreviewModal.module.css';

function getFallbackRules(challenge, locale) {
  const isLabyrinthe = String(challenge?.engine_key || '').trim() === 'labyrinthe_live_v1';
  const isVom = String(challenge?.engine_key || '').trim() === 'vrai_ou_mensonge_v1';
  const isMissionCritique = String(challenge?.engine_key || '').trim() === 'mission_critique_v1';
  const isEscapeRoom = String(challenge?.engine_key || '').trim() === 'escape_room_v1';
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

  const rules = resolveChallengeRules(challenge?.config || challenge?.engine_config || {}, getFallbackRules(challenge, locale));
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
            <h2 id={modalTitleId}>{challenge?.name || (isEn ? 'Activity' : 'Activité')}</h2>
            <p className={styles.duration}>{duration > 0 ? `${t('challengeRulesPanel.averageDuration')}: ${duration} min` : t('challengeRulesPanel.averageDurationUnknown')}</p>
            {playerRange.hasRange ? (
              <p className={styles.playersLine}>
                {isLabyrinthe
                  ? (isEn
                    ? `${t('challengeRulesPanel.min')}: ${labyrintheParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')}: ${labyrintheParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')}: ${labyrintheParticipants?.max || '-'}`
                    : `${t('challengeRulesPanel.min')} : ${labyrintheParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')} : ${labyrintheParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')} : ${labyrintheParticipants?.max || '-'}`)
                  : isVom
                    ? (isEn
                      ? `${t('challengeRulesPanel.min')}: ${vomParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')}: ${vomParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')}: ${vomParticipants?.max || '-'}`
                      : `${t('challengeRulesPanel.min')} : ${vomParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')} : ${vomParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')} : ${vomParticipants?.max || '-'}`)
                  : isMissionCritique
                    ? (isEn
                      ? `${t('challengeRulesPanel.min')}: ${missionCritiqueParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')}: ${missionCritiqueParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')}: ${missionCritiqueParticipants?.max || '-'}`
                      : `${t('challengeRulesPanel.min')} : ${missionCritiqueParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')} : ${missionCritiqueParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')} : ${missionCritiqueParticipants?.max || '-'}`)
                  : isEscapeRoom
                    ? (isEn
                      ? `${t('challengeRulesPanel.min')}: ${escapeRoomParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')}: ${escapeRoomParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')}: ${escapeRoomParticipants?.max || '-'}`
                      : `${t('challengeRulesPanel.min')} : ${escapeRoomParticipants?.min || '-'} · ${t('challengeRulesPanel.recommended')} : ${escapeRoomParticipants?.recommended || '-'} · ${t('challengeRulesPanel.max')} : ${escapeRoomParticipants?.max || '-'}`)
                  : (isEn
                    ? `Min: ${playerRange.min || '-'} · Recommended: ${playerRange.recommended || '-'} · Max: ${playerRange.max || '-'} ${t('challengeRulesPanel.players')}`
                    : `Min : ${playerRange.min || '-'} · Recommande : ${playerRange.recommended || '-'} · Max : ${playerRange.max || '-'} ${t('challengeRulesPanel.players')}`)}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('challengeRulesPanel.closeRulesWindow')}>
            {t('challengeRulesPanel.closeRules')}
          </button>
        </header>

        <section className={styles.block}>
          <h3>{t('challengeRulesPanel.briefTitle')}</h3>
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