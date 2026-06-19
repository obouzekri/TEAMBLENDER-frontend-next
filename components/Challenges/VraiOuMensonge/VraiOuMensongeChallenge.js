'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
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

function buildVomRulesAppend(isEn) {
  if (isEn) {
    return {
      facilitator: Object.freeze([
        'Each round lasts 40 seconds.',
        'Flow: the poser chooses or enters a statement, participants vote before the timer ends, then answers are compared automatically.',
        'Scoring: correct answer +1 point, wrong answer 0 point.',
        'Poser: if players are fooled +1 point, otherwise 0 point.',
        'Scores are updated in real time at the end of each round.'
      ]),
      participant: Object.freeze([
        'Each round lasts 40 seconds.',
        'The poser chooses or enters a statement, then participants vote before the timer ends.',
        'Scoring: correct answer +1 point, wrong answer 0 point.',
        'Poser: if players are fooled +1 point, otherwise 0 point.',
        'Scores are updated in real time after automatic comparison of answers.'
      ]),
    };
  }

  return {
    facilitator: Object.freeze([
      'Chaque tour dure 40 secondes.',
      'Déroulement : le poseur choisit ou saisit son affirmation, les participants votent avant la fin du chrono, puis les réponses sont comparées automatiquement.',
      'Calcul du score : bonne réponse +1 point, mauvaise réponse 0 point.',
      'Poseur : si les joueurs sont trompés +1 point, sinon 0 point.',
      'Les scores sont mis à jour en temps réel à la fin de chaque tour.'
    ]),
    participant: Object.freeze([
      'Chaque tour dure 40 secondes.',
      'Le poseur choisit ou saisit son affirmation, puis les participants votent avant la fin du chrono.',
      'Calcul du score : bonne réponse +1 point, mauvaise réponse 0 point.',
      'Poseur : si les joueurs sont trompés +1 point, sinon 0 point.',
      'Les scores sont mis à jour en temps réel après comparaison automatique des réponses.'
    ]),
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
    error,
    isFacilitator,
    emitEvent,
    participantId,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const { t, locale } = useI18n();

  const vom = state?.vom || {};
  const phase = String(vom?.phase || 'waiting_start');
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
  const chatEnabled = Boolean(socket);
  const hasSelectionTimeout = String(currentTurn?.result?.reveal_reason || '') === 'selection_timeout';

  const displayName = useMemo(() => {
    const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
    const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload && !isEmailLike(fromPayload)) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext && !isEmailLike(fromContext)) return fromContext;
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
      map.set(id, fullName || safeDisplayName || fallback);
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

  const usedByPoser = useMemo(() => {
    const byParticipant = vom?.used_statement_ids_by_participant || {};
    const ids = Array.isArray(byParticipant[poserId]) ? byParticipant[poserId] : [];
    return new Set(ids.map((value) => String(value)));
  }, [vom, poserId]);

  const myVote = String(currentTurn?.votes?.[me] || '');
  const roundHistory = Array.isArray(vom?.round_history) ? vom.round_history : [];
  const selectedStatement = useMemo(
    () => catalog.find((item) => String(item?.id || '') === String(selectedStatementId || '')) || null,
    [catalog, selectedStatementId]
  );
  useBodyScrollLock(selectionModalOpen && isPoser && Boolean(selectedStatement));

  const selectedStatementChoices = useMemo(
    () => parseStatementChoices(selectedStatement?.text || ''),
    [selectedStatement]
  );
  const selectedStatementOption = String(selectedChoicesByStatementId[selectedStatementId] || '');
  const votingChoices = Array.isArray(currentTurn?.statement_options) ? currentTurn.statement_options : [];
  const isChoiceVoting = votingChoices.length > 1;
  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config, undefined, locale),
    [runtimePayload?.config, state?.config, locale]
  );

  const vomRulesAppend = useMemo(() => buildVomRulesAppend(locale === 'en'), [locale]);

  const facilitatorRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.facilitator) ? rulesContent.facilitator : [];
    const merged = [...baseRules, ...vomRulesAppend.facilitator];
    return merged.filter((item, index) => merged.findIndex((candidate) => String(candidate).toLowerCase() === String(item).toLowerCase()) === index);
  }, [rulesContent?.facilitator, vomRulesAppend.facilitator]);

  const participantRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.participant) ? rulesContent.participant : [];
    const merged = [...baseRules, ...vomRulesAppend.participant];
    return merged.filter((item, index) => merged.findIndex((candidate) => String(candidate).toLowerCase() === String(item).toLowerCase()) === index);
  }, [rulesContent?.participant, vomRulesAppend.participant]);

  const poserSelectionOptions = useMemo(() => {
    if (selectedStatementChoices?.options?.length > 1) {
      return selectedStatementChoices.options;
    }
    return ['Vrai', 'Mensonge'];
  }, [selectedStatementChoices]);

  const remainingMs = useMemo(() => {
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
  }, [nowMs, phase, vom?.phase_deadline_ms, vom?.phase_started_at_ms, vom?.timing]);

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
  }, [hasSelectionTimeout, phase, remainingSecondsForCard]);

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

  function renderLeaderboardRow(entry, index, options = {}) {
    const participantKey = String(entry.participant_id);
    const movement = String(rankMovementByParticipantId[participantKey] || 'same');
    const movementGlyph = movement === 'up' ? '↑' : movement === 'down' ? '↓' : '→';
    const movementLabel = movement === 'up' ? 'En hausse' : movement === 'down' ? 'En baisse' : 'Stable';
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
            <span className={`${styles.rankDeltaBadge}${movement === 'up' ? ` ${styles.rankDeltaUp}` : movement === 'down' ? ` ${styles.rankDeltaDown}` : ''}`} aria-label={movementLabel}>{movementGlyph}</span>
          </div>
          <span className={styles.leaderAvatar}>{getInitials(participantName(participantKey))}</span>
          <div className={styles.leaderboardCopy}>
            <span className={styles.leaderboardLine}>{participantName(participantKey)}</span>
            <span className={styles.leaderboardSubline}>
              {participantKey === me ? 'Vous' : participantKey === poserId ? t('vom.poserLabel') : `Rang #${entry.rank}`}
            </span>
          </div>
        </div>
        <div className={styles.leaderboardScoreWrap}>
          <div className={styles.leaderboardScoreTopline}>
            <span className={styles.leaderboardScore}>{entry.score} pts</span>
            {medal ? <span className={styles.leaderboardReward}>{medal}</span> : null}
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
    emitEvent('vom.start', {});
  }

  function confirmStatement() {
    if (!selectedStatementId) return;
    if (!selectedStatementOption) return;
    playLightTone('default');
    emitEvent('vom.select_statement', {
      statement_id: selectedStatementId,
      selected_option: selectedStatementOption
    });
  }

  function vote(v) {
    playLightTone('default');
    emitEvent('vom.vote', { vote: v });
  }

  const myRoundBadges = [];
  if (phase === 'round_result') {
    if (myRoundVote?.status === 'correct') {
      myRoundBadges.push(t('vom.badges.good'));
    }
    if (myRoundVote?.status === 'incorrect') {
      myRoundBadges.push(t('vom.badges.bad'));
    }
  }
  if (myLiveEntry?.rank === 1) {
    myRoundBadges.push(t('vom.badges.top'));
  }
  if (myCorrectStreak >= 2) {
    myRoundBadges.push(t('vom.badges.streak', { count: myCorrectStreak }));
  }

  return (
    <div className={styles.shell}>
      <ChallengeHeader
        title={t('vom.title')}
        subtitle={t('vom.subtitle')}
      />

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>

        {!hasChallengeStarted ? (
          <section className={styles.card}>
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName={t('vom.title')}
              objective={rulesContent.objective}
              facilitatorRules={facilitatorRules}
              participantRules={participantRules}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? startChallenge : null}
            />
          </section>
        ) : null}

        {phase === 'selecting_statement' ? (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{t('vom.selectingTitle')}</h2>
            <p>{t('vom.currentPoser', { name: participantName(poserId) || '-' })}</p>
            <p className={styles.instruction}>{t('vom.selectingInstruction')}</p>
            <div className={styles.participantsRow}>
              {orderedParticipantIds.map((id) => (
                <span
                  key={id}
                  className={`${styles.participantChip}${id === poserId ? ` ${styles.participantChipPoser}` : ''}${id === me ? ` ${styles.participantChipMe}` : ''}`}
                >
                  {participantName(id)}{id === poserId ? ` ${t('vom.poserLabel')}` : ''}
                </span>
              ))}
            </div>
            {isPoser ? (
              <>
                <div className={styles.statementGrid}>
                  {catalog.map((statement, index) => {
                    const disabled = usedByPoser.has(String(statement.id));
                    const selected = selectedStatementId === String(statement.id);
                    const parsedChoices = parseStatementChoices(statement.text);
                    const pickedChoice = String(selectedChoicesByStatementId[String(statement.id)] || '');
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
                        <span className={styles.category}>{statement.category}</span>
                        {parsedChoices ? (
                          <>
                            <span className={styles.statementPrompt}>
                              {parsedChoices.prompt}{parsedChoices.hasColon ? ':' : ''}
                            </span>
                            <span className={styles.statementOptionsPreview}>
                              {parsedChoices.options.join(' / ')}
                            </span>
                            {selected && pickedChoice ? <small>{t('vom.selectedOption', { option: pickedChoice })}</small> : null}
                          </>
                        ) : (
                          <span>{statement.text}</span>
                        )}
                        {selected ? <span className={styles.selectedMark}>{t('vom.selected')}</span> : null}
                        {disabled ? <small>{t('vom.alreadyUsed')}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className={styles.helper}>{t('vom.poserHelper')}</p>
            )}
          </section>
        ) : null}

        {phase === 'voting_open' ? (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{t('vom.votingTitle')}</h2>
            <div className={styles.votePhaseHeader}>
              <p className={styles.votePhaseTitle}>{t('vom.poserAsks', { name: participantName(poserId) })}</p>
              <p className={styles.votePhaseStatement}>"{currentTurn?.statement_prompt || currentTurn?.statement_text || '-'}"</p>
            </div>
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
                      >
                        {option}
                      </button>
                    );
                  })
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.voteTrue}${myVote === 'vrai' ? ` ${styles.voteActive}` : ''}`}
                      onClick={() => vote('vrai')}
                    >
                      {t('vom.voteTrue')}
                    </button>
                    <button
                      type="button"
                      className={`${styles.voteFalse}${myVote === 'mensonge' ? ` ${styles.voteActive}` : ''}`}
                      onClick={() => vote('mensonge')}
                    >
                      {t('vom.voteFalse')}
                    </button>
                  </>
                )}
                <p className={styles.voteStatus}>{t('vom.currentVote', { vote: myVote === 'vrai' ? t('vom.voteTrue') : myVote === 'mensonge' ? t('vom.voteFalse') : myVote || t('vom.absent') })}</p>
              </div>
            ) : isFacilitator ? (
              <p className={styles.helper}>{t('vom.facilitatorObserve')}</p>
            ) : (
              <p className={styles.helper}>{t('vom.poserNoVote')}</p>
            )}
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
                  <span className={`${styles.resultStatusBadge}${myRoundPoints > 0 ? ` ${styles.resultStatusSuccess}` : ''}`}>
                    {hasSelectionTimeout ? '⏳' : isPoser ? (poseurRoundPoints > 0 ? '🎯' : '•') : myRoundVote?.status === 'correct' ? '✅' : myRoundVote?.status === 'incorrect' ? '❌' : '•'}
                    {myRoundPoints > 0 ? ` +${myRoundPoints} pts` : ' 0 pt'}
                  </span>
                </div>
                <strong className={styles.wowTitle}>{hasSelectionTimeout ? 'Tour interrompu' : isPoser ? 'Bluff révélé' : myRoundVote?.status === 'correct' ? 'Bien joué' : 'Réponse révélée'}</strong>
                {hasSelectionTimeout ? (
                  <p className={styles.wowText}>Temps ecoule: le poseur n a pas pose la question a temps. 0 point et passage au participant suivant.</p>
                ) : !isPoser ? (
                  <p className={styles.wowText}>
                    {myRoundVote?.status === 'correct'
                      ? t('vom.correctFeedback', { truth: String(currentTurn?.revealed_truth || '-') })
                      : t('vom.incorrectFeedback', { truth: String(currentTurn?.revealed_truth || '-') })}
                  </p>
                ) : (
                  <p className={styles.wowText}>
                    {t('vom.poserFeedback', { points: poseurRoundPoints })}
                  </p>
                )}
              </div>
              <div className={styles.mainScoreCard}>
                <span className={styles.mainScoreLabel}>{t('vom.myScore')}</span>
                <span className={`${styles.mainScoreValue}${resultPulse ? ` ${styles.mainScoreValuePulse}` : ''}`}>{myScore}</span>
                <span className={styles.mainScoreUnit}>{t('vom.points')}</span>
                <div className={styles.scoreDeltaRow}>
                  <span className={`${styles.scoreDeltaChip}${myRoundPoints > 0 ? ` ${styles.scoreDeltaChipPositive}` : ''}`}>{myRoundPoints > 0 ? `+${myRoundPoints}` : '0'} pt</span>
                  <span className={styles.scoreRankChip}>{myRankMedal || `#${myRank || '-'}`} {myRoundMovement === 'up' ? '↑' : myRoundMovement === 'down' ? '↓' : '→'}</span>
                </div>
              </div>
            </div>

            {myRoundBadges.length > 0 ? (
              <div className={styles.badgesRow}>
                {myRoundBadges.map((badge) => (
                  <span key={badge} className={styles.badgeChip}>{badge}</span>
                ))}
              </div>
            ) : null}

            <div className={styles.resultMetaBar}>
              <p className={styles.resultTransition}>{t('vom.transitionText', { clock: formatClock(formatSeconds(remainingMs)) })}</p>
              <span className={styles.resultFactChip}>{liveRanking.length} joueurs classés</span>
              <span className={styles.resultFactChip}>Top score {liveRanking[0]?.score ?? 0} pts</span>
            </div>
            <div className={styles.resultListDense}>
              {(currentTurn?.result?.votes || []).map((item) => (
                <div key={item.participant_id} className={styles.resultRow}>
                  <span className={styles.resultParticipantWrap}>
                    <span className={styles.inlineAvatar}>{getInitials(participantName(item.participant_id))}</span>
                    <span>{participantName(item.participant_id)}</span>
                  </span>
                  <span className={styles.resultStatusText}>{item.status === 'correct' ? '✅ Correct' : item.status === 'incorrect' ? '❌ Incorrect' : item.status}</span>
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
            <div className={`${styles.mainScoreCard} ${styles.finalWow}`}>
              <span className={styles.mainScoreLabel}>{t('vom.finalScore')}</span>
              <span className={styles.mainScoreValue}>{myScore}</span>
              <span className={styles.mainScoreUnit}>{t('vom.points')}</span>
            </div>
            <div className={styles.finalBlock}>
              <h3 className={styles.sectionTitle}>{t('vom.finalRanking')}</h3>
              <div className={styles.leaderboardList}>
                {ranking.map((entry, index) => renderLeaderboardRow(entry, index, { compact: true, keyPrefix: 'final' }))}
              </div>
            </div>
          </section>
        ) : null}
        </div>

        <aside className={styles.sideColumn}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName="Pari sur moi !"
            objective={rulesContent.objective}
            facilitatorRules={facilitatorRules}
            participantRules={participantRules}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={remainingSecondsForCard}
            durationSeconds={Math.max(1, phaseDurationSeconds)}
            status={timerStatus}
            isFacilitator={isFacilitator}
            waitingText=""
            footer={(phase === 'selecting_statement' || phase === 'voting_open') && remainingSecondsForCard <= 0 ? <p className={styles.timeUpFeedback}>{t('vom.timeoutFeedback')}</p> : null}
          />

          <ChallengeChatCard
            title="Chat"
            messages={chatMessages}
            currentAuthor={displayName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            placeholder="Écrire un message"
            maxLength={240}
            disabled={!chatEnabled}
          />

          <section className={`${styles.rankingCard} ${styles.stateCard}`}>
            <div className={styles.rankingCardHeader}>
              <h3 className={`${styles.rankingCardTitle} challenge-section-title`}>Classement</h3>
              <span className={styles.rankingMeta}>Mis a jour en direct</span>
            </div>
            <div className={styles.leaderboardList}>
              {liveRanking.length === 0 ? <p className={styles.helper}>{t('vom.noParticipants')}</p> : null}
              {liveRanking.map((entry, index) => renderLeaderboardRow(entry, index, { compact: true, keyPrefix: 'aside' }))}
            </div>
          </section>
        </aside>
      </div>

      {selectionModalOpen && isPoser && selectedStatement ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setSelectionModalOpen(false)}>
          <section
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label="Sélection de réponse"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{t('vom.yourQuestion')}</h3>
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
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className={styles.choicePanelTitle}>{selectedStatement.text}</p>
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
                        <span>{option}</span>
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
                disabled={!selectedStatementOption}
                onClick={() => {
                  confirmStatement();
                  setSelectionModalOpen(false);
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
