'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { buildBackendAssetCandidates, getApiUrl } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
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

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function applyTemplate(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? `{${key}}`));
}

function formatValidationFeedback(validation = {}, outcomeUi = {}, copy = {}) {
  const outcome = String(validation?.outcome || '').trim();
  const preset = outcomeUi[outcome];

  if (!preset) {
    return {
      feedback: outcome ? `Validation: ${outcome}` : copy.answerSubmittedFallback,
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
      detail = applyTemplate(copy.teamProgressDetail, { responded, total });
    }
  }
  if (outcome === 'divergent' || outcome === 'wrong' || outcome === 'max_attempts') {
    const attempts = Number(validation?.attempts || 0);
    const maxAttempts = Number(validation?.max_attempts || 0);
    if (attempts > 0 && maxAttempts > 0) {
      detail = `${detail} ${applyTemplate(copy.attemptSuffix, { attempts, maxAttempts })}`;
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
  const isEn = locale === 'en';
  const copy = useMemo(() => (isEn ? {
    apiError: 'API error ({status})',
    actionUnavailable: 'Action is currently unavailable.',
    timerUnsupported: 'Pause/reset are not available for Secret Room (current MVP).',
    loadingRoom: 'Loading room...',
    missingParams: 'Missing parameters',
    missingParamsDetail: 'sessionId or challengeId is missing.',
    challengeEnded: 'Game finished',
    issue: 'Outcome:',
    start: 'Start:',
    end: 'End:',
    pendingRiddle: 'Riddle pending',
    riddleCounter: 'Riddle {current}/{total}',
    riddleCounterFallback: 'Riddle -/-',
    responsesCounter: '{responded}/{total} answers',
    imageUnavailable: 'Image unavailable for this riddle.',
    imageFallbackTitle: 'Visual unavailable',
    imageFallbackBody: 'Continue by solving the text clues while the image cannot be loaded.',
    noDescription: 'No description.',
    textRiddleTitle: 'Text riddle',
    wordCodeTitle: 'Word code',
    wordCodeInstruction: 'Find the logic and provide the correct value.',
    puzzleHint: 'Hint:',
    answerTitle: 'Your proposal',
    answerVisibility: 'Visible only to you until collective validation',
    answerSent: 'Answer sent. You can edit and submit again.',
    answersReceived: '{responded}/{total} answers received',
    answerPlaceholder: 'YOUR ANSWER',
    submit: 'Submit',
    timerTitle: 'Timer',
    unlockHint: 'Unlock a hint',
    skipRiddle: 'Skip the riddle',
    chatTitle: 'Chat',
    chatEmpty: 'No messages yet.',
    chatPlaceholder: 'Team message',
    participantListUnavailable: 'Participant list unavailable.',
    responded: 'responded',
    waiting: 'waiting',
    subtitleFallback: 'Solve riddles as a team with collective validation',
    answerSubmittedFallback: 'Answer sent.',
    teamProgressDetail: 'Team progress: {responded}/{total} answers.',
    attemptSuffix: 'Attempt {attempts}/{maxAttempts}.',
    outcomeUi: {
      waiting: {
        tone: 'Info',
        feedback: 'Waiting: all participants must submit before validation.',
        title: 'Validation pending',
        detail: 'The team has not finished answering yet.',
        durationMs: 1200,
        blockProgression: false,
      },
      divergent: {
        tone: 'Warning',
        feedback: 'Team answers are not aligned yet. Discuss, then submit a new answer.',
        title: 'Divergent answers',
        detail: 'Answers are not identical within the team.',
        durationMs: 2000,
        blockProgression: false,
      },
      wrong: {
        tone: 'Danger',
        feedback: 'Incorrect answer. Try again with one shared proposal.',
        title: 'Incorrect answer',
        detail: 'The shared answer does not match the expected solution.',
        durationMs: 1800,
        blockProgression: false,
      },
      correct: {
        tone: 'Success',
        feedback: 'Riddle validated. Moving to the next one...',
        title: 'Riddle solved',
        detail: 'Great teamwork. Preparing the next riddle.',
        durationMs: 2000,
        blockProgression: true,
      },
      escaped: {
        tone: 'Success',
        feedback: 'Room unlocked. Great job, mission accomplished!',
        title: 'Room unlocked',
        detail: 'All riddles have been solved.',
        durationMs: 2200,
        blockProgression: false,
      },
      max_attempts: {
        tone: 'Danger',
        feedback: 'Maximum attempts reached for this riddle.',
        title: 'Attempt limit reached',
        detail: 'Ask for a hint or wait for the facilitator to skip it.',
        durationMs: 2200,
        blockProgression: true,
      },
      already_finished: {
        tone: 'Info',
        feedback: 'The game is already finished.',
        title: 'Game finished',
        detail: 'No further action is required.',
        durationMs: 1200,
        blockProgression: false,
      },
      enigme_not_found: {
        tone: 'Danger',
        feedback: 'Riddle not found. Reload and try again.',
        title: 'Riddle not found',
        detail: 'Client/server synchronization failed.',
        durationMs: 2000,
        blockProgression: false,
      },
    },
  } : {
    apiError: 'Erreur API ({status})',
    actionUnavailable: 'Action impossible pour le moment.',
    timerUnsupported: 'Pause/Reinitialisation du chrono non disponibles pour Salle secrete (MVP actuel).',
    loadingRoom: 'Chargement de la salle...',
    missingParams: 'Parametres manquants',
    missingParamsDetail: 'sessionId ou challengeId est absent.',
    challengeEnded: 'Partie terminee',
    issue: 'Issue:',
    start: 'Debut:',
    end: 'Fin:',
    pendingRiddle: 'Enigme en attente',
    riddleCounter: 'Enigme {current}/{total}',
    riddleCounterFallback: 'Enigme -/-',
    responsesCounter: '{responded}/{total} reponses',
    imageUnavailable: 'Image indisponible pour cette enigme.',
    imageFallbackTitle: 'Visuel indisponible',
    imageFallbackBody: 'Continuez avec les indices textuels pendant le chargement du visuel.',
    noDescription: 'Aucune description.',
    textRiddleTitle: 'Enigme texte',
    wordCodeTitle: 'Code de mots',
    wordCodeInstruction: 'Identifiez la logique et donnez la valeur correcte.',
    puzzleHint: 'Indice:',
    answerTitle: 'Votre proposition',
    answerVisibility: 'Visible uniquement par vous jusqu\'a validation collective',
    answerSent: 'Reponse envoyee. Vous pouvez la modifier et soumettre de nouveau.',
    answersReceived: '{responded}/{total} reponses recues',
    answerPlaceholder: 'VOTRE REPONSE',
    submit: 'Soumettre',
    timerTitle: 'Chrono',
    unlockHint: 'Débloquer un indice',
    skipRiddle: 'Passer l\'énigme',
    chatTitle: 'Chat',
    chatEmpty: 'Aucun message pour le moment.',
    chatPlaceholder: 'Message equipe',
    participantListUnavailable: 'Liste participants indisponible.',
    responded: 'repondu',
    waiting: 'en attente',
    subtitleFallback: 'Resolvez les enigmes en equipe, avec validation collective',
    answerSubmittedFallback: 'Reponse envoyee.',
    teamProgressDetail: 'Progression equipe: {responded}/{total} reponses.',
    attemptSuffix: 'Tentative {attempts}/{maxAttempts}.',
    outcomeUi: {
      waiting: {
        tone: 'Info',
        feedback: 'En attente: tous les participants doivent soumettre avant validation.',
        title: 'Validation en attente',
        detail: 'L\'equipe n\'a pas encore fini de repondre.',
        durationMs: 1200,
        blockProgression: false,
      },
      divergent: {
        tone: 'Warning',
        feedback: 'Les reponses de l\'equipe ne sont pas encore alignees. Discutez ensemble puis soumettez une nouvelle reponse.',
        title: 'Reponses divergentes',
        detail: 'Les reponses ne sont pas identiques dans l\'equipe.',
        durationMs: 2000,
        blockProgression: false,
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
        detail: 'Excellent travail d\'equipe. Preparation de la prochaine enigme.',
        durationMs: 2000,
        blockProgression: true,
      },
      escaped: {
        tone: 'Success',
        feedback: 'Salle deverrouillee. Bravo, mission accomplie!',
        title: 'Salle deverrouillee',
        detail: 'Toutes les enigmes ont ete resolues.',
        durationMs: 2200,
        blockProgression: false,
      },
      max_attempts: {
        tone: 'Danger',
        feedback: 'Nombre maximal de tentatives atteint pour cette enigme.',
        title: 'Limite de tentatives atteinte',
        detail: 'Demandez un indice ou attendez que le facilitateur passe a la suivante.',
        durationMs: 2200,
        blockProgression: true,
      },
      already_finished: {
        tone: 'Info',
        feedback: 'La partie est deja terminee.',
        title: 'Partie terminee',
        detail: 'Aucune action supplementaire n\'est necessaire.',
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
    },
  }), [isEn]);
  const rulesPreset = useMemo(() => getEscapeRoomRulesPreset(locale), [locale]);
  const [state, setState] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [answer, setAnswer] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);
  const [imageCandidateIndex, setImageCandidateIndex] = useState(0);
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
          ...getAuthHeaders({
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          }),
        },
        credentials: 'include',
      });

      const body = await response.text();
      let payload = {};
      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.error || applyTemplate(copy.apiError, { status: response.status }));
      }

      return payload;
    },
    [copy.apiError, endpointBase]
  );

  const loadState = useCallback(async () => {
    if (!endpointBase) return;

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
  }, [apiCall, endpointBase]);

  const loadParticipants = useCallback(async () => {
    if (!endpointBase) return;
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
  }, [apiCall, endpointBase]);

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
    if (!endpointBase) return () => {};
    const poll = window.setInterval(() => {
      loadState().catch(() => {
        // Keep polling silent to avoid noisy UI.
      });
    }, 3000);

    return () => {
      window.clearInterval(poll);
    };
  }, [endpointBase, loadState]);

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
  const wordCodeRows = useMemo(() => {
    if (currentUiType !== 'text_mystery') {
      return [];
    }

    const knownAnimals = {
      girafe: { icon: '🦒', badgeTone: 'amber' },
      giraffe: { icon: '🦒', badgeTone: 'amber' },
      elephant: { icon: '🐘', badgeTone: 'azure' },
      hippopotame: { icon: '🦛', badgeTone: 'mint' },
      hippopotamus: { icon: '🦛', badgeTone: 'mint' },
      lion: { icon: '🦁', badgeTone: 'gold' },
    };

    const rows = Array.isArray(currentUiData?.question_lines) ? currentUiData.question_lines : [];
    return rows
      .map((line) => {
        const safeLine = String(line || '').trim();
        const match = safeLine.match(/^([^=]+)=\s*(.+)$/);
        if (!match) {
          return null;
        }

        const rawAnimal = String(match[1] || '').trim();
        const answerValue = String(match[2] || '').trim();
        const key = rawAnimal
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const animal = knownAnimals[key];
        if (!animal) {
          return null;
        }

        return {
          key,
          rawAnimal,
          answerValue,
          icon: animal.icon,
          badgeTone: animal.badgeTone,
          isQuestion: answerValue.includes('?'),
        };
      })
      .filter(Boolean);
  }, [currentUiData, currentUiType]);

  const runAction = useCallback(
    async (actionKey, runner) => {
      setBusyAction(actionKey);
      setFeedback('');
      try {
        await runner();
        await loadState();
        await loadParticipants();
      } catch (err) {
        setFeedback(err.message || copy.actionUnavailable);
      } finally {
        setBusyAction('');
      }
    },
    [copy.actionUnavailable, loadParticipants, loadState]
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

      const validationFeedback = formatValidationFeedback(payload?.validation || {}, copy.outcomeUi, copy);
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
  const configuredCurrentEnigme = useMemo(() => {
    const configuredEnigmes = Array.isArray(runtimePayload?.config?.enigmes)
      ? runtimePayload.config.enigmes
      : [];

    if (configuredEnigmes.length === 0) {
      return null;
    }

    const currentIndex = Number(state?.current_enigme_index);
    if (Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < configuredEnigmes.length) {
      return configuredEnigmes[currentIndex] || null;
    }

    const currentId = String(currentEnigme?.id || '').trim().toLowerCase();
    if (!currentId) {
      return null;
    }

    return configuredEnigmes.find((enigme) => String(enigme?.id || '').trim().toLowerCase() === currentId) || null;
  }, [runtimePayload, state?.current_enigme_index, currentEnigme?.id]);
  const rawEnigmeImageSrc = String(
    currentEnigme?.image?.src
    || currentEnigme?.image?.url
    || currentEnigme?.image_url
    || currentEnigme?.imageSrc
    || currentEnigme?.ui_data?.image?.src
    || currentEnigme?.ui_data?.image_url
    || configuredCurrentEnigme?.image?.src
    || configuredCurrentEnigme?.image?.url
    || configuredCurrentEnigme?.image_url
    || configuredCurrentEnigme?.imageSrc
    || configuredCurrentEnigme?.ui_data?.image?.src
    || configuredCurrentEnigme?.ui_data?.image_url
    || ''
  ).trim();
  const enigmeImageCandidates = useMemo(
    () => buildBackendAssetCandidates(rawEnigmeImageSrc),
    [rawEnigmeImageSrc]
  );
  const enigmeImageSrc = enigmeImageCandidates[imageCandidateIndex] || '';
  const challengeStatus = String(state?.status || '').trim();
  const hasChallengeStarted = challengeStatus !== 'waiting_for_start';
  const rulesContent = useMemo(() => ({
    objective: rulesPreset.objective,
    facilitator: [...rulesPreset.facilitator],
    participant: [...rulesPreset.participant, ...rulesPreset.scoring],
    footnote: rulesPreset.footnote,
  }), [rulesPreset]);
  const challengeName = String(rulesPreset?.challengeName || (isEn ? 'Secret Room' : 'Salle secrete')).trim();
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
    setImageCandidateIndex(0);
  }, [currentEnigme?.id, rawEnigmeImageSrc]);

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
    setFeedback(copy.timerUnsupported);
  }, [apiCall, copy.timerUnsupported, runAction]);

  if (!endpointBase) {
    return (
      <div className={styles.escapeRoomContainer}>
        <div className={styles.card}>
          <h2>{copy.missingParams}</h2>
          <p>{copy.missingParamsDetail}</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.escapeRoomContainer}>
        <div className={styles.card}>
          <h2>{copy.loadingRoom}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.escapeRoomContainer}>
      <ChallengeHeader
        title={challengeName}
        subtitle={challengeSubtitle || copy.subtitleFallback}
        className={styles.escapeHeader}
      />

      <div className="challenge-mobile-timer">
        <ChallengeTimerCard
          title={copy.timerTitle}
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
                {copy.unlockHint}
              </button>
              <button
                className={styles.secondaryBtn}
                disabled={!!busyAction}
                onClick={() => facilitatorAction('skip', '/skip')}
              >
                {copy.skipRiddle}
              </button>
            </div>
          ) : null}
        />
      </div>

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
              <h2>{copy.challengeEnded}</h2>
              <p className={styles.issueRow}>
                <span className={styles.issueLabel}>{copy.issue}</span>{' '}
                <strong className={issueToneClass}>{state.status}</strong>
              </p>
              <p>{copy.start} {state.started_at || '-'}</p>
              <p>{copy.end} {state.finished_at || '-'}</p>
            </>
          ) : (
            <>
              <div className={styles.enigmeHero}>
                <div>
                  <h2>{currentEnigme?.label || copy.pendingRiddle}</h2>
                  <p className={styles.enigmeContextLine}>
                    {state.total_enigmes > 0
                      ? applyTemplate(copy.riddleCounter, { current: (state.current_enigme_index ?? 0) + 1, total: state.total_enigmes })
                      : copy.riddleCounterFallback}
                    {' • '}
                    {applyTemplate(copy.responsesCounter, { responded: totalResponded, total: Math.max(totalExpected, 0) })}
                  </p>
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
                    setImageCandidateIndex((prev) => {
                      const next = prev + 1;
                      if (next < enigmeImageCandidates.length) {
                        return next;
                      }
                      setImageBroken(true);
                      return prev;
                    });
                  }}
                />
              ) : null}
              {enigmeImageSrc && imageBroken ? (
                <p className={styles.imageFallbackNote}>{copy.imageUnavailable}</p>
              ) : null}
              {!enigmeImageSrc || imageBroken ? (
                <div className={styles.imageFallbackCard} role="img" aria-label={copy.imageFallbackTitle}>
                  <span className={styles.imageFallbackEmoji} aria-hidden="true">🖼️</span>
                  <p className={styles.imageFallbackTitle}>{copy.imageFallbackTitle}</p>
                  <p className={styles.imageFallbackBody}>{copy.imageFallbackBody}</p>
                </div>
              ) : null}
              <p className={styles.description}>{currentEnigme?.description || copy.noDescription}</p>

              {isGridEnigme ? (
                <div className={`${styles.enigmeUiBlock}${isFirstGridEnigme ? ` ${styles.enigmeUiBlockFeatured}` : ''}`}>
                  <div className={`${styles.matrixGrid}${isFirstGridEnigme ? ` ${styles.matrixGridFeatured}` : ''}`}>
                    {currentUiData.grid.flat().map((cell, idx) => {
                      const isMystery = String(cell) === '?';
                      return (
                        <div
                          key={`grid-cell-${idx}`}
                          className={`${styles.matrixCell}${isMystery ? ` ${styles.matrixCellMystery}` : ''}${isFirstGridEnigme ? ` ${styles.matrixCellFeatured}` : ''}`}
                        >
                          {isMystery ? (
                            <span className={styles.mysteryMark} aria-label={isEn ? 'Cell to solve' : 'Case a trouver'}>?</span>
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
                  <p className={styles.enigmeUiTitle}>{wordCodeRows.length > 0 ? copy.wordCodeTitle : (currentUiData?.title || copy.textRiddleTitle)}</p>
                  {(wordCodeRows.length > 0 || currentUiData?.instruction) ? (
                    <p className={styles.enigmeUiInstruction}>{wordCodeRows.length > 0 ? copy.wordCodeInstruction : currentUiData.instruction}</p>
                  ) : null}
                  {wordCodeRows.length > 0 ? (
                    <div className={styles.wordCodeBoard}>
                      {wordCodeRows.map((row, idx) => (
                        <div key={`word-code-row-${row.key}-${idx}`} className={styles.wordCodeRow}>
                          <span
                            className={`${styles.wordCodeAnimal} ${styles[`wordCodeAnimal${row.badgeTone}`]}`}
                            aria-label={row.rawAnimal}
                            title={row.rawAnimal}
                          >
                            {row.icon}
                          </span>
                          <span className={styles.wordCodeEquals}>=</span>
                          <span className={`${styles.wordCodeValue}${row.isQuestion ? ` ${styles.wordCodeValueQuestion}` : ''}`}>
                            {row.answerValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : Array.isArray(currentUiData?.question_lines) && currentUiData.question_lines.length > 0 ? (
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
                  <div className={styles.anagramLettersWrap}>
                    {anagramLetters.length === 0 ? (
                      <p className={styles.teamEmpty}>{isEn ? 'Letters unavailable for this riddle.' : 'Lettres indisponibles pour cette enigme.'}</p>
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
                  <strong>{copy.puzzleHint}</strong> {currentEnigme.hint}
                </div>
              ) : null}

              {!isFacilitator ? (
                <div className={styles.answerPanel}>
                  <div className={styles.answerPanelHeader}>
                    <p className={styles.answerPanelTitle}>🔑 {copy.answerTitle}</p>
                    <span className={styles.answerPanelHint}>{copy.answerVisibility}</span>
                  </div>
                  {hasCurrentParticipantResponded ? (
                    <div className={styles.answeredBanner}>
                      <span>✅ {copy.answerSent}</span>
                      <div className={styles.answeredProgress}>
                        <span className={styles.answeredProgressFill} style={{ width: `${responseProgress}%` }} />
                      </div>
                      <span className={styles.answeredProgressLabel}>{applyTemplate(copy.answersReceived, { responded: totalResponded, total: totalExpected })}</span>
                    </div>
                  ) : null}
                  <div className={styles.answerRow}>
                    <input
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value.toUpperCase())}
                      placeholder={String(currentUiData?.placeholder || copy.answerPlaceholder).toUpperCase()}
                      className={styles.input}
                      disabled={busyAction === 'submit' || !currentEnigme}
                      autoComplete="off"
                      spellCheck={false}
                      onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) submitAnswer(); }}
                    />
                    <button
                      onClick={submitAnswer}
                      disabled={busyAction === 'submit' || !answer.trim() || !currentEnigme}
                      className={styles.primaryBtn}
                      type="button"
                    >
                      {busyAction === 'submit' ? '⏳' : `✓ ${copy.submit}`}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </article>

        <aside className={`${styles.card} ${styles.sidePanel}`}>
          <div className="challenge-desktop-timer">
            <ChallengeTimerCard
              title={copy.timerTitle}
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
                    {copy.unlockHint}
                  </button>
                  <button
                    className={styles.secondaryBtn}
                    disabled={!!busyAction}
                    onClick={() => facilitatorAction('skip', '/skip')}
                  >
                    {copy.skipRiddle}
                  </button>
                </div>
              ) : null}
            />
          </div>

          {hasChallengeStarted ? (
            <div className="challenge-desktop-timer">
              <article className={`${styles.card} ${styles.mainCard}`}>
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
              </article>
            </div>
          ) : null}

          {chatEnabled ? (
            <>
              <ChallengeChatCard
                title={copy.chatTitle}
                messages={chatMessages}
                currentAuthor={displayName}
                inputValue={chatInput}
                onInputChange={setChatInput}
                onSubmit={submitChat}
                quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
                onQuickMessage={sendQuickChat}
                emptyText={copy.chatEmpty}
                placeholder={copy.chatPlaceholder}
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
              <p className={styles.teamEmpty}>{copy.participantListUnavailable}</p>
            ) : participantRows.map((row) => (
              <div key={String(row.id || row.name)} className={styles.teamRow}>
                <span>{row.name}</span>
                <span className={row.responded ? styles.teamStatusOk : styles.teamStatusPending}>
                  {row.responded ? copy.responded : copy.waiting}
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
