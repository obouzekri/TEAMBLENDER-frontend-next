'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useFacilitatorTimerControls from '@/lib/challenges/useFacilitatorTimerControls';
import useModalFocus from '@/lib/useModalFocus';
import { refreshChallengeStateBeforeStart } from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeHeader from '../ChallengeHeader';
import styles from './VraiOuMensonge.module.css';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';

function formatSeconds(ms) {
  const raw = Number(ms || 0);
  const total = Number.isFinite(raw) ? Math.max(0, Math.ceil(raw / 1000)) : 0;
  return total;
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function normalizeName(value) {
  return String(value || '').trim();
}

function formatParticipantName(value) {
  return normalizeName(value).toLocaleLowerCase()
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => word.charAt(0).toLocaleUpperCase() + word.slice(1));
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getRankMedal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

function getChoiceGlyph(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (/caf[eé]/i.test(normalized)) return '☕';
  if (/th[eé]/i.test(normalized)) return '🍵';
  if (/jus|juice/i.test(normalized)) return '🧃';
  if (/eau|water/i.test(normalized)) return '💧';
  if (/sport|run|course/i.test(normalized)) return '🏃';
  if (/musique|music/i.test(normalized)) return '🎧';
  if (/livre|book/i.test(normalized)) return '📚';
  if (/cuisine|cook/i.test(normalized)) return '🍳';
  return '';
}

function buildRankMovementMap(currentRanking, previousScores) {
  if (!previousScores || typeof previousScores !== 'object') return {};

  const previousRows = currentRanking
    .map((entry) => ({
      participant_id: String(entry.participant_id),
      score: Number(previousScores?.[entry.participant_id] || 0)
    }))
    .sort((a, b) => (b.score - a.score) || a.participant_id.localeCompare(b.participant_id));

  let currentRank = 1;
  const previousRankByParticipantId = previousRows.reduce((accumulator, entry, index) => {
    if (index > 0 && entry.score < previousRows[index - 1].score) {
      currentRank = index + 1;
    }
    accumulator[entry.participant_id] = currentRank;
    return accumulator;
  }, {});

  return currentRanking.reduce((accumulator, entry) => {
    const previousRank = Number(previousRankByParticipantId[String(entry.participant_id)] || entry.rank);
    if (entry.rank < previousRank) {
      accumulator[String(entry.participant_id)] = 'up';
    } else if (entry.rank > previousRank) {
      accumulator[String(entry.participant_id)] = 'down';
    } else {
      accumulator[String(entry.participant_id)] = 'same';
    }
    return accumulator;
  }, {});
}

function isEmailLike(value) {
  return normalizeName(value).includes('@');
}

function sanitizeChoiceText(value) {
  return String(value || '')
    .trim()
    .replace(/[.?!]+$/g, '')
    .trim();
}

const STATEMENT_TRANSLATIONS = Object.freeze({
  pr_01: {
    fr: { prompt: 'Je préfère', options: ['Café', 'Thé', 'Jus'] },
    en: { prompt: 'I prefer', options: ['Coffee', 'Tea', 'Juice'] },
  },
  pr_02: {
    fr: { prompt: 'Je préfère', options: ['Montagne', 'Plage', 'Forêt'] },
    en: { prompt: 'I prefer', options: ['Mountains', 'Beach', 'Forest'] },
  },
  pr_03: {
    fr: { prompt: 'Je préfère', options: ['Ville', 'Campagne'] },
    en: { prompt: 'I prefer', options: ['City', 'Countryside'] },
  },
  pr_04: {
    fr: { prompt: 'Je préfère', options: ['Films', 'Sorties'] },
    en: { prompt: 'I prefer', options: ['Movies', 'Going out'] },
  },
  ct_01: {
    fr: { text: 'Je maîtrise plus de trois langues.' },
    en: { text: 'I speak more than three languages.' },
  },
  ct_02: {
    fr: { text: 'J’ai un talent caché.' },
    en: { text: 'I have a hidden talent.' },
  },
  ht_01: {
    fr: { prompt: 'Je me couche', options: ['Tard', 'Tôt'] },
    en: { prompt: 'I go to bed', options: ['Late', 'Early'] },
  },
  ht_02: {
    fr: { text: 'Je fais du sport régulièrement.' },
    en: { text: 'I exercise regularly.' },
  },
  ht_03: {
    fr: { text: 'Je commence ma journée avec mon téléphone.' },
    en: { text: 'I start my day with my phone.' },
  },
  ht_04: {
    fr: { text: 'Je grignote entre les repas.' },
    en: { text: 'I snack between meals.' },
  },
  pa_01: {
    fr: { text: 'J’ai déjà oublié de me présenter en réunion importante.' },
    en: { text: 'I have forgotten to introduce myself in an important meeting.' },
  },
  pa_02: {
    fr: { text: 'J’ai déjà répondu “oui” sans avoir compris.' },
    en: { text: 'I have answered "yes" without understanding.' },
  },
  pa_03: {
    fr: { prompt: 'J’ai déjà perdu', options: ['Téléphone', 'Portefeuille', 'Les deux'] },
    en: { prompt: 'I have already lost', options: ['Phone', 'Wallet', 'Both'] },
  },
  pe_01: {
    fr: { prompt: 'Je suis plutôt', options: ['Compétitif', 'Calme', 'Spontané'] },
    en: { prompt: 'I am more', options: ['Competitive', 'Calm', 'Spontaneous'] },
  },
});

function formatChoiceDisplay(value, locale) {
  const language = locale === 'en' ? 'en-US' : 'fr-FR';
  return sanitizeChoiceText(value)
    .toLocaleLowerCase(language)
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => word.charAt(0).toLocaleUpperCase(language) + word.slice(1));
}

function getTranslatedStatementChoices(statement, locale) {
  const id = String(statement?.id || '').trim();
  const language = locale === 'en' ? 'en' : 'fr';
  const translated = STATEMENT_TRANSLATIONS[id]?.[language];
  if (translated?.prompt && Array.isArray(translated.options) && translated.options.length >= 2) {
    return {
      prompt: translated.prompt,
      options: translated.options,
      hasColon: true,
    };
  }
  return parseStatementChoices(statement?.text || '');
}

function getTranslatedStatementText(statement, locale) {
  const id = String(statement?.id || '').trim();
  const language = locale === 'en' ? 'en' : 'fr';
  const translated = STATEMENT_TRANSLATIONS[id]?.[language];
  return String(translated?.text || statement?.text || '').trim().replace(/\.+$/g, '').trim();
}

