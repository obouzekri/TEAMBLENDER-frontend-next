'use client';

import { useEffect } from 'react';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import styles from './ChallengeRulesPreviewModal.module.css';

function getFallbackRules(challenge) {
  const description = String(challenge?.description || '').trim();
  return {
    objective: description || 'Consultez les règles de cette activité avant de l’ajouter à votre session.',
    facilitator: ['Cadrez le défi, posez le contexte et fluidifiez la coordination de l’équipe.'],
    participant: ['Alignez-vous sur le brief, répartissez les rôles et avancez ensemble sur le challenge.'],
    footnote: '',
  };
}

export default function ChallengeRulesPreviewModal({ challenge, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rules = resolveChallengeRules(challenge?.config || challenge?.engine_config || {}, getFallbackRules(challenge));
  const duration = Number(challenge?.duration || challenge?.config?.duration_minutes || 0);

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
            <p className={styles.kicker}>📜 Voir les règles</p>
            <h2 id={modalTitleId}>{challenge?.name || 'Activité'}</h2>
            <p className={styles.duration}>{duration > 0 ? `Durée moyenne: ${duration} min` : 'Durée moyenne à confirmer'}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fermer la fenêtre des règles">
            Fermer
          </button>
        </header>

        <section className={styles.block}>
          <h3>Brief de mission</h3>
          <p>{rules.objective}</p>
        </section>

        <section className={styles.block}>
          <h3>Facilitateur</h3>
          <ul>
            {rules.facilitator.map((rule) => (
              <li key={`facilitator-${rule}`}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h3>Participants</h3>
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