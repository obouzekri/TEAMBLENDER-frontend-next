'use client';

import { useEffect } from 'react';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import styles from './ChallengeRulesPreviewModal.module.css';

function getFallbackRules(challenge) {
  const description = String(challenge?.description || '').trim();
  return {
    objective: description || 'Review the rules for this activity before adding it to your session.',
    facilitator: ['Frame the challenge, set the context, and streamline team coordination.'],
    participant: ['Align on the brief, distribute roles, and progress together on the challenge.'],
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
  const playerRange = resolveChallengePlayerRange(challenge);

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
            <p className={styles.kicker}>📜 View rules</p>
            <h2 id={modalTitleId}>{challenge?.name || 'Activity'}</h2>
            <p className={styles.duration}>{duration > 0 ? `Average duration: ${duration} min` : 'Average duration to be confirmed'}</p>
            {playerRange.hasRange ? (
              <p className={styles.playersLine}>
                Min: {playerRange.min || '-'} · Recommended: {playerRange.recommended || '-'} · Max: {playerRange.max || '-'} players
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close rules window">
            Close
          </button>
        </header>

        <section className={styles.block}>
          <h3>Mission brief</h3>
          <p>{rules.objective}</p>
        </section>

        <section className={styles.block}>
          <h3>Facilitator</h3>
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