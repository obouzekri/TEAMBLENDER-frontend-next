'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from './EscapeRoom.module.css';

/**
 * EscapeRoomChallenge - Escape Room v1 (REST-driven)
 *
 * This engine uses dedicated backend endpoints under:
 * /api/sessions/:sessionId/escape-room/:challengeId/*
 *
 * It is intentionally not coupled to Socket.io for now.
 */
export default function EscapeRoomChallenge({
  runtimePayload,
  context,
}) {
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [feedback, setFeedback] = useState('');

  const sessionId = String(context?.sessionId || runtimePayload?.session_id || '').trim();
  const challengeId = String(context?.challengeId || runtimePayload?.challenge_id || '').trim();

  const role = String(context?.role || '').toLowerCase();
  const isFacilitator = useMemo(
    () => new Set(['admin', 'manager', 'facilitator', 'user', 'owner', 'host', 'animateur']).has(role),
    [role]
  );

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
  }, []);

  const endpointBase = useMemo(() => {
    if (!sessionId || !challengeId) return '';
    return `/sessions/${sessionId}/escape-room/${challengeId}`;
  }, [sessionId, challengeId]);

  const apiCall = useCallback(
    async (path, init = {}) => {
      const response = await fetch(getApiUrl(`${endpointBase}${path}`), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init.headers || {}),
        },
      });

      const body = await response.text();
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.error || `Erreur API (${response.status})`);
      }

      return payload;
    },
    [endpointBase, token]
  );

  const loadState = useCallback(async () => {
    if (!endpointBase || !token) return;
    const payload = await apiCall('/state', { method: 'GET' });
    setState(payload);
  }, [apiCall, endpointBase, token]);

  useEffect(() => {
    let cancelled = false;
    if (!endpointBase || !token) return () => {};

    loadState().catch((err) => {
      if (!cancelled) {
        setFeedback(err.message || 'Impossible de charger la salle.');
      }
    });

    const poll = window.setInterval(() => {
      loadState().catch(() => {
        // Keep polling silent to avoid noisy UI.
      });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [endpointBase, token, loadState]);

  const currentEnigme = state?.current_enigme || null;

  const runAction = useCallback(
    async (actionKey, runner) => {
      setBusyAction(actionKey);
      setFeedback('');
      try {
        await runner();
        await loadState();
      } catch (err) {
        setFeedback(err.message || 'Action impossible pour le moment.');
      } finally {
        setBusyAction('');
      }
    },
    [loadState]
  );

  const submitAnswer = useCallback(() => {
    if (!currentEnigme || !answer.trim()) return;

    runAction('submit', async () => {
      const payload = await apiCall('/submit', {
        method: 'POST',
        body: JSON.stringify({ enigme_id: currentEnigme.id, answer }),
      });

      const outcome = String(payload?.validation?.outcome || '').trim();
      if (outcome) {
        setFeedback(`Validation: ${outcome}`);
      } else {
        setFeedback('Réponse envoyée.');
      }
      setAnswer('');
    });
  }, [answer, apiCall, currentEnigme, runAction]);

  const facilitatorAction = useCallback(
    (actionKey, path, body) => {
      runAction(actionKey, async () => {
        await apiCall(path, {
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        });
      });
    },
    [apiCall, runAction]
  );

  const remaining = Number(state?.timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 0);

  if (!endpointBase) {
    return (
      <div className={styles.escapeRoomContainer}>
        <div className={styles.card}>
          <h2>Paramètres manquants</h2>
          <p>sessionId ou challengeId est absent.</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.escapeRoomContainer}>
        <div className={styles.card}>
          <h2>Chargement de la salle...</h2>
        </div>
      </div>
    );
  }

  const isFinished = state.status && state.status !== 'in_progress';

  return (
    <div className={styles.escapeRoomContainer}>
      <section className={styles.header}>
        <div>
          <p className={styles.kicker}>Salle secrete</p>
          <h1>Escape Room</h1>
          <p className={styles.subtitle}>Résolvez les énigmes en équipe, avec validation collective.</p>
        </div>
        <div className={styles.meta}>
          <span className={styles.badge}>Statut: {state.status}</span>
          <span className={styles.badge}>Énigme {Number(state.current_enigme_index || 0) + 1} / {Number(state.total_enigmes || 0)}</span>
          <span className={styles.badge}>Timer: {remaining}s</span>
        </div>
      </section>

      <section className={styles.layout}>
        <article className={styles.card}>
          {isFinished ? (
            <>
              <h2>Partie terminée</h2>
              <p>Issue: <strong>{state.status}</strong></p>
              <p>Début: {state.started_at || '-'}</p>
              <p>Fin: {state.finished_at || '-'}</p>
            </>
          ) : (
            <>
              <h2>{currentEnigme?.label || 'Énigme en attente'}</h2>
              {currentEnigme?.image?.src ? (
                <img className={styles.image} src={currentEnigme.image.src} alt={currentEnigme.label || 'Enigme'} />
              ) : null}
              <p className={styles.description}>{currentEnigme?.description || 'Aucune description.'}</p>

              {state.hint_unlocked && currentEnigme?.hint ? (
                <div className={styles.hintBox}>
                  <strong>Indice:</strong> {currentEnigme.hint}
                </div>
              ) : null}

              {!isFacilitator ? (
                <div className={styles.answerRow}>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Votre reponse"
                    className={styles.input}
                    disabled={busyAction === 'submit' || !currentEnigme}
                  />
                  <button
                    onClick={submitAnswer}
                    disabled={busyAction === 'submit' || !answer.trim() || !currentEnigme}
                    className={styles.primaryBtn}
                  >
                    {busyAction === 'submit' ? 'Envoi...' : 'Soumettre'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </article>

        <aside className={styles.card}>
          <h3>Panneau équipe</h3>
          <p>
            Réponses reçues: <strong>{Number(state.submission_status?.responded || 0)}</strong> /
            <strong> {Number(state.submission_status?.total || 0)}</strong>
          </p>
          <p>Tentatives: {Number(state.attempts_on_current || 0)} / {Number(state.max_attempts || 0)}</p>
          <p>Rôle: {isFacilitator ? 'Facilitateur' : 'Participant'}</p>

          {isFacilitator && !isFinished && currentEnigme ? (
            <div className={styles.actions}>
              <button
                className={styles.secondaryBtn}
                disabled={!!busyAction}
                onClick={() => facilitatorAction('validate', '/validate')}
              >
                Valider collectif
              </button>
              <button
                className={styles.secondaryBtn}
                disabled={!!busyAction}
                onClick={() => facilitatorAction('hint', '/hint', { enigme_id: currentEnigme.id })}
              >
                Débloquer indice
              </button>
              <button
                className={styles.secondaryBtn}
                disabled={!!busyAction}
                onClick={() => facilitatorAction('skip', '/skip')}
              >
                Passer énigme
              </button>
              <button
                className={styles.dangerBtn}
                disabled={!!busyAction}
                onClick={() => facilitatorAction('timeout', '/timeout')}
              >
                Forcer timeout
              </button>
            </div>
          ) : null}

          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

          <details className={styles.debugWrap}>
            <summary>Runtime debug</summary>
            <pre className={styles.debug}>{JSON.stringify(runtimePayload, null, 2)}</pre>
            <pre className={styles.debug}>{JSON.stringify(state, null, 2)}</pre>
          </details>
        </aside>
      </section>

      <section className={styles.footerNote}>
        <p>
          Version LOT4 Phase 2: migration fonctionnelle Escape Room via endpoints dédiés,
          avec polling léger et actions facilitateur.
        </p>
      </section>
    </div>
  );
}
