'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getApiUrl, normalizeBackendAssetUrl } from '@/lib/config';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getEscapeRoomRulesPreset } from '@/lib/challenges/escapeRoomRules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeHeader from '../ChallengeHeader';
import useI18n from '@/lib/i18n/useI18n';
import styles from './EscapeRoom.module.css';

const OUTCOME_UI = {
  waiting: {
    tone: 'Info',
    feedback: 'En attente: tous les participants doivent soumettre avant validation.',
    title: 'Validation en attente',
    detail: 'L equipe n a pas encore fini de repondre.',
    durationMs: 1200,
    blockProgression: false,
  },
  divergent: {
    tone: 'Warning',
     feedback: 'Reponses divergentes: coordinez-vous via le chat. Le facilitateur passera a l enigme suivante.',
    title: 'Reponses divergentes',
    detail: 'Les reponses ne sont pas identiques dans l equipe.',
    durationMs: 1800,
     blockProgression: true,
  },
  wrong: {
    tone: 'Danger',
    feedback: 'Reponse incorrecte. Reessayez avec une proposition commune.',
    title: 'Reponse incorrecte',
    detail: 'La reponse commune ne correspond pas a la solution attendue.',
    durationMs: 1800,
    blockProgression: false,
  },
  correct: {
    tone: 'Success',
    feedback: 'Enigme validee. Passage a la suivante...',
    title: 'Enigme reussie',
    detail: 'Excellent travail d equipe. Preparation de la prochaine enigme.',
    durationMs: 2000,
    blockProgression: true,
  },
  escaped: {
    tone: 'Success',
    feedback: 'Salle deverrouillee. Bravo, mission accomplie.',
    title: 'Salle deverrouillee',
    detail: 'Toutes les enigmes ont ete resolues.',
    durationMs: 2200,
    blockProgression: false,
  },
  max_attempts: {
    tone: 'Danger',
    feedback: 'Nombre maximal de tentatives atteint pour cette enigme.',
    title: 'Limite de tentatives atteinte',
    detail: 'Demandez un indice ou passez a l enigme suivante.',
    durationMs: 2200,
    blockProgression: true,
  },
  already_finished: {
    tone: 'Info',
    feedback: 'La partie est deja terminee.',
    title: 'Partie terminee',
    detail: 'Aucune action supplementaire n est necessaire.',
    durationMs: 1200,
    blockProgression: false,
  },
  enigme_not_found: {
    tone: 'Danger',
    feedback: 'Enigme introuvable. Rechargez la vue et reessayez.',
    title: 'Enigme introuvable',
    detail: 'La synchronisation a echoue entre client et serveur.',
    durationMs: 2000,
    blockProgression: false,
  },
};

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatValidationFeedback(validation = {}) {
  const outcome = String(validation?.outcome || '').trim();
  const preset = OUTCOME_UI[outcome];

  if (!preset) {
    return {
      feedback: outcome ? `Validation: ${outcome}` : 'Reponse envoyee.',
      verdict: null,
      holdBeforeRefreshMs: 0,
      blockProgression: false,
    };
  }

  let detail = preset.detail;
  if (outcome === 'waiting') {
    const responded = Number(validation?.responded || 0);
    const total = Number(validation?.total || 0);
    if (total > 0) {
      detail = `Progression equipe: ${responded}/${total} reponses.`;
    }
  }
  if (outcome === 'divergent' || outcome === 'wrong' || outcome === 'max_attempts') {
    const attempts = Number(validation?.attempts || 0);
    const maxAttempts = Number(validation?.max_attempts || 0);
    if (attempts > 0 && maxAttempts > 0) {
      detail = `${detail} Tentative ${attempts}/${maxAttempts}.`;
    }
  }

  return {
    feedback: preset.feedback,
    verdict: {
      tone: preset.tone,
      title: preset.title,
      detail,
    },
    holdBeforeRefreshMs: Number(preset.durationMs || 0),
    blockProgression: Boolean(preset.blockProgression),
  };
}

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
  const { locale } = useI18n();
  const rulesPreset = useMemo(() => getEscapeRoomRulesPreset(locale), [locale]);
  const [state, setState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [answer, setAnswer] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);
  const completionGuardRef = useRef('');
  const stateRequestIdRef = useRef(0);
  const appliedStateRequestIdRef = useRef(0);
  const inFlightStateRef = useRef(null);
  const verdictTimeoutRef = useRef(null);

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
        cache: 'no-store',
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

    if (inFlightStateRef.current) {
      return inFlightStateRef.current;
    }

    const requestId = stateRequestIdRef.current + 1;
    stateRequestIdRef.current = requestId;

    const requestPromise = apiCall('/state', { method: 'GET' })
      .then((payload) => {
        if (requestId < appliedStateRequestIdRef.current) {
          return payload;
        }
        appliedStateRequestIdRef.current = requestId;
        setState(payload);
        return payload;
      })
      .finally(() => {
        inFlightStateRef.current = null;
      });

    inFlightStateRef.current = requestPromise;
    return requestPromise;
  }, [apiCall, endpointBase, token]);

  const loadParticipants = useCallback(async () => {
    if (!endpointBase || !token) return;
    try {
      const payload = await apiCall('/participants', { method: 'GET' });
      const rows = Array.isArray(payload?.participants)
        ? payload.participants
        : Array.isArray(payload)
          ? payload
          : [];
      setParticipants(rows);
    } catch {
      setParticipants([]);
    }
  }, [apiCall, endpointBase, token]);

  useEffect(() => {
    loadParticipants().catch(() => {});
  }, [loadParticipants]);

  useEffect(() => {
    return () => {
      if (verdictTimeoutRef.current) {
        window.clearTimeout(verdictTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!endpointBase || !token) return () => {};
    const poll = window.setInterval(() => {
      loadState().catch(() => {
        // Keep polling silent to avoid noisy UI.
      });
    }, 3000);

    return () => {
      window.clearInterval(poll);
    };
  }, [endpointBase, token, loadState]);

  const { emitEvent, error: realtimeError } = useRealtimeChallenge({ runtimePayload, socket, context });

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    const userId = String(context?.userId || context?.participantId || '').trim();
    return `participant-${userId || 'unknown'}`;
  }, [runtimePayload, context]);

  const currentParticipantId = useMemo(() => {
    const raw = context?.userId || context?.participantId || runtimePayload?.context?.participantId || '';
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  }, [context, runtimePayload]);

  const chatEnabled = runtimePayload?.config?.chat?.enabled !== false && Boolean(socket);

  const {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
    sendQuickChat,
  } = useChallengeChat({
    socket,
    emitEvent,
    author: displayName,
    enabled: chatEnabled,
    maxMessages: 80,
    maxLength: 240,
  });

  const currentEnigme = state?.current_enigme || null;
  const currentUiType = String(currentEnigme?.ui_type || '').toLowerCase();
  const currentUiData = currentEnigme?.ui_data && typeof currentEnigme.ui_data === 'object'
    ? currentEnigme.ui_data
    : {};
  const currentEnigmeLabel = String(currentEnigme?.label || '').toLowerCase();
  const isGridEnigme = currentUiType === 'grid_3x3' && Array.isArray(currentUiData?.grid);
  const isFirstGridEnigme = isGridEnigme && (String(currentEnigme?.id || '').toLowerCase() === 'e1' || currentEnigmeLabel.includes('code mural'));
  const anagramLetters = Array.isArray(currentUiData?.letters)
    ? currentUiData.letters.map((letter) => String(letter || '').trim()).filter(Boolean)
    : [];
  const anagramAnswerLength = Number.parseInt(currentUiData?.answer_length, 10);
  const safeAnagramLength = Number.isInteger(anagramAnswerLength) && anagramAnswerLength > 0
    ? anagramAnswerLength
    : anagramLetters.length;

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

      if (verdictTimeoutRef.current) {
        window.clearTimeout(verdictTimeoutRef.current);
        verdictTimeoutRef.current = null;
      }

      const validationFeedback = formatValidationFeedback(payload?.validation || {});
      setFeedback(validationFeedback.feedback);

      if (validationFeedback.verdict) {
        setVerdict(validationFeedback.verdict);
        verdictTimeoutRef.current = window.setTimeout(() => {
          setVerdict(null);
          verdictTimeoutRef.current = null;
        }, validationFeedback.holdBeforeRefreshMs + 300);
      }

      if (validationFeedback.blockProgression && validationFeedback.holdBeforeRefreshMs > 0) {
        await wait(validationFeedback.holdBeforeRefreshMs);
      }

        const outcome = String(payload?.validation?.outcome || '').trim();
        const shouldKeepAnswer = outcome === 'divergent' || outcome === 'wrong' || outcome === 'max_attempts';
        if (!shouldKeepAnswer) {
          setAnswer('');
        }
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
  const hasCurrentParticipantResponded = currentParticipantId != null && respondedSet.has(currentParticipantId);

  const timerSeconds = Number(state?.timer?.duration_seconds || 0);
  const enigmeImageSrc = normalizeBackendAssetUrl(String(currentEnigme?.image?.src || '').trim());
  const challengeStatus = String(state?.status || '').trim();
  const hasChallengeStarted = challengeStatus !== 'waiting_for_start';
  const rulesContent = useMemo(() => ({
    objective: rulesPreset.objective,
    facilitator: [...rulesPreset.facilitator],
    participant: [...rulesPreset.participant, ...rulesPreset.scoring],
    footnote: rulesPreset.footnote,
  }), [rulesPreset]);
  const challengeName = String(rulesPreset?.challengeName || 'Salle Secrète').trim();
  const challengeSubtitle = String(rulesPreset?.subtitle || '').trim();
  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset.participants.min,
    recommended: rulesPreset.participants.recommended,
    max: rulesPreset.participants.max,
  }), [rulesPreset]);
  const canStartTimer = isFacilitator && challengeStatus === 'waiting_for_start' && !busyAction;
  const isTimerRunning = challengeStatus === 'in_progress';

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

  const finishedStatuses = useMemo(
    () => new Set(['completed', 'success', 'succeeded', 'timeout', 'timed_out', 'failed']),
    []
  );
  const isFinished = finishedStatuses.has(challengeStatus);
  const issueToneClass = isFinished ? styles.issueStatusFinished : styles.issueStatusWaiting;
  const shouldUseFastPolling = Boolean(
    !isFacilitator
    && currentEnigme
    && !isFinished
    && hasCurrentParticipantResponded
    && totalExpected > 0
    && totalResponded < totalExpected
  );

  useEffect(() => {
    setImageBroken(false);
  }, [currentEnigme?.id, enigmeImageSrc]);

  useEffect(() => {
    if (!shouldUseFastPolling) {
      return () => {};
    }

    const fastPoll = window.setInterval(() => {
      loadState().catch(() => {
        // Silent refresh while this participant waits for collective completion.
      });
    }, 700);

    return () => {
      window.clearInterval(fastPoll);
    };
  }, [loadState, shouldUseFastPolling]);

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
      runAction('start', async () => {
        await apiCall('/start', { method: 'POST' });
      });
      return;
    }
    setFeedback('Pause/Reinitialisation du chrono non disponibles pour Salle secrète (MVP actuel).');
  }, [apiCall, runAction]);

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
      <ChallengeHeader
        title={challengeName}
        subtitle={challengeSubtitle || 'Résolvez les énigmes en équipe, avec validation collective'}
        className={styles.escapeHeader}
      />

      <section className={styles.layout}>
        <article className={`${styles.card} ${styles.mainCard}`}>
          {!hasChallengeStarted ? (
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName={challengeName}
              objective={rulesContent.objective}
              participantsMeta={rulesParticipantsMeta}
              facilitatorRules={rulesContent.facilitator}
              participantRules={rulesContent.participant}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? () => handleTimerAction('start') : null}
              startDisabled={isFacilitator ? !canStartTimer : false}
            />
          ) : isFinished ? (
            <>
              <h2>Partie terminée</h2>
              <p className={styles.issueRow}>
                <span className={styles.issueLabel}>Issue:</span>{' '}
                <strong className={issueToneClass}>{state.status}</strong>
              </p>
              <p>Début: {state.started_at || '-'}</p>
              <p>Fin: {state.finished_at || '-'}</p>
            </>
          ) : (
            <>
              <div className={styles.enigmeHero}>
                <div>
                  <p className={styles.enigmeEyebrow}>Énigme active</p>
                  <h2>{currentEnigme?.label || 'Énigme en attente'}</h2>
                </div>
                <div className={styles.enigmeMetaChips}>
                  <span className={styles.enigmeMetaChip}>Validation collective</span>
                  <span className={styles.enigmeMetaChip}>{totalResponded}/{Math.max(totalExpected, 0)} réponses</span>
                </div>
              </div>
              {enigmeImageSrc && !imageBroken ? (
                <Image
                  className={styles.image}
                  src={enigmeImageSrc}
                  alt={currentEnigme.label || 'Enigme'}
                  unoptimized
                  width={1200}
                  height={800}
                  loading="lazy"
                  onError={() => {
                    setImageBroken(true);
                  }}
                />
              ) : null}
              {enigmeImageSrc && imageBroken ? (
                <p className={styles.imageFallbackNote}>Image indisponible pour cette énigme.</p>
              ) : null}
              <p className={styles.description}>{currentEnigme?.description || 'Aucune description.'}</p>

              {isGridEnigme ? (
                <div className={`${styles.enigmeUiBlock}${isFirstGridEnigme ? ` ${styles.enigmeUiBlockFeatured}` : ''}`}>
                  <div className={styles.enigmeUiHeader}>
                    <p className={styles.enigmeUiTitle}>Grille de l'énigme</p>
                    {isFirstGridEnigme ? <span className={styles.enigmeUiTag}>Logique visuelle</span> : null}
                  </div>
                  {isFirstGridEnigme ? <p className={styles.enigmeUiInstruction}>Repérez la logique entre lignes et colonnes, puis complétez la case manquante.</p> : null}
                  <div className={`${styles.matrixGrid}${isFirstGridEnigme ? ` ${styles.matrixGridFeatured}` : ''}`}>
                    {currentUiData.grid.flat().map((cell, idx) => {
                      const isMystery = String(cell) === '?';
                      return (
                        <div
                          key={`grid-cell-${idx}`}
                          className={`${styles.matrixCell}${isMystery ? ` ${styles.matrixCellMystery}` : ''}${isFirstGridEnigme ? ` ${styles.matrixCellFeatured}` : ''}`}
                        >
                          {isMystery ? (
                            <span className={styles.mysteryMark} aria-label="Case à trouver">?</span>
                          ) : (
                            <span className={styles.cellValue}>{cell == null ? '-' : String(cell)}</span>
                          )}
                        </div>
                      );
                    })}
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

              {currentUiType === 'word_anagram' ? (
                <div className={styles.enigmeUiBlock}>
                  <p className={styles.enigmeUiTitle}>{currentUiData?.title || 'Anagramme'}</p>
                  <p className={styles.enigmeUiInstruction}>
                    Réorganisez les lettres ci-dessous pour former un mot de {safeAnagramLength} lettres.
                  </p>
                  <div className={styles.anagramLettersWrap}>
                    {anagramLetters.length === 0 ? (
                      <p className={styles.teamEmpty}>Lettres indisponibles pour cette énigme.</p>
                    ) : anagramLetters.map((letter, idx) => (
                      <span key={`anagram-letter-${idx}-${letter}`} className={styles.anagramLetterChip}>
                        {letter}
                      </span>
                    ))}
                  </div>
                  {safeAnagramLength > 0 ? (
                    <div className={styles.anagramSlots}>
                      {Array.from({ length: safeAnagramLength }).map((_, idx) => (
                        <span key={`anagram-slot-${idx}`} className={styles.anagramSlot} aria-hidden="true" />
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
                <div className={styles.answerPanel}>
                  <div className={styles.answerPanelHeader}>
                    <p className={styles.answerPanelTitle}>🔑 Votre proposition</p>
                    <span className={styles.answerPanelHint}>Visible uniquement par vous jusqu'à validation collective</span>
                  </div>
                  {hasCurrentParticipantResponded ? (
                    <div className={styles.answeredBanner}>
                      <span>✅ Réponse envoyée — en attente des autres membres</span>
                      <div className={styles.answeredProgress}>
                        <span className={styles.answeredProgressFill} style={{ width: `${responseProgress}%` }} />
                      </div>
                      <span className={styles.answeredProgressLabel}>{totalResponded}/{totalExpected} réponses reçues</span>
                    </div>
                  ) : (
                    <div className={styles.answerRow}>
                      <input
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value.toUpperCase())}
                        placeholder={String(currentUiData?.placeholder || 'VOTRE RÉPONSE').toUpperCase()}
                        className={styles.input}
                        disabled={busyAction === 'submit' || !currentEnigme || Boolean(verdict) || verdict?.tone === 'Warning' || verdict?.tone === 'Danger'}
                        autoComplete="off"
                        spellCheck={false}
                        onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) submitAnswer(); }}
                      />
                      <button
                        onClick={submitAnswer}
                        disabled={busyAction === 'submit' || !answer.trim() || !currentEnigme || Boolean(verdict) || verdict?.tone === 'Warning' || verdict?.tone === 'Danger'}
                        className={styles.primaryBtn}
                        type="button"
                      >
                        {busyAction === 'submit' ? '⏳' : '✓ Soumettre'}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </article>

        <aside className={`${styles.card} ${styles.sidePanel}`}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName={challengeName}
            objective={rulesContent.objective}
            participantsMeta={rulesParticipantsMeta}
            facilitatorRules={rulesContent.facilitator}
            participantRules={rulesContent.participant}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={timerSeconds}
            durationSeconds={Number(runtimePayload?.config?.timer?.duration_seconds || 300)}
            status={isTimerRunning ? 'running' : 'idle'}
            isFacilitator={isFacilitator}
            waitingText=""
            footer={isFacilitator && !isFinished && currentEnigme ? (
              <div className={styles.timerQuickActions}>
                <button
                  className={styles.secondaryBtn}
                  disabled={!!busyAction}
                  onClick={() => facilitatorAction('hint', '/hint', { enigme_id: currentEnigme.id })}
                >
                  Debloquer indice
                </button>
                <button
                  className={styles.secondaryBtn}
                  disabled={!!busyAction}
                  onClick={() => facilitatorAction('skip', '/skip')}
                >
                  Passer l'enigme
                </button>
              </div>
            ) : null}
          />

          {chatEnabled ? (
            <>
              <ChallengeChatCard
                title="Chat"
                messages={chatMessages}
                currentAuthor={displayName}
                inputValue={chatInput}
                onInputChange={setChatInput}
                onSubmit={submitChat}
                quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
                onQuickMessage={sendQuickChat}
                emptyText="Aucun message pour le moment."
                placeholder="Message equipe"
                maxLength={240}
              />
              {realtimeError ? <p className={styles.feedback}>{realtimeError}</p> : null}
            </>
          ) : null}

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

          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

        </aside>
      </section>

      {verdict ? (
        <div className={styles.verdictOverlay} role="status" aria-live="polite" aria-atomic="true">
          <div className={`${styles.verdictCard} ${styles[`verdict${verdict.tone}`]}`}>
            <p className={styles.verdictTitle}>{verdict.title}</p>
            <p className={styles.verdictDetail}>{verdict.detail}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
