'use client';

import useI18n from '@/lib/i18n/useI18n';
import styles from './SessionPreparation.module.css';

export default function SessionPreparation({ participantCount = null, readyCount = null, expectedCount = null, configuration = 'unknown', sessionAvailable = false, running = false, completed = false, connected = true, busy = false }) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const labels = isEn
    ? ['Participants ready', 'Valid configuration', 'Session ready', 'Challenge started', 'Debrief', 'Next challenge']
    : ['Participants prêts', 'Configuration valide', 'Session prête', 'Challenge lancé', 'Débrief', 'Challenge suivant'];
  const readyKnown = Number.isInteger(readyCount) && Number.isInteger(expectedCount) && expectedCount > 0;
  const stages = [
    {
      status: readyKnown ? (readyCount >= expectedCount ? 'done' : 'waiting') : 'unknown',
      detail: readyKnown ? `${readyCount}/${expectedCount} ${isEn ? 'ready' : 'prêts'}`
        : `${participantCount !== null ? `${participantCount} ${isEn ? 'assigned' : 'affectés'}. ` : ''}${isEn ? 'Readiness is not reported for this stage.' : 'La disponibilité n’est pas signalée à cette étape.'}`,
    },
    {
      status: configuration === 'missing' ? 'waiting' : configuration === 'loaded' ? 'review' : 'unknown',
      detail: configuration === 'missing'
        ? (isEn ? 'Choose at least one activity.' : 'Choisissez au moins une activité.')
        : configuration === 'loaded'
          ? (isEn ? 'Configuration loaded; server validation applies when saving or starting.' : 'Configuration chargée ; validation serveur lors de l’enregistrement ou du lancement.')
          : (isEn ? 'Configuration not yet available.' : 'Configuration pas encore disponible.'),
    },
    {
      status: sessionAvailable ? 'done' : 'waiting',
      detail: sessionAvailable
        ? (isEn ? 'Session available. Individual launch requirements remain visible in each challenge.' : 'Session disponible. Les conditions de lancement propres au challenge restent affichées.')
        : (isEn ? 'Create or load a session first.' : 'Créez ou chargez d’abord une session.'),
    },
    { status: completed ? 'done' : running ? 'active' : 'waiting', detail: completed ? (isEn ? 'Finished' : 'Terminé') : running ? (isEn ? 'Running' : 'En cours') : (isEn ? 'Waiting for launch' : 'En attente de lancement') },
    { status: completed ? 'active' : 'waiting', detail: isEn ? 'Review the results after completion.' : 'Consultez les résultats après la fin.' },
    { status: 'waiting', detail: isEn ? 'Use the existing manual or automatic session flow.' : 'Suivez le déroulement manuel ou automatique existant.' },
  ];
  const statusNames = isEn
    ? { done: 'Available', active: 'Current stage', waiting: 'Waiting', review: 'To verify', unknown: 'Not reported' }
    : { done: 'Disponible', active: 'Étape actuelle', waiting: 'En attente', review: 'À vérifier', unknown: 'Non signalé' };
  return (
    <details className={styles.panel}>
      <summary>{isEn ? 'Session preparation and progress' : 'Préparation et déroulement de la session'}</summary>
      <p>{isEn ? 'This guide shows known information; it adds no new launch requirements.' : 'Ce guide affiche les informations connues, sans ajouter de nouvelles obligations de lancement.'}</p>
      {!connected ? <p role="alert">{isEn ? 'Connection interrupted: realtime commands are unavailable.' : 'Connexion interrompue : commandes temps réel indisponibles.'}</p> : null}
      {busy ? <p role="status">{isEn ? 'An operation is in progress.' : 'Une opération est en cours.'}</p> : null}
      <ol>
        {stages.map((stage, index) => <li key={labels[index]} data-stage-status={stage.status}>
          <strong>{labels[index]}</strong><span>{statusNames[stage.status]}</span><p>{stage.detail}</p>
        </li>)}
      </ol>
    </details>
  );
}
