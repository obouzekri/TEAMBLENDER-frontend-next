'use client';

import { useEffect } from 'react';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import useI18n from '@/lib/i18n/useI18n';
import styles from './ChallengeRulesPreviewModal.module.css';

function getFallbackRules(challenge, locale) {
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
  const { locale } = useI18n();
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
            <p className={styles.kicker}>{isEn ? '📜 View rules' : '📜 Voir les règles'}</p>
            <h2 id={modalTitleId}>{challenge?.name || (isEn ? 'Activity' : 'Activité')}</h2>
            <p className={styles.duration}>{duration > 0 ? `${isEn ? 'Average duration' : 'Durée moyenne'}: ${duration} min` : (isEn ? 'Average duration to be confirmed' : 'Durée moyenne à confirmer')}</p>
            {playerRange.hasRange ? (
              <p className={styles.playersLine}>
                {isEn
                  ? `Min: ${playerRange.min || '-'} · Recommended: ${playerRange.recommended || '-'} · Max: ${playerRange.max || '-'} players`
                  : `Min : ${playerRange.min || '-'} · Recommandé : ${playerRange.recommended || '-'} · Max : ${playerRange.max || '-'} joueurs`}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={isEn ? 'Close rules window' : 'Fermer la fenêtre des règles'}>
            {isEn ? 'Close' : 'Fermer'}
          </button>
        </header>

        <section className={styles.block}>
          <h3>{isEn ? 'Mission brief' : 'Brief de mission'}</h3>
          <p>{rules.objective}</p>
        </section>

        <section className={styles.block}>
          <h3>{isEn ? 'Facilitator' : 'Facilitateur'}</h3>
          <ul>
            {rules.facilitator.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h3>{isEn ? 'Participants' : 'Participants'}</h3>
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