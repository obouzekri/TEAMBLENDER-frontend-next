'use client';

import useI18n from '@/lib/i18n/useI18n';
import styles from './SessionPreparation.module.css';

export default function SessionPreparation({ participantCount = null, participantCountLabel = 'assigned', selectedCount = null, readyCount = null, expectedCount = null, configuration = 'unknown', sessionAvailable = false, running = false, completed = false, connected = true, busy = false }) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const readyKnown = Number.isInteger(readyCount) && Number.isInteger(expectedCount) && expectedCount > 0;
  const participantCountText = isEn
    ? participantCountLabel === 'connected' ? 'connected' : 'assigned'
    : participantCountLabel === 'connected' ? 'connectés' : 'affectés';
  const preparationStatus = configuration === 'missing'
    ? 'waiting'
    : configuration === 'loaded'
      ? (sessionAvailable ? 'done' : 'review')
      : 'unknown';
  const sessionStatus = completed ? 'done' : running ? 'active' : 'waiting';
  const stages = [
    {
      label: isEn ? 'Prepare' : 'Préparer',
      status: preparationStatus,
      detail: [
        readyKnown
          ? `${isEn ? 'Ready participants' : 'Participants prêts'} : ${readyCount}/${expectedCount}`
          : `${participantCount !== null ? `${participantCount} ${participantCountText}. ` : ''}${isEn ? 'Individual readiness is not tracked here.' : 'La disponibilité individuelle n’est pas suivie ici.'}`,
        Number.isInteger(selectedCount)
          ? selectedCount > 0
            ? `${selectedCount} ${isEn ? (selectedCount === 1 ? 'activity selected.' : 'activities selected.') : (selectedCount === 1 ? 'activité sélectionnée.' : 'activités sélectionnées.')}`
            : (isEn ? 'Choose at least one activity.' : 'Choisissez au moins une activité.')
          : configuration === 'missing'
            ? (isEn ? 'Choose at least one activity.' : 'Choisissez au moins une activité.')
            : configuration === 'loaded'
              ? (isEn ? 'Configuration loaded; server validation applies when saving or starting.' : 'Configuration chargée ; validation serveur lors de l’enregistrement ou du lancement.')
              : (isEn ? 'Configuration not yet available.' : 'Configuration pas encore disponible.'),
        sessionAvailable
          ? (isEn ? 'Session available.' : 'Session disponible.')
          : (isEn ? 'Create or load a session first.' : 'Créez ou chargez d’abord une session.'),
      ],
    },
    {
      label: isEn ? 'Facilitate' : 'Animer',
      status: sessionStatus,
      detail: completed
        ? (isEn ? 'The session is complete.' : 'La session est terminée.')
        : running
          ? (isEn ? 'The challenge is in progress.' : 'Le challenge est en cours.')
          : (isEn ? 'Waiting for the facilitator to start the challenge.' : 'En attente du lancement du challenge par le facilitateur.'),
    },
    {
      label: isEn ? 'Wrap up' : 'Conclure',
      status: completed ? 'active' : 'waiting',
      detail: completed
        ? (isEn ? 'Review the results, then continue with the existing manual or automatic flow.' : 'Consultez les résultats, puis poursuivez avec le déroulement manuel ou automatique existant.')
        : (isEn ? 'Review the debrief and move to the next challenge after the session.' : 'Consultez le débrief et passez au challenge suivant après la session.'),
    },
  ];
  const statusNames = isEn
    ? { done: 'Ready', active: 'In progress', waiting: 'Up next', review: 'To verify', unknown: 'Not reported' }
    : { done: 'Prêt', active: 'En cours', waiting: 'À venir', review: 'À vérifier', unknown: 'Non renseigné' };

  return (
    <details className={styles.panel}>
      <summary>
        <span>{isEn ? 'Session preparation and progress' : 'Préparation et déroulement de la session'}</span>
        <span className={styles.summaryHint}>{isEn ? '3 steps' : '3 étapes'}</span>
      </summary>
      <p className={styles.intro}>{isEn ? 'A quick overview. The requirements for each challenge remain in its own panel.' : 'Un aperçu rapide. Les conditions propres à chaque challenge restent affichées dans son panneau.'}</p>
      {!connected ? <p role="alert">{isEn ? 'Connection interrupted: realtime commands are unavailable.' : 'Connexion interrompue : commandes temps réel indisponibles.'}</p> : null}
      {busy ? <p role="status">{isEn ? 'An operation is in progress.' : 'Une opération est en cours.'}</p> : null}
      <ol className={styles.stages}>
        {stages.map((stage, index) => <li key={stage.label} className={styles.stage} data-stage-status={stage.status}>
          <div className={styles.stageHeading}>
            <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
            <h3>{stage.label}</h3>
            <span className={styles.status}>{statusNames[stage.status]}</span>
          </div>
          {Array.isArray(stage.detail)
            ? <ul className={styles.details}>{stage.detail.map((item) => <li key={item}>{item}</li>)}</ul>
            : <p className={styles.detail}>{stage.detail}</p>}
        </li>)}
      </ol>
    </details>
  );
}
