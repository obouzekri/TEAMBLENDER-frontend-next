'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiUrl } from '@/lib/config';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
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
  socket,
  context,
  onChallengeCompleted,
}) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [state, setState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [answer, setAnswer] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const completionGuardRef = useRef('');

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

  const loadParticipants = useCallback(async () => {
    if (!sessionId || !token) return;
    const response = await fetch(getApiUrl(`/sessions/${sessionId}/participants`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const fallbackResponse = !response.ok
      ? await fetch(getApiUrl(`/participants/sessions/${sessionId}/participants`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      : null;

    const effectiveResponse = response.ok ? response : fallbackResponse;

    if (!effectiveResponse || !effectiveResponse.ok) return;
    const payload = await effectiveResponse.json();
    const list = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.participants) ? payload.participants : (Array.isArray(payload?.data) ? payload.data : []));
    setParticipants(Array.isArray(list) ? list : []);
  }, [sessionId, token]);

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

  useEffect(() => {
    loadParticipants().catch(() => {});
  }, [loadParticipants]);

  const { emitEvent, error: realtimeError } = useRealtimeChallenge({ runtimePayload, socket, context });

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    const userId = String(context?.userId || context?.participantId || '').trim();
    return `participant-${userId || 'unknown'}`;
  }, [runtimePayload, context]);

  const chatEnabled = runtimePayload?.config?.chat?.enabled !== false && Boolean(socket);

  useEffect(() => {
    if (!socket) return () => {};

    const onEvent = (packet = {}) => {
      if (String(packet?.type || '').trim() !== 'chat.message') return;
      const payload = packet?.payload || {};
      const text = String(payload?.text || '').trim();
      if (!text) return;

      const entry = {
        id: String(payload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        author: String(payload?.author || 'system').trim() || 'system',
        text,
      };

      setChatMessages((prev) => {
        if (prev.some((msg) => msg.id === entry.id)) return prev;
        return [...prev.slice(-79), entry];
      });
    };

    socket.on('challenge:event', onEvent);
    return () => {
      socket.off('challenge:event', onEvent);
    };
  }, [socket]);

  function submitChat(event) {
    event.preventDefault();
    const text = String(chatInput || '').trim();
    if (!text) return;
    emitEvent('chat.message', {
      text,
      author: displayName,
    });
    setChatInput('');
  }

  const currentEnigme = state?.current_enigme || null;
  const currentUiType = String(currentEnigme?.ui_type || '').toLowerCase();
  const currentUiData = currentEnigme?.ui_data && typeof currentEnigme.ui_data === 'object'
    ? currentEnigme.ui_data
    : {};

  const runAction = useCallback(
    async (actionKey, runner) => {
      setBusyAction(actionKey);
      setFeedback('');
      try {
        await runner();
        await loadState();
        await loadParticipants();
      } catch (err) {
        setFeedback(err.message || 'Action impossible pour le moment.');
      } finally {
        setBusyAction('');
      }
    },
    [loadParticipants, loadState]
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
  const respondedIds = Array.isArray(state?.submission_status?.responded_ids) ? state.submission_status.responded_ids : [];
  const respondedSet = useMemo(() => new Set(respondedIds.map((id) => Number(id))), [respondedIds]);
  const totalExpected = Number(state?.submission_status?.total || participants.length || 0);
  const totalResponded = Number(state?.submission_status?.responded || 0);
  const responseProgress = totalExpected > 0 ? Math.max(0, Math.min(100, Math.round((totalResponded / totalExpected) * 100))) : 0;

  const timerSeconds = Number(state?.timer?.duration_seconds || 0);
  const timerLabel = useMemo(() => {
    const minutes = Math.floor(Math.max(0, timerSeconds) / 60);
    const seconds = Math.max(0, timerSeconds) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timerSeconds]);

  const participantRows = useMemo(() => {
    return participants.map((participant) => {
      const participantId = Number(participant?.id || participant?.participant_id || 0);
      const responded = respondedSet.has(participantId);
      const displayName = String(
        participant?.first_name
          || participant?.firstname
          || participant?.name
          || participant?.email
          || `Participant ${participantId || '?'}`
      );
      return {
        id: participantId,
        name: displayName,
        responded,
      };
    });
  }, [participants, respondedSet]);

  const isFinished = Boolean(state?.status && state.status !== 'in_progress');

  useEffect(() => {
    if (!state || !isFinished || typeof onChallengeCompleted !== 'function') {
      return;
    }

    const status = String(state?.status || '').trim();
    const key = `${sessionId}:${challengeId}:${status}:${Number(state?.current_enigme_index || 0)}`;
    if (completionGuardRef.current === key) {
      return;
    }

    completionGuardRef.current = key;
    onChallengeCompleted({
      type: 'escape_room.completed',
      payload: { status },
      sessionId,
      challengeId,
    });
  }, [state, isFinished, onChallengeCompleted, sessionId, challengeId]);

  const handleTimerAction = useCallback((actionKey) => {
    if (actionKey === 'start') {
      setFeedback('La salle est deja active. Le chrono suit la configuration du challenge.');
      loadState().catch(() => {});
      return;
    }

    setFeedback('Pause/Reinitialisation du chrono non disponibles pour Salle secrete (MVP actuel).');
  }, [loadState]);

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

              {currentUiType === 'grid_3x3' && Array.isArray(currentUiData?.grid) ? (
                <div className={styles.enigmeUiBlock}>
                  <p className={styles.enigmeUiTitle}>Grille de l'énigme</p>
                  <div className={styles.matrixGrid}>
                    {currentUiData.grid.flat().map((cell, idx) => (
                      <div key={`grid-cell-${idx}`} className={styles.matrixCell}>
                        {cell == null ? '-' : String(cell)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {currentUiType === 'text_mystery' ? (
                <div className={styles.enigmeUiBlock}>
                  <p className={styles.enigmeUiTitle}>{currentUiData?.title || 'Énigme texte'}</p>
                  {currentUiData?.instruction ? <p className={styles.enigmeUiInstruction}>{currentUiData.instruction}</p> : null}
                  {Array.isArray(currentUiData?.question_lines) && currentUiData.question_lines.length > 0 ? (
                    <div className={styles.textMysteryLines}>
                      {currentUiData.question_lines.map((line, idx) => (
                        <p key={`mystery-line-${idx}`} className={styles.textMysteryLine}>{String(line)}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

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
                    placeholder={String(currentUiData?.placeholder || 'Votre reponse')}
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
          <section className={styles.timerCard}>
            <h3 className={styles.timerTitle}>Chronomètre</h3>

            <div className={styles.timerRingContainer}>
              <div
                className={styles.timerRing}
                style={{
                  background: `conic-gradient(#0ea5e9 ${(100 - (timerSeconds / (Number(runtimePayload?.config?.timer?.duration_seconds || 300)) * 100))}deg, rgba(148, 163, 184, 0.25) ${(100 - (timerSeconds / (Number(runtimePayload?.config?.timer?.duration_seconds || 300)) * 100))}deg)`
                }}
              >
                <div className={styles.timerDisplay}>
                  <div className={styles.timerTime}>{timerLabel}</div>
                  <div className={styles.timerState}>{state?.status ? 'En cours' : 'Attente'}</div>
                </div>
              </div>
            </div>

            {isFacilitator ? (
              <div className={styles.timerActionsGroup}>
                <button
                  className={styles.timerBtnStart}
                  type="button"
                  onClick={() => handleTimerAction('start')}
                  disabled={!!busyAction}
                >
                  ▶️ Démarrer
                </button>
                <button
                  className={styles.timerBtnPauseResume}
                  type="button"
                  onClick={() => handleTimerAction('pause')}
                  disabled={!!busyAction}
                >
                  ⏸️ Pause
                </button>
                <button
                  className={styles.timerBtnStop}
                  type="button"
                  onClick={() => handleTimerAction('reset')}
                  disabled={!!busyAction}
                >
                  ⏹️ Réinitialiser
                </button>
              </div>
            ) : (
              <p style={{ margin: '0', fontSize: '0.8rem', color: '#7dd3fc', textAlign: 'center' }}>
                ⏳ Géré par le facilitateur
              </p>
            )}
          </section>

          <h3>Panneau équipe</h3>
          <p>
            Réponses reçues: <strong>{Number(state.submission_status?.responded || 0)}</strong> /
            <strong> {Number(state.submission_status?.total || 0)}</strong>
          </p>
          <p>Tentatives: {Number(state.attempts_on_current || 0)} / {Number(state.max_attempts || 0)}</p>
          <p>Rôle: {isFacilitator ? 'Facilitateur' : 'Participant'}</p>

          <div className={styles.teamProgressTrack}>
            <div className={styles.teamProgressFill} style={{ width: `${responseProgress}%` }} />
          </div>

          <section className={styles.teamList}>
            {participantRows.length === 0 ? (
              <p className={styles.teamEmpty}>Liste participants indisponible.</p>
            ) : participantRows.map((row) => (
              <div key={String(row.id || row.name)} className={styles.teamRow}>
                <span>{row.name}</span>
                <span className={row.responded ? styles.teamStatusOk : styles.teamStatusPending}>
                  {row.responded ? 'repondu' : 'en attente'}
                </span>
              </div>
            ))}
          </section>

          {chatEnabled ? (
            <section className={styles.chatPanel}>
              <h4>Chat equipe</h4>
              <div className={styles.chatLog}>
                {chatMessages.length === 0 ? (
                  <p className={styles.teamEmpty}>Aucun message pour le moment.</p>
                ) : chatMessages.map((message) => {
                  const mine = String(message.author || '') === displayName;
                  return (
                    <div key={message.id} className={`${styles.chatRow}${mine ? ` ${styles.chatRowMine}` : ''}`}>
                      <span className={styles.chatAuthor}>{message.author}</span>
                      <p className={styles.chatText}>{message.text}</p>
                    </div>
                  );
                })}
              </div>
              <form className={styles.chatForm} onSubmit={submitChat}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  className={styles.chatInput}
                  placeholder="Message equipe"
                  maxLength={240}
                />
                <button type="submit" className={styles.primaryBtn} disabled={!chatInput.trim()}>
                  Envoyer
                </button>
              </form>
              {realtimeError ? <p className={styles.feedback}>{realtimeError}</p> : null}
            </section>
          ) : null}

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

          {isFacilitator ? (
            <details className={styles.debugWrap}>
              <summary>Runtime debug</summary>
              <pre className={styles.debug}>{JSON.stringify(state, null, 2)}</pre>
            </details>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