function getTranslatedCurrentQuestion(currentTurn, locale) {
  const statement = {
    id: currentTurn?.statement_id,
    text: currentTurn?.statement_text || currentTurn?.statement_prompt,
  };
  const translatedChoices = getTranslatedStatementChoices(statement, locale);
  if (translatedChoices?.prompt) {
    return `${translatedChoices.prompt}${translatedChoices.hasColon ? ':' : ''}`;
  }
  return getTranslatedStatementText(statement, locale) || String(currentTurn?.statement_prompt || currentTurn?.statement_text || '-').trim();
}

function translateStatementOption(statement, option, locale) {
  const rawOption = String(option || '').trim();
  if (!rawOption) return '';

  const parsed = parseStatementChoices(statement?.text || '');
  const translated = getTranslatedStatementChoices(statement, locale);
  const rawOptions = Array.isArray(parsed?.options) ? parsed.options : [];
  const translatedOptions = Array.isArray(translated?.options) ? translated.options : [];
  const optionIndex = rawOptions.findIndex((item) => item.toLowerCase() === rawOption.toLowerCase());
  if (optionIndex >= 0 && translatedOptions[optionIndex]) {
    return translatedOptions[optionIndex];
  }

  const translatedMatch = translatedOptions.find((item) => item.toLowerCase() === rawOption.toLowerCase());
  return translatedMatch || rawOption;
}

function translateCurrentTurnOption(currentTurn, option, locale) {
  const statement = {
    id: currentTurn?.statement_id,
    text: currentTurn?.statement_text || currentTurn?.statement_prompt,
  };
  return translateStatementOption(statement, option, locale);
}

function formatStatementCategory(value, locale = 'fr') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  const isEnglish = locale === 'en';
  if (normalized.includes('préférence') || normalized.includes('preference')) return isEnglish ? 'Preferences' : 'Préférences';
  if (normalized.includes('compétence') || normalized.includes('competence')) return isEnglish ? 'Skills' : 'Compétences';
  if (normalized.includes('habitude') || normalized.includes('habit')) return isEnglish ? 'Habits' : 'Habitudes';
  if (normalized.includes('personnalité') || normalized.includes('personality')) return isEnglish ? 'Personality' : 'Personnalité';
  if (normalized.includes('anecdote') || normalized.includes('short stor') || normalized.includes('experience') || normalized.includes('expérience')) return isEnglish ? 'Experiences' : 'Expériences';
  return normalized
    .split(/\s+/)
    .map((word) => word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : '')
    .join(' ');
}

function parseStatementChoices(rawText) {
  const text = String(rawText || '').trim();
  if (!text.includes('/')) return null;

  const slashParts = text
    .split('/')
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (slashParts.length < 2) return null;

  const firstPart = slashParts[0];
  let prompt = '';
  let firstOption = '';
  let hasColon = false;

  if (firstPart.includes(':')) {
    const [left, ...rest] = firstPart.split(':');
    prompt = String(left || '').trim();
    firstOption = String(rest.join(':') || '').trim();
    hasColon = true;
  } else {
    const words = firstPart.split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;
    prompt = words.slice(0, -1).join(' ').trim();
    firstOption = words[words.length - 1] || '';
  }

  const optionList = [firstOption, ...slashParts.slice(1)]
    .map((item) => sanitizeChoiceText(item))
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);

  const cleanPrompt = sanitizeChoiceText(prompt);
  if (!cleanPrompt || optionList.length < 2) return null;

  return {
    prompt: cleanPrompt,
    options: optionList,
    hasColon
  };
}

export default function VraiOuMensongeChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [selectedChoicesByStatementId, setSelectedChoicesByStatementId] = useState({});
  const [nowMs, setNowMs] = useState(Date.now());
  const [clickedStatementId, setClickedStatementId] = useState('');
  const [resultPulse, setResultPulse] = useState(false);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const audioRef = useRef(null);


  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
    participantId,
    connected,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const { t, locale } = useI18n();
  const isEn = locale === 'en';

  const vom = state?.vom || {};
  const phase = String(vom?.phase || 'waiting_start');
  const isFacilitatorPaused = Boolean(vom?.facilitator_pause);
  const vomTimerStatus = useCallback((snapshot) => {
    const value = snapshot?.vom || {};
    if (value.facilitator_pause) return 'paused';
    return ['selecting_statement', 'voting_open', 'round_result', 'next_turn'].includes(String(value.phase || ''))
      ? 'running'
      : 'idle';
  }, []);
  const timerControls = useFacilitatorTimerControls({
    socket,
    emitEvent,
    state,
    isFacilitator,
    pauseEvent: 'vom.pause',
    resumeEvent: 'vom.resume',
    statusSelector: vomTimerStatus,
  });
  const hasChallengeStarted = phase !== 'waiting_start';
  const currentTurn = vom?.current_turn || null;
  const scores = vom?.scores || {};
  const ranking = Array.isArray(vom?.ranking) ? vom.ranking : [];
  const participantsOrder = Array.isArray(vom?.participants_order) ? vom.participants_order : [];
  const participantsMeta = Array.isArray(vom?.participants_meta) ? vom.participants_meta : [];
  const catalog = Array.isArray(vom?.catalog) ? vom.catalog : [];

  const me = String(participantId || context?.userId || '');
  const poserId = String(currentTurn?.poser_id || '');
  const isPoser = me && poserId && me === poserId;
  const currentQuestionDisplayText = useMemo(
    () => getTranslatedCurrentQuestion(currentTurn, locale),
    [currentTurn, locale]
  );
  const chatEnabled = Boolean(socket);
  const hasSelectionTimeout = String(currentTurn?.result?.reveal_reason || '') === 'selection_timeout';

  const displayName = useMemo(() => {
    const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
    const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return formatParticipantName(fullName);
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload && !isEmailLike(fromPayload)) return formatParticipantName(fromPayload);
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext && !isEmailLike(fromContext)) return formatParticipantName(fromContext);
    return 'Participant';
  }, [runtimePayload, context, me]);

  const participantNameMap = useMemo(() => {
    const map = new Map();
    participantsMeta.forEach((item) => {
      const id = String(item?.participant_id || '');
      if (!id) return;
      const slot = Number(item?.slot || 0);
      const fallback = slot > 0 ? `Participant ${slot}` : 'Participant';
      const firstName = String(item?.first_name || item?.firstName || '').trim();
      const lastName = String(item?.last_name || item?.lastName || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      const displayName = String(item?.display_name || '').trim();
      const safeDisplayName = displayName && !isEmailLike(displayName) ? displayName : '';
      map.set(id, formatParticipantName(fullName || safeDisplayName || fallback));
    });

    participantsOrder.forEach((id, index) => {
      if (!map.has(String(id))) {
        map.set(String(id), `Participant ${index + 1}`);
      }
    });
    return map;
  }, [participantsMeta, participantsOrder]);

  const orderedParticipantIds = useMemo(() => {
    if (participantsMeta.length > 0) {
      return [...participantsMeta]
        .sort((a, b) => Number(a?.slot || 999) - Number(b?.slot || 999))
        .map((item) => String(item?.participant_id || ''))
        .filter(Boolean);
    }
    return participantsOrder;
  }, [participantsMeta, participantsOrder]);

  function participantName(id) {
    const value = String(participantNameMap.get(String(id)) || '').trim();
    return value && !isEmailLike(value) ? value : 'Participant';
  }

  const poserName = poserId ? participantName(poserId) : 'Participant';

  const {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
    sendQuickChat,
    chatDelivery,
  } = useChallengeChat({
    socket,
    emitEvent,
    author: displayName,
    enabled: chatEnabled,
    maxMessages: 80,
    maxLength: 240,
  });

  const usedByPoser = useMemo(() => {
    const byParticipant = vom?.used_statement_ids_by_participant || {};
    const ids = Array.isArray(byParticipant[poserId]) ? byParticipant[poserId] : [];
    return new Set(ids.map((value) => String(value)));
  }, [vom, poserId]);

  const myVote = String(currentTurn?.votes?.[me] || '');
  const allVotes = currentTurn?.votes && typeof currentTurn.votes === 'object' ? currentTurn.votes : {};
  const roundHistory = Array.isArray(vom?.round_history) ? vom.round_history : [];
  const selectedStatement = useMemo(
    () => catalog.find((item) => String(item?.id || '') === String(selectedStatementId || '')) || null,
    [catalog, selectedStatementId]
  );
  useBodyScrollLock(selectionModalOpen && isPoser && Boolean(selectedStatement));
  const selectionModalRef = useRef(null);
  useModalFocus(selectionModalOpen && Boolean(isPoser) && Boolean(selectedStatement), selectionModalRef, () => setSelectionModalOpen(false));

  const selectedStatementChoices = useMemo(
    () => getTranslatedStatementChoices(selectedStatement, locale),
    [selectedStatement, locale]
  );
  const selectedStatementOption = String(selectedChoicesByStatementId[selectedStatementId] || '');
  const votingChoices = Array.isArray(currentTurn?.statement_options) ? currentTurn.statement_options : [];
  const isChoiceVoting = votingChoices.length > 1;
  const rulesPreset = useMemo(() => getVraiOuMensongeRulesPreset(locale), [locale]);
  const rulesContent = useMemo(() => ({
    objective: rulesPreset.objective || (isEn
      ? 'Each participant takes turns sharing personal information. A playful challenge to see how well you know each other!'
      : 'À tour de rôle, chaque participant partage des informations sur lui-même. Un défi ludique pour voir à quel point vous connaissez les autres !'),
    facilitator: [...rulesPreset.facilitator],
    participant: [
      isEn
        ? 'Game rules: listen, observe, and guess if the statement is true or a bluff.'
        : 'Règles du jeu : écoutez, observez et devinez si la déclaration est vraie ou bluff.',
      ...(Array.isArray(rulesPreset.participant) ? rulesPreset.participant : []),
    ],
    footnote: rulesPreset.footnote,
  }), [isEn, rulesPreset]);
  const challengeName = String(rulesPreset?.challengeName || t('vom.title')).trim();
  const challengeSubtitle = String(rulesPreset?.subtitle || 'À tour de rôle, chaque participant partage des informations sur lui-même. Un défi ludique pour voir à quel point vous connaissez les autres !').trim();
  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset.participants.min,
    recommended: rulesPreset.participants.recommended,
    max: rulesPreset.participants.max,
  }), [rulesPreset]);
  const minParticipantsRequired = Number(String(rulesParticipantsMeta.min || '2').replace(/[^0-9]/g, '')) || 2;
  const participantCount = orderedParticipantIds.length;
  const canStartChallenge = connected && participantCount >= minParticipantsRequired;
  const missingParticipants = Math.max(0, minParticipantsRequired - participantCount);
  const startStatusText = canStartChallenge
    ? ''
    : isEn
      ? `Waiting for ${missingParticipants} participant${missingParticipants > 1 ? 's' : ''}...`
      : `En attente de ${missingParticipants} participant${missingParticipants > 1 ? 's' : ''}...`;
  const facilitatorRules = useMemo(
    () => (Array.isArray(rulesContent?.facilitator) ? rulesContent.facilitator : []),
    [rulesContent?.facilitator]
  );
  const participantRules = useMemo(
    () => (Array.isArray(rulesContent?.participant) ? rulesContent.participant : []),
    [rulesContent?.participant]
  );

  const poserSelectionOptions = useMemo(() => {
    if (selectedStatementChoices?.options?.length > 1) {
      return selectedStatementChoices.options;
    }
    return ['Vrai', 'Mensonge'];
  }, [selectedStatementChoices]);

  const eligibleVoterIds = useMemo(
    () => orderedParticipantIds.filter((id) => String(id) !== poserId),
    [orderedParticipantIds, poserId]
  );

  const facilitatorVoteRows = useMemo(
    () => eligibleVoterIds.map((id) => {
      const rawVote = String(allVotes?.[id] || '').trim();
      const normalizedVote = rawVote.toLowerCase();
      const hasAnswered = rawVote !== '';
      let voteLabel = t('vom.votePending');

      if (hasAnswered) {
        if (normalizedVote === 'vrai') {
          voteLabel = t('vom.voteTrue');
        } else if (normalizedVote === 'mensonge') {
          voteLabel = t('vom.voteFalse');
        } else {
          voteLabel = rawVote;
        }
      }

      return {
        participantId: String(id),
        participantName: participantName(id),
        hasAnswered,
        voteLabel,
      };
    }),
    [eligibleVoterIds, allVotes, t]
  );

  const answeredVotesCount = facilitatorVoteRows.filter((item) => item.hasAnswered).length;
  const totalExpectedVotes = facilitatorVoteRows.length;
  const voteProgressLabel = `${answeredVotesCount}/${totalExpectedVotes} ${isEn ? 'response received' : 'reponse recue'}${answeredVotesCount > 1 ? (isEn ? 's' : 's') : ''}`;

  const remainingMs = useMemo(() => {
    if (isFacilitatorPaused) {
      return Math.max(0, Number(vom?.facilitator_pause?.remaining_ms || 0));
    }
    const deadline = Number(vom?.phase_deadline_ms || 0);
    const startedAt = Number(vom?.phase_started_at_ms || 0);
    const timing = vom?.timing || {};
    const fallbackDuration = Number(
      phase === 'selecting_statement'
        ? timing.selecting_ms
        : phase === 'voting_open'
          ? timing.voting_ms
          : phase === 'round_result'
              ? timing.round_result_ms
              : phase === 'next_turn'
                ? timing.next_turn_ms
                : 0
    ) || 0;

    if (deadline > 0) {
      return Math.max(0, deadline - nowMs);
    }
    if (startedAt > 0 && fallbackDuration > 0) {
      return Math.max(0, (startedAt + fallbackDuration) - nowMs);
    }
    return fallbackDuration;
  }, [isFacilitatorPaused, nowMs, phase, vom?.facilitator_pause?.remaining_ms, vom?.phase_deadline_ms, vom?.phase_started_at_ms, vom?.timing]);

  const phaseDurationSeconds = useMemo(() => {
    const startedAt = Number(vom?.phase_started_at_ms || 0);
    const deadline = Number(vom?.phase_deadline_ms || 0);
    if (startedAt > 0 && deadline > startedAt) {
      return formatSeconds(deadline - startedAt);
    }
    const timing = vom?.timing || {};
    if (phase === 'selecting_statement') return formatSeconds(timing.selecting_ms || 40_000);
    if (phase === 'voting_open') return formatSeconds(timing.voting_ms || 40_000);
    if (phase === 'round_result') return formatSeconds(timing.round_result_ms || 5_000);
    if (phase === 'next_turn') return formatSeconds(timing.next_turn_ms || 0);
    return 1;
  }, [phase, vom?.phase_deadline_ms, vom?.phase_started_at_ms, vom?.timing]);

  const remainingSecondsForCard = useMemo(() => {
    const remaining = formatSeconds(remainingMs);
    return remaining;
  }, [phase, phaseDurationSeconds, remainingMs]);

  const timerStatus = useMemo(() => {
    if (isFacilitatorPaused) return 'paused';
    if ((phase === 'selecting_statement' || phase === 'voting_open') && remainingSecondsForCard <= 0) {
      return 'timeout';
    }
    if (phase === 'round_result' && hasSelectionTimeout) {
      return 'timeout';
    }
    if (phase === 'voting_open' || phase === 'selecting_statement' || phase === 'round_result') {
      return 'running';
    }
    return 'idle';
  }, [hasSelectionTimeout, isFacilitatorPaused, phase, remainingSecondsForCard]);

  const myRoundVote = useMemo(() => {
    const votes = Array.isArray(currentTurn?.result?.votes) ? currentTurn.result.votes : [];
    return votes.find((item) => String(item?.participant_id || '') === me) || null;
  }, [currentTurn?.result?.votes, me]);

  const myScore = Number(scores[me] || 0);

  const liveRanking = useMemo(() => {
    const baseIds = orderedParticipantIds.length > 0
      ? orderedParticipantIds
      : Object.keys(scores || {});
    const rows = baseIds.map((participantId) => ({
      participant_id: String(participantId),
      score: Number(scores?.[participantId] || 0)
    }));

    rows.sort((a, b) => (b.score - a.score) || a.participant_id.localeCompare(b.participant_id));

    let currentRank = 1;
    return rows.map((entry, index) => {
      if (index > 0 && entry.score < rows[index - 1].score) {
        currentRank = index + 1;
      }
      return {
        ...entry,
        rank: currentRank
      };
    });
  }, [orderedParticipantIds, scores]);

  const maxScore = useMemo(
    () => Math.max(1, ...liveRanking.map((entry) => Number(entry.score || 0))),
    [liveRanking]
  );

  const myLiveEntry = useMemo(
    () => liveRanking.find((entry) => String(entry.participant_id) === me) || null,
    [liveRanking, me]
  );

  const previousScoreSnapshot = useMemo(() => {
    if (roundHistory.length < 2) return null;
    const previousRound = roundHistory[roundHistory.length - 2];
    return previousRound?.score_snapshot || null;
  }, [roundHistory]);

  const rankMovementByParticipantId = useMemo(
    () => buildRankMovementMap(liveRanking, previousScoreSnapshot),
    [liveRanking, previousScoreSnapshot]
  );

  const streakByParticipant = useMemo(() => {
    const streakMap = {};
    orderedParticipantIds.forEach((id) => {
      streakMap[String(id)] = 0;
    });

    for (let index = roundHistory.length - 1; index >= 0; index -= 1) {
      const round = roundHistory[index];
      const votes = Array.isArray(round?.votes) ? round.votes : [];
      votes.forEach((vote) => {
        const participantKey = String(vote?.participant_id || '');
        if (!participantKey) return;
        if (vote?.status === 'correct' && Number(streakMap[participantKey]) >= 0) {
          streakMap[participantKey] += 1;
          return;
        }
        if (streakMap[participantKey] != null && Number(streakMap[participantKey]) >= 0) {
          streakMap[participantKey] = -999;
        }
      });
    }

    Object.keys(streakMap).forEach((key) => {
      streakMap[key] = Math.max(0, Number(streakMap[key] || 0));
    });

    return streakMap;
  }, [orderedParticipantIds, roundHistory]);

  const myCorrectStreak = Number(streakByParticipant[me] || 0);

  const poseurRoundPoints = Number(currentTurn?.result?.poser_points || 0);
  const totalCycles = Math.max(1, Number(vom?.computed_cycles || vom?.rounds_per_participant || 3));
  const currentCycle = Math.max(1, Math.min(totalCycles, Number(currentTurn?.passage_number || 1)));
  const myRoundPoints = Number(isPoser ? poseurRoundPoints : myRoundVote?.points || 0);
  const myRoundMovement = String(rankMovementByParticipantId[me] || 'same');
  const myRank = Number(myLiveEntry?.rank || 0);
  const myRankMedal = getRankMedal(myRank);

  function renderRankingCard(keyPrefix = 'aside') {
    return (
      <section className={`${styles.rankingCard} ${styles.stateCard}`}>
        <div className={styles.rankingCardHeader}>
          <h3 className={`${styles.rankingCardTitle} challenge-section-title`}>{t('vom.ranking')}</h3>
          <span className={styles.rankingMeta}>{t('vom.rankingLiveUpdate')}</span>
        </div>
        <div className={styles.leaderboardList}>
          {liveRanking.length === 0 ? <p className={styles.helper}>{t('vom.noParticipants')}</p> : null}
          {liveRanking.map((entry, index) => renderLeaderboardRow(entry, index, { compact: true, keyPrefix }))}
        </div>
      </section>
    );
  }

  function renderLeaderboardRow(entry, index, options = {}) {
    const participantKey = String(entry.participant_id);
    const movement = String(rankMovementByParticipantId[participantKey] || 'same');
    const medal = getRankMedal(Number(entry.rank));
    const progressWidth = `${Math.min(100, Math.round((Number(entry.score || 0) / maxScore) * 100))}%`;
    const compact = options.compact === true;

    return (
      <article
        key={`${options.keyPrefix || 'leader'}-${participantKey}`}
        className={`${styles.leaderboardCard}${index < 3 ? ` ${styles.leaderboardCardTop}` : ''}${participantKey === poserId ? ` ${styles.activeParticipantRow}` : ''}${participantKey === me ? ` ${styles.myParticipantRow}` : ''}${movement === 'up' ? ` ${styles.rankUp}` : ''}${movement === 'down' ? ` ${styles.rankDown}` : ''}${compact ? ` ${styles.leaderboardCardCompact}` : ''}`}
      >
        <div className={styles.leaderboardIdentity}>
          <div className={styles.leaderboardRankWrap}>
            <span className={styles.rankPill}>{medal || `#${entry.rank}`}</span>
          </div>
          <span className={styles.leaderAvatar}>{getInitials(participantName(participantKey))}</span>
          <div className={styles.leaderboardCopy}>
            <span className={styles.leaderboardLine}>{participantName(participantKey)}</span>
          </div>
        </div>
        <div className={styles.leaderboardScoreWrap}>
          <div className={styles.leaderboardScoreTopline}>
            <span className={styles.leaderboardScore}>{entry.score} pts</span>
          </div>
          <span className={styles.leaderProgressTrack}>
            <span className={styles.leaderProgressFill} style={{ width: progressWidth }} />
          </span>
        </div>
      </article>
    );
  }

  function playLightTone(kind) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = kind === 'success' ? 720 : kind === 'error' ? 240 : 460;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.14);
    } catch {
      // No-op: le son reste optionnel et ne doit jamais bloquer l interaction.
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isFacilitator || phase !== 'waiting_start') return undefined;

    emitEvent('vom.request_state', {});
    emitEvent('participants.request_state', {});

    const pollingTimer = window.setInterval(() => {
      emitEvent('vom.request_state', {});
      emitEvent('participants.request_state', {});
    }, 3000);

    return () => window.clearInterval(pollingTimer);
  }, [emitEvent, isFacilitator, phase]);

  useEffect(() => {
    if (!isFacilitator || phase !== 'waiting_start') return;
    const latestEventType = String(events?.[0]?.type || '').trim();
    if (latestEventType === 'participants.update') {
      emitEvent('vom.request_state', {});
    }
  }, [emitEvent, events, isFacilitator, phase]);

  useEffect(() => {
    if (phase !== 'selecting_statement') {
      setSelectionModalOpen(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'round_result') {
      setResultPulse(true);
      const t = window.setTimeout(() => setResultPulse(false), 1200);
      if (isPoser) {
        playLightTone(poseurRoundPoints > 0 ? 'success' : 'default');
      } else if (myRoundVote?.status === 'correct') {
        playLightTone('success');
      } else if (myRoundVote?.status === 'incorrect') {
        playLightTone('error');
      } else {
        playLightTone('default');
      }
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [phase, myRoundVote?.status, isPoser, poseurRoundPoints]);

  function startChallenge() {
    refreshChallengeStateBeforeStart(emitEvent);
    emitEvent('vom.start', {});
  }

  function confirmStatement() {
    if (!connected) return false;
    if (!selectedStatementId) return;
    if (!selectedStatementOption) return;
    const rawSelectedChoices = parseStatementChoices(selectedStatement?.text || '');
    const selectedIndex = selectedStatementChoices?.options?.findIndex((option) => option.toLowerCase() === selectedStatementOption.toLowerCase());
    const rawSelectedOption = selectedIndex >= 0 && rawSelectedChoices?.options?.[selectedIndex]
      ? rawSelectedChoices.options[selectedIndex]
      : selectedStatementOption;
    playLightTone('default');
    return emitEvent('vom.select_statement', {
      statement_id: selectedStatementId,
      selected_option: rawSelectedOption
    });
  }

  function vote(v) {
    if (!connected) return;
    playLightTone('default');
    emitEvent('vom.vote', { vote: v });
  }

  function renderChoiceLabel(option) {
    const label = formatChoiceDisplay(translateCurrentTurnOption(currentTurn, option, locale), locale);
    const glyph = getChoiceGlyph(label);
    return glyph ? `${glyph} ${label}` : label;
  }

  function formatAnswer(value) {
    const raw = String(value || '').trim();
    if (!raw) return t('vom.noAnswer');
    if (isChoiceVoting) return formatChoiceDisplay(translateCurrentTurnOption(currentTurn, raw, locale), locale);
    if (['vrai', 'true'].includes(raw.toLowerCase())) return t('vom.answerTrue');
    if (['mensonge', 'faux', 'false'].includes(raw.toLowerCase())) return t('vom.answerFalse');
    return formatChoiceDisplay(raw, locale);
  }

  function resultStatusLabel(status) {
    if (status === 'correct') return t('vom.resultCorrect');
    if (status === 'incorrect') return t('vom.resultIncorrect');
    return t('vom.resultTimeout');
  }

  return (
    <div className={`${styles.shell}${!hasChallengeStarted ? ` ${styles.shellPrestart}` : ''}`}>
      <ChallengeHeader
        title={challengeName}
        subtitle={challengeSubtitle || 'À tour de rôle, chaque participant partage des informations sur lui-même. Un défi ludique pour voir à quel point vous connaissez les autres !'}
        timer={{ remainingSeconds: remainingSecondsForCard }}
        headerAction={hasChallengeStarted ? (
          <ChallengeRulesPanel
            inHeader
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName={challengeName || t('vom.title')}
            objective={rulesContent.objective}
            participantsMeta={rulesParticipantsMeta}
            facilitatorRules={facilitatorRules}
            participantRules={participantRules}
            footnote={rulesContent.footnote}
          />
        ) : null}
      />

      <div className="challenge-mobile-timer">
        <ChallengeTimerCard
          className={styles.mobileTimerCard}
          title={isEn ? 'Timer' : 'Minuteur'}
          remainingSeconds={remainingSecondsForCard}
          durationSeconds={Math.max(1, phaseDurationSeconds)}
          status={timerStatus}
          isFacilitator={isFacilitator}
          onPause={timerControls.pause}
          onResume={timerControls.resume}
          controlPending={timerControls.busy}
          controlFeedback={timerControls.feedback}
          waitingText=""
          collapsible={false}
          footer={(phase === 'selecting_statement' || phase === 'voting_open') && remainingSecondsForCard <= 0 ? <p className={styles.timeUpFeedback}>{t('vom.timeoutFeedback')}</p> : null}
        />
      </div>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}
      {hasChallengeStarted && !isFacilitator ? (
        <p className={styles.roleBanner} role="status">
          {phase === 'selecting_statement' && isPoser
            ? (isEn ? 'It is your turn: choose a statement and your personal answer.' : 'C’est votre tour : choisissez une affirmation et votre réponse personnelle.')
            : phase === 'voting_open' && !isPoser && !myVote
              ? (isEn ? 'Vote: guess the answer of the player whose turn it is.' : 'Votez : devinez la réponse du joueur dont c’est le tour.')
              : phase === 'round_result'
                ? (isEn ? 'Collective reveal: compare your answer with the revealed answer.' : 'Révélation collective : comparez votre réponse à la réponse révélée.')
                : (isEn ? 'Waiting: follow the current player and the team votes.' : 'En attente : suivez le joueur actif et les votes de l’équipe.')}
        </p>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>

        {!hasChallengeStarted ? (
          <section className={styles.card}>
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName={challengeName || t('vom.title')}
              objective={rulesContent.objective}
              participantsMeta={rulesParticipantsMeta}
              facilitatorRules={facilitatorRules}
              participantRules={participantRules}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? startChallenge : null}
              startDisabled={!canStartChallenge}
              startStatusText={startStatusText}
            />
          </section>
        ) : null}

        {!hasChallengeStarted ? (
          <div className={styles.prestartRankingMobile}>
            {renderRankingCard('prestart-mobile')}
          </div>
        ) : null}

        {phase === 'selecting_statement' ? (
          <section className={styles.card}>
            <div className={styles.selectionHeader}>
              <h2 className={styles.selectionTitle}>
                {isPoser
                  ? (isEn ? 'Choose a statement' : 'Choisissez une affirmation')
                  : (isEn
                    ? `The participant ${poserName} is choosing a statement`
                    : `${poserName} choisit une affirmation`)}
              </h2>
              <span className={styles.selectionProgress}>{`Passage ${currentCycle}/${totalCycles}`}</span>
            </div>
            {isPoser ? (
              <>
                <div className={styles.statementGrid}>
                  {catalog.map((statement, index) => {
                    const disabled = !connected || isFacilitatorPaused || usedByPoser.has(String(statement.id));
                    const selected = selectedStatementId === String(statement.id);
                    const parsedChoices = getTranslatedStatementChoices(statement, locale);
                    const pickedChoice = String(selectedChoicesByStatementId[String(statement.id)] || '');
                    const categoryLabel = formatStatementCategory(statement.category, locale);
                    return (
                      <button
                        key={statement.id}
                        type="button"
                        className={`${styles.statementBtn}${selected ? ` ${styles.statementBtnSelected}` : ''}${clickedStatementId === String(statement.id) ? ` ${styles.statementBtnClicked}` : ''}`}
                        disabled={disabled}
                        style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
                        onClick={() => {
                          setSelectedStatementId(String(statement.id));
                          setSelectionModalOpen(true);
                          setClickedStatementId(String(statement.id));
                          playLightTone('default');
                          window.setTimeout(() => setClickedStatementId(''), 180);
                        }}
                      >
                        <span className={styles.statementGlow} aria-hidden="true" />
                        {categoryLabel ? <span className={styles.categoryBadge}>{categoryLabel}</span> : null}
                        {parsedChoices ? (
                          <>
                            <span className={styles.statementPrompt}>
                              {parsedChoices.prompt}{parsedChoices.hasColon ? ':' : ''}
                            </span>
                            <span className={styles.statementOptionsPreview}>
                              {parsedChoices.options.map((option) => formatChoiceDisplay(option, locale)).join(' / ')}
                            </span>
                            {selected && pickedChoice ? <small className={styles.statementMeta}>{t('vom.selectedOption', { option: formatChoiceDisplay(pickedChoice, locale) })}</small> : null}
                          </>
                        ) : (
                          <span className={styles.statementPrompt}>{getTranslatedStatementText(statement, locale)}</span>
                        )}
                        {selected ? <span className={styles.selectedMark}>{t('vom.selected')}</span> : null}
                        {disabled ? <small className={styles.statementMeta}>{t('vom.alreadyUsed')}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {phase === 'voting_open' ? (
          <section className={styles.card}>
            {isPoser ? (
              <div className={styles.poserVoteWaitingCard}>
                <h2 className={styles.sectionTitle}>{t('vom.votingTitle')}</h2>
              </div>
            ) : (
              <>
                {isFacilitator ? (
                  <>
                    <h2 className={styles.sectionTitle}>{t('vom.votingTitle')}</h2>
                    <div className={styles.voteCompactCard}>
                      <p className={styles.voteCompactQuestionLabel}>{isEn ? 'Question' : 'Question'}</p>
                      <p className={styles.voteCompactQuestion}>"{currentQuestionDisplayText}"</p>
                      <p className={styles.voteCompactProgress}>{isEn ? `Progress: ${voteProgressLabel}` : `Progression: ${voteProgressLabel}`}</p>
                      <span className={styles.observerBadge}>{isEn ? 'Observation only' : 'Observation uniquement'}</span>
                      <div className={styles.voteStatusList}>
                        {facilitatorVoteRows.map((row) => (
                          <article key={row.participantId} className={`${styles.voteStatusRow}${row.hasAnswered ? ` ${styles.voteStatusRowDone}` : ''}`}>
                            <div className={styles.voteStatusIdentity}>
                              <span className={styles.inlineAvatar}>{getInitials(row.participantName)}</span>
                              <strong>{row.participantName}</strong>
                            </div>
                            <span className={`${styles.voteStatusBadge}${row.hasAnswered ? ` ${styles.voteStatusBadgeDone}` : ` ${styles.voteStatusBadgePending}`}`}>
                              {row.hasAnswered ? `✅ ${isEn ? 'Answered' : 'Repondu'}` : `⏳ ${isEn ? 'Pending' : 'En attente'}`}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.voteTargetCard}>
                    <p className={styles.voteTargetEyebrow}>{isEn ? 'Guess the answer from' : 'DEVINEZ LA RÉPONSE DE'}</p>
                    <div className={styles.voteTargetIdentity}>
                      <span className={styles.voteTargetAvatar}>{getInitials(poserName)}</span>
                      <h2 className={styles.voteTargetName}>{poserName}</h2>
                    </div>
                    <div className={styles.voteQuestionBlock}>
                      <span>{isEn ? 'Question:' : 'Question :'}</span>
                      <p>{currentQuestionDisplayText}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {!isFacilitator && !isPoser ? (
              <div className={styles.voteActions}>
                {isChoiceVoting ? (
                  votingChoices.map((option) => {
                    const active = myVote.toLowerCase() === String(option || '').toLowerCase();
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`${styles.choiceOptionBtn}${active ? ` ${styles.choiceOptionBtnActive}` : ''}`}
                        onClick={() => vote(option)}
                        disabled={!connected || isFacilitatorPaused}
                      >
                        <span className={styles.voteSelectionMark}>{active ? '✓' : ''}</span>
                        <span className={styles.voteChoiceLabel}>{renderChoiceLabel(option)}</span>
                      </button>
                    );
                  })
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.voteTrue}${myVote === 'vrai' ? ` ${styles.voteActive}` : ''}`}
                      onClick={() => vote('vrai')}
                      disabled={!connected || isFacilitatorPaused}
                    >
                      <span className={styles.voteSelectionMark}>{myVote === 'vrai' ? '✓' : ''}</span>
                      <span className={styles.voteChoiceLabel}>{t('vom.voteTrue')}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.voteFalse}${myVote === 'mensonge' ? ` ${styles.voteActive}` : ''}`}
                      onClick={() => vote('mensonge')}
                      disabled={!connected || isFacilitatorPaused}
                    >
                      <span className={styles.voteSelectionMark}>{myVote === 'mensonge' ? '✓' : ''}</span>
                      <span className={styles.voteChoiceLabel}>{t('vom.voteFalse')}</span>
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {remainingSecondsForCard <= 0 ? <p className={styles.timeUpFeedback}>{t('vom.timeoutFeedback')}</p> : null}
          </section>
        ) : null}

        {phase === 'round_result' ? (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{t('vom.roundResultTitle')}</h2>
            <div className={`${styles.resultHero}${resultPulse ? ` ${styles.resultHeroPulse}` : ''}`}>
              <div className={styles.resultHeroFeedback}>
                <div className={styles.resultEyebrowRow}>
                  <span className={styles.resultEyebrow}>{t('vom.instantFeedback')}</span>
                  {!isFacilitator ? <span className={`${styles.resultStatusBadge}${myRoundPoints > 0 ? ` ${styles.resultStatusSuccess}` : ''}`}>
                    {hasSelectionTimeout ? '⏳' : isPoser ? (poseurRoundPoints > 0 ? '🎯' : '•') : myRoundVote?.status === 'correct' ? '✅' : myRoundVote?.status === 'incorrect' ? '❌' : '•'}
                    {myRoundPoints > 0 ? ` +${myRoundPoints} pts` : ' 0 pt'}
                  </span> : null}
                </div>
                <strong className={styles.wowTitle}>{hasSelectionTimeout ? t('vom.roundInterrupted') : isFacilitator ? t('vom.answerRevealed') : isPoser ? t('vom.bluffRevealed') : myRoundVote?.status === 'correct' ? t('vom.feedbackCorrect') : myRoundVote?.status === 'incorrect' ? t('vom.feedbackIncorrect') : t('vom.resultTimeout')}</strong>
                {hasSelectionTimeout ? (
                  <p className={styles.wowText}>{t('vom.selectionTimeoutBody')}</p>
                ) : isFacilitator ? (
                  <p className={styles.wowText}>{t('vom.correctAnswerLabel')}: <strong>{formatAnswer(currentTurn?.revealed_truth)}</strong> ✅</p>
                ) : !isPoser ? (
                  <div className={styles.answerComparison}>
                    <p>{t('vom.yourAnswerLabel')}: <strong>{formatAnswer(myRoundVote?.vote)}</strong> {myRoundVote?.status === 'correct' ? '✅' : myRoundVote?.status === 'incorrect' ? '❌' : '⏱️'}</p>
                    <p>{t('vom.correctAnswerLabel')}: <strong>{formatAnswer(currentTurn?.revealed_truth)}</strong> ✅</p>
                  </div>
                ) : (
                  <p className={styles.wowText}>
                    {t('vom.poserFeedback', { points: poseurRoundPoints })}
                  </p>
                )}
              </div>
              {!isFacilitator ? <div className={styles.mainScoreCard}>
                <span className={styles.mainScoreLabel}>{t('vom.myScore')}</span>
                <span className={`${styles.mainScoreValue}${resultPulse ? ` ${styles.mainScoreValuePulse}` : ''}`}>{myScore}</span>
                <span className={styles.mainScoreUnit}>{t(myScore === 1 ? 'vom.point' : 'vom.points')}</span>
                <div className={styles.scoreDeltaRow}>
                  <span className={`${styles.scoreDeltaChip}${myRoundPoints > 0 ? ` ${styles.scoreDeltaChipPositive}` : ''}`}>{myRoundPoints > 0 ? `+${myRoundPoints}` : '0'} pt</span>
                  <span className={styles.scoreRankChip}>{myRankMedal || `#${myRank || '-'}`} {myRoundMovement === 'up' ? '↑' : myRoundMovement === 'down' ? '↓' : '→'}</span>
                </div>
              </div> : null}
            </div>

            <div className={styles.resultListDense}>
              {(currentTurn?.result?.votes || []).map((item) => (
                <div key={item.participant_id} className={styles.resultRow}>
                  <span className={styles.resultParticipantWrap}>
                    <span className={styles.inlineAvatar}>{getInitials(participantName(item.participant_id))}</span>
                    <span>{participantName(item.participant_id)}</span>
                  </span>
                  <span className={`${styles.resultStatusText} ${item.status === 'correct' ? styles.resultCorrect : item.status === 'incorrect' ? styles.resultIncorrect : styles.resultTimeout}`}>{resultStatusLabel(item.status)}</span>
                  <span>+{item.points}</span>
                </div>
              ))}
            </div>
            <h3 className={styles.sectionTitle}>{t('vom.ranking')}</h3>
            <div className={styles.leaderboardList}>
              {liveRanking.map((entry, index) => renderLeaderboardRow(entry, index, { keyPrefix: 'result' }))}
            </div>
          </section>
        ) : null}

        {phase === 'next_turn' ? (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{t('vom.transitionTitle')}</h2>
            <p>{t('vom.transitionBody')}</p>
          </section>
        ) : null}

        {phase === 'paused_poseur_disconnect' ? (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{t('vom.pausedTitle')}</h2>
            <p>{t('vom.pausedBody')}</p>
          </section>
        ) : null}

        {phase === 'finished' ? (
          <section className={styles.card} style={{ order: -1 }}>
            <h2 className={styles.sectionTitle}>{t('vom.finalDebrief')}</h2>
            <div className={styles.finalSummaryGrid}>
              <article className={styles.finalSummaryItem}>
                <strong>{ranking.length}</strong>
                <span>{t('vom.rankedParticipants')}</span>
              </article>
              <article className={styles.finalSummaryItem}>
                <strong>{totalCycles}</strong>
                <span>{t('vom.playedCycles')}</span>
              </article>
              <article className={styles.finalSummaryItem}>
                <strong>{ranking[0]?.score ?? 0}</strong>
                <span>{t('vom.bestScore')}</span>
              </article>
            </div>
            {!isFacilitator ? (
              <div className={`${styles.mainScoreCard} ${styles.finalWow}`}>
                <span className={styles.mainScoreLabel}>{t('vom.finalScore')}</span>
                <span className={styles.mainScoreValue}>{myScore}</span>
                <span className={styles.mainScoreUnit}>{t('vom.points')}</span>
              </div>
            ) : null}
            <div className={styles.finalBlock}>
              <h3 className={styles.sectionTitle}>{t('vom.finalRanking')}</h3>
              <div className={styles.leaderboardList}>
                {ranking.map((entry, index) => renderLeaderboardRow(entry, index, { compact: true, keyPrefix: 'final' }))}
              </div>
            </div>
          </section>
        ) : null}

        {hasChallengeStarted && phase !== 'finished' && phase !== 'round_result' ? (
          <section className={`${styles.card} ${styles.postStartSecondaryCard}`}>
            {renderRankingCard('poststart-main')}
          </section>
        ) : null}

        </div>

        <aside className={styles.sideColumn}>
          <div className="challenge-desktop-timer">
            <ChallengeTimerCard
              className={styles.desktopTimerCard}
              title={isEn ? 'Timer' : 'Minuteur'}
              remainingSeconds={remainingSecondsForCard}
              durationSeconds={Math.max(1, phaseDurationSeconds)}
              status={timerStatus}
              isFacilitator={isFacilitator}
              onPause={timerControls.pause}
              onResume={timerControls.resume}
              controlPending={timerControls.busy}
              controlFeedback={timerControls.feedback}
              waitingText=""
              footer={(phase === 'selecting_statement' || phase === 'voting_open') && remainingSecondsForCard <= 0 ? <p className={styles.timeUpFeedback}>{t('vom.timeoutFeedback')}</p> : null}
            />
          </div>

          <ChallengeChatCard
            title="Chat"
            messages={chatMessages}
            currentAuthor={displayName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            delivery={chatDelivery}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            maxLength={240}
            disabled={!chatEnabled}
          />
        </aside>
      </div>

      {selectionModalOpen && isPoser && selectedStatement ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setSelectionModalOpen(false)}>
          <section
            ref={selectionModalRef}
            tabIndex={-1}
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label={isEn ? 'Answer selection' : 'Sélection de réponse'}
            onClick={(event) => event.stopPropagation()}
          >
            {selectedStatementChoices ? (
              <>
                <p className={styles.choicePanelTitle}>
                  {selectedStatementChoices.prompt}{selectedStatementChoices.hasColon ? ':' : ''}
                </p>
                <div className={`${styles.choiceButtonsWrap} ${styles.answerHighlight}`}>
                  {poserSelectionOptions.map((option) => {
                    const active = selectedStatementOption.toLowerCase() === option.toLowerCase();
                    return (
                      <label key={option} className={styles.choiceRadioLabel}>
                        <input
                          type="radio"
                          name="poser-choice"
                          checked={active}
                          onChange={() => {
                            setSelectedChoicesByStatementId((prev) => ({
                              ...prev,
                              [selectedStatementId]: option
                            }));
                          }}
                        />
                        <span>{formatChoiceDisplay(option, locale)}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className={styles.choicePanelTitle}>{getTranslatedStatementText(selectedStatement, locale)}</p>
                <p className={styles.helper}>{t('vom.chooseTruth')}</p>
                <div className={`${styles.choiceButtonsWrap} ${styles.answerHighlight}`}>
                  {poserSelectionOptions.map((option) => {
                    const active = selectedStatementOption.toLowerCase() === option.toLowerCase();
                    return (
                      <label key={option} className={styles.choiceRadioLabel}>
                        <input
                          type="radio"
                          name="poser-choice"
                          checked={active}
                          onChange={() => {
                            setSelectedChoicesByStatementId((prev) => ({
                              ...prev,
                              [selectedStatementId]: option
                            }));
                          }}
                        />
                        <span>{formatChoiceDisplay(option, locale)}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setSelectionModalOpen(false)}>
                {t('vom.cancel')}
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!connected || isFacilitatorPaused || !selectedStatementOption}
                onClick={() => {
                  if (confirmStatement()) setSelectionModalOpen(false);
                }}
              >
                {t('vom.confirm')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
