'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getTheQuizRulesPreset } from '@/lib/challenges/theQuizRules';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeHeader from '../ChallengeHeader';
import {
  QuizFinalScreen,
  QuizHostResponsesScreen,
  QuizLeaderboardScreen,
  QuizQuestionResultScreen,
  QuizQuestionScreen,
} from './TheQuizScreens';
import { THE_QUIZ_PLACEHOLDER_QUESTION, buildPlaceholderLeaderboard } from './theQuiz.schema';
import styles from './TheQuiz.module.css';
import useI18n from '@/lib/i18n/useI18n';

function normalizeDisplayName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function buildFallbackQuiz(runtimePayload, state, isFacilitator) {
  const config = state?.config || runtimePayload?.config || {};
  const participants = Array.isArray(state?.quiz?.participants) ? state.quiz.participants : [];

  return {
    phase: 'lobby',
    placeholder_mode: true,
    question_count: Number(config?.question_count || 9),
    question_duration_seconds: Number(config?.question_duration_seconds || config?.timer?.duration_seconds || 30),
    connected_count: Number(state?.participants_status?.connected_count || participants.length || 0),
    slot_count: Number(state?.participants_status?.slot_count || participants.length || 0),
    ready_count: Number(state?.quiz?.ready_count || 0),
    chat_enabled: config?.chat?.enabled !== false,
    quick_reactions_enabled: config?.chat?.quick_reactions_enabled !== false,
    leaderboard_enabled: config?.leaderboard?.enabled !== false,
    participants,
    question_index: 0,
    current_question: state?.quiz?.current_question || THE_QUIZ_PLACEHOLDER_QUESTION,
    latest_question_result: state?.quiz?.latest_question_result || {
      correct_choice_index: 0,
      explanation: THE_QUIZ_PLACEHOLDER_QUESTION.explanation,
    },
    leaderboard: buildPlaceholderLeaderboard(participants),
    final_standings: buildPlaceholderLeaderboard(participants),
    answer_count: Math.max(0, Math.floor((participants.length || 4) / 2)),
    can_control: Boolean(isFacilitator),
  };
}

function getQuestionId(quiz) {
  return String(
    quiz?.current_question?.id
    || `${String(quiz?.phase || 'lobby')}:${Number(quiz?.question_index || 0)}`
  );
}

function buildRankMap(entries = []) {
  return (Array.isArray(entries) ? entries : []).reduce((acc, item) => {
    const id = String(item?.participant_id || '');
    if (!id) return acc;
    acc[id] = Number(item?.rank || 0);
    return acc;
  }, {});
}

export default function TheQuizChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const rulesPreset = useMemo(() => getTheQuizRulesPreset(locale), [locale]);
  const [forcedPhase, setForcedPhase] = useState('');
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [unreadChatPulse, setUnreadChatPulse] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [reconnectState, setReconnectState] = useState('connected');
  const [transientQuestionResult, setTransientQuestionResult] = useState(null);
  const previousRanksRef = useRef({});
  const lastQuestionIdRef = useRef('');
  const lastChatMessageIdRef = useRef('');
  const localTransitionTimerRef = useRef(null);
  const reconnectSeenDisconnectRef = useRef(false);

  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const rawQuiz = state?.quiz || null;
  const quiz = useMemo(
    () => ({
      ...buildFallbackQuiz(runtimePayload, state, isFacilitator),
      ...(rawQuiz || {}),
      leaderboard: Array.isArray(rawQuiz?.leaderboard) && rawQuiz.leaderboard.length > 0
        ? rawQuiz.leaderboard
        : buildPlaceholderLeaderboard(rawQuiz?.participants || []),
      final_standings: Array.isArray(rawQuiz?.final_standings) && rawQuiz.final_standings.length > 0
        ? rawQuiz.final_standings
        : buildPlaceholderLeaderboard(rawQuiz?.participants || []),
      current_question: rawQuiz?.current_question || THE_QUIZ_PLACEHOLDER_QUESTION,
      latest_question_result: rawQuiz?.latest_question_result || {
        correct_choice_index: 0,
        explanation: THE_QUIZ_PLACEHOLDER_QUESTION.explanation,
      },
    }),
    [runtimePayload, state, isFacilitator, rawQuiz]
  );

  useEffect(() => {
    if (!Array.isArray(events) || events.length === 0) return;
    const latest = events[0];
    const type = String(latest?.type || '').trim();
    const payload = latest?.payload || {};

    if (type === 'question_finished') {
      setTransientQuestionResult(payload);
      setForcedPhase('question_result');
      if (localTransitionTimerRef.current) {
        window.clearTimeout(localTransitionTimerRef.current);
      }
      localTransitionTimerRef.current = window.setTimeout(() => {
        setForcedPhase('');
      }, 1400);
    }

    if (type === 'question_started' || type === 'session_finished') {
      if (localTransitionTimerRef.current) {
        window.clearTimeout(localTransitionTimerRef.current);
      }
      setForcedPhase('');
    }
  }, [events]);

  useEffect(() => {
    return () => {
      if (localTransitionTimerRef.current) {
        window.clearTimeout(localTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const questionId = getQuestionId(quiz);
    if (lastQuestionIdRef.current !== questionId) {
      lastQuestionIdRef.current = questionId;
      setSelectedAnswerIndex(null);
      setAnswerLocked(false);
    }
  }, [quiz]);

  useEffect(() => {
    const endsAtValue = quiz?.question_ends_at;
    if (!endsAtValue || String(quiz?.phase || '') !== 'question_live') {
      setRemainingSeconds(Number(quiz?.question_duration_seconds || 0));
      return;
    }

    function refreshRemaining() {
      const endMs = new Date(endsAtValue).getTime();
      if (!Number.isFinite(endMs)) {
        setRemainingSeconds(Number(quiz?.question_duration_seconds || 0));
        return;
      }
      const next = Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
      setRemainingSeconds(next);
    }

    refreshRemaining();
    const timer = window.setInterval(refreshRemaining, 250);
    return () => window.clearInterval(timer);
  }, [quiz?.question_ends_at, quiz?.phase, quiz?.question_duration_seconds]);

  useEffect(() => {
    if (!socket || !socket.connected) return;
    emitEvent('quiz.request_state', {});
  }, [socket, socket?.connected, emitEvent]);

  useEffect(() => {
    if (!socket) return;
    if (socket.connected) {
      setReconnectState(reconnectSeenDisconnectRef.current ? 'reconnected' : 'connected');
      const timer = window.setTimeout(() => setReconnectState('connected'), 2200);
      return () => window.clearTimeout(timer);
    }
    reconnectSeenDisconnectRef.current = true;
    setReconnectState('reconnecting');
    return undefined;
  }, [socket, socket?.connected]);

  const rules = useMemo(() => ({
    objective: rulesPreset.objective,
    facilitator: [...rulesPreset.facilitator],
    participant: [...rulesPreset.participant, ...rulesPreset.scoring],
    footnote: rulesPreset.footnote,
  }), [rulesPreset]);
  const challengeName = String(rulesPreset?.challengeName || 'The Quiz').trim();
  const challengeSubtitle = String(rulesPreset?.subtitle || '').trim();
  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset.participants.min,
    recommended: rulesPreset.participants.recommended,
    max: rulesPreset.participants.max,
  }), [rulesPreset]);

  const chatEnabled = Boolean(socket) && quiz.chat_enabled;
  const author = normalizeDisplayName(
    context?.displayName || runtimePayload?.context?.displayName,
    isFacilitator ? (isEn ? 'Host' : 'Animateur') : 'Participant'
  );
  const {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
    sendQuickChat,
  } = useChallengeChat({
    socket,
    emitEvent,
    author,
    enabled: chatEnabled,
    maxMessages: 100,
    maxLength: 240,
  });

  const quickMessages = useMemo(
    () => [...DEFAULT_CHALLENGE_QUICK_MESSAGES],
    []
  );

  useEffect(() => {
    if (!Array.isArray(chatMessages) || chatMessages.length === 0) return;
    const latest = chatMessages[chatMessages.length - 1];
    const latestId = String(latest?.id || '');
    if (!latestId || latestId === lastChatMessageIdRef.current) return;
    lastChatMessageIdRef.current = latestId;

    if (String(latest?.author || '') !== author) {
      setUnreadChatPulse(true);
      setUnreadChatCount((value) => value + 1);
      const timer = window.setTimeout(() => setUnreadChatPulse(false), 1800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [chatMessages, author]);

  useEffect(() => {
    if (chatInput) {
      setUnreadChatCount(0);
    }
  }, [chatInput]);

  const rankMovementByParticipantId = useMemo(() => {
    const currentRanks = buildRankMap(quiz.leaderboard || []);
    const previous = previousRanksRef.current;
    const movement = {};

    Object.keys(currentRanks).forEach((participantId) => {
      const prevRank = Number(previous[participantId] || 0);
      const nextRank = Number(currentRanks[participantId] || 0);
      if (!prevRank || !nextRank) return;
      if (nextRank < prevRank) movement[participantId] = 'up';
      if (nextRank > prevRank) movement[participantId] = 'down';
    });

    previousRanksRef.current = currentRanks;
    return movement;
  }, [quiz.leaderboard]);

  const activePhase = forcedPhase || String(quiz.phase || 'lobby');
  const phaseQuizView = useMemo(() => {
    if (activePhase !== 'question_result' || !transientQuestionResult) return quiz;
    return {
      ...quiz,
      latest_question_result: {
        ...(quiz.latest_question_result || {}),
        ...(transientQuestionResult || {}),
      },
    };
  }, [quiz, activePhase, transientQuestionResult]);

  const participantsTotal = Math.max(
    Number(quiz?.slot_count || 0),
    Array.isArray(quiz?.participants) ? quiz.participants.length : 0,
    Number(quiz?.connected_count || 0),
    1
  );
  const participantsAnsweredCount = Number(quiz?.answer_count || 0);
  const isStarted = activePhase !== 'lobby';
  const connectedCount = Number(quiz?.connected_count || 0);
  const canStartQuiz = connectedCount >= 2;
  const timerStatus = activePhase === 'question_live'
    ? 'running'
    : String(quiz?.status || '').trim().toLowerCase() === 'paused'
      ? 'paused'
      : activePhase === 'final_score'
        ? 'completed'
        : 'idle';
  const timerRemainingSeconds = activePhase === 'question_live'
    ? remainingSeconds
    : Number(quiz?.question_duration_seconds || 30);
  const timerDurationSeconds = Number(quiz?.question_duration_seconds || 30);

  function handleHostAction(type) {
    if (!type) return;
    emitEvent(type, {});
  }

  function handleSubmitAnswer() {
    if (!Number.isInteger(Number(selectedAnswerIndex)) || answerLocked) return;
    emitEvent('quiz.answer.submit', {
      selected_option: Number(selectedAnswerIndex),
    });
    setAnswerLocked(true);
  }

  useEffect(() => {
    if (activePhase !== 'question_live' || isFacilitator) return;

    function onKeyDown(event) {
      if (answerLocked) return;
      const key = String(event.key || '').trim();
      if (['1', '2', '3', '4'].includes(key)) {
        event.preventDefault();
        setSelectedAnswerIndex(Number(key) - 1);
      }
      if (key === 'Enter' && Number.isInteger(Number(selectedAnswerIndex))) {
        event.preventDefault();
        handleSubmitAnswer();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePhase, isFacilitator, answerLocked, selectedAnswerIndex]);

  function renderParticipantScreen() {
    if (activePhase === 'question_live') {
      return (
        <QuizQuestionScreen
          isEn={isEn}
          quiz={phaseQuizView}
          selectedAnswerIndex={selectedAnswerIndex}
          onSelectAnswer={setSelectedAnswerIndex}
          isAnswerLocked={answerLocked}
          remainingSeconds={remainingSeconds}
          totalSeconds={Number(quiz.question_duration_seconds || 30)}
          participantsAnsweredCount={participantsAnsweredCount}
          participantsTotal={participantsTotal}
          onSubmitAnswer={handleSubmitAnswer}
        />
      );
    }
    if (activePhase === 'leaderboard_live') {
      return <QuizLeaderboardScreen isEn={isEn} quiz={phaseQuizView} rankMovementByParticipantId={rankMovementByParticipantId} />;
    }
    if (activePhase === 'question_result') {
      return <QuizQuestionResultScreen isEn={isEn} quiz={phaseQuizView} />;
    }
    if (activePhase === 'final_score') {
      return <QuizFinalScreen isEn={isEn} quiz={phaseQuizView} />;
    }

    return (
      <section className={styles.screenCard}>
        <div className={styles.screenHeader}>
          <div>
            <p className={styles.kicker}>The Quiz</p>
            <h2 className={styles.screenTitle}>{isEn ? 'Real-time session setup' : 'Préparation de la session en temps réel'}</h2>
          </div>
          <span className={styles.phaseBadge}>{isEn ? 'Ready' : 'Prêt'}</span>
        </div>

        <p className={styles.helperText}>{isEn ? 'The challenge starts as soon as the host launches the session.' : 'Le challenge démarre dès que l’animateur lance la session.'}</p>
      </section>
    );
  }

  return (
    <main className={styles.pageShell}>
      <ChallengeHeader
        title={challengeName}
        subtitle={challengeSubtitle || (isEn ? 'Real-time multiplayer general knowledge quiz' : 'Quiz multijoueur realtime de culture générale')}
      />

      <section className={styles.challengeBoard}>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}
        {reconnectState === 'reconnecting' ? <div className={styles.reconnectBanner}>{isEn ? 'Reconnecting, restoring active question...' : 'Reconnexion en cours, restauration de la question active...'}</div> : null}
        {reconnectState === 'reconnected' ? <div className={styles.reconnectBannerSuccess}>{isEn ? 'Connection restored' : 'Connexion restaurée'}</div> : null}

        <section className={styles.mainGrid}>
          <div className={styles.primaryColumn}>
            {!isStarted ? (
              <ChallengeRulesPanel
                challengeName={challengeName}
                isStarted={isStarted}
                isFacilitator={isFacilitator}
                showPrestartCard
                objective={rules.objective}
                participantsMeta={rulesParticipantsMeta}
                facilitatorRules={rules.facilitator}
                participantRules={rules.participant}
                footnote={rules.footnote}
                onStart={isFacilitator ? () => handleHostAction('quiz.session.start') : null}
                startDisabled={!canStartQuiz}
              />
            ) : (
              <div className={styles.phaseTransitionCard}>
                {renderParticipantScreen()}
              </div>
            )}

            {transientQuestionResult && activePhase === 'question_result' ? (
              <div className={styles.autoTransitionHint} aria-live="polite">
                {isEn ? 'Auto transition to the next question...' : 'Transition automatique vers la prochaine question...'}
              </div>
            ) : null}

            {isFacilitator && isStarted ? (
              <section className={styles.hostPanel}>
                <QuizHostResponsesScreen isEn={isEn} quiz={quiz} />
              </section>
            ) : null}
          </div>

          <aside className={styles.sideColumn}>
            {isStarted ? (
              <ChallengeRulesPanel
                challengeName={challengeName}
                isStarted={isStarted}
                isFacilitator={isFacilitator}
                showPrestartCard={false}
                objective={rules.objective}
                participantsMeta={rulesParticipantsMeta}
                facilitatorRules={rules.facilitator}
                participantRules={rules.participant}
                footnote={rules.footnote}
              />
            ) : null}

            {!isStarted && isFacilitator && !canStartQuiz ? (
              <p className={styles.helperText}>
                {isEn
                  ? 'At least 2 participants must be connected to start the challenge.'
                  : 'Au moins 2 participants doivent etre connectes pour demarrer le challenge.'}
              </p>
            ) : null}

            <ChallengeTimerCard
              title={isEn ? 'Timer' : 'Chrono'}
              remainingSeconds={timerRemainingSeconds}
              durationSeconds={timerDurationSeconds}
              status={timerStatus}
              isFacilitator={isFacilitator}
              waitingText=""
            />

            {chatEnabled ? (
              <div className={`${styles.chatWrap} ${unreadChatPulse ? styles.chatWrapPulse : ''}`}>
                {unreadChatCount > 0 ? <span className={styles.chatNotifBadge}>{unreadChatCount}</span> : null}
                <ChallengeChatCard
                title={isEn ? 'Live chat' : 'Chat live'}
                messages={chatMessages}
                currentAuthor={author}
                inputValue={chatInput}
                onInputChange={setChatInput}
                onSubmit={submitChat}
                quickMessages={quiz.quick_reactions_enabled ? quickMessages : []}
                onQuickMessage={sendQuickChat}
                placeholder={isEn ? 'Send a message or quick reaction' : 'Envoyer un message ou une réaction rapide'}
                emptyText={isEn ? 'No messages yet.' : 'Aucun message pour le moment.'}
                />
              </div>
            ) : (
              <section className={styles.screenCard}>
                <div className={styles.screenHeader}>
                  <div>
                    <p className={styles.kicker}>Chat</p>
                    <h2 className={styles.screenTitle}>{isEn ? 'Chat disabled for this session' : 'Chat désactivé pour cette session'}</h2>
                  </div>
                </div>
                <p className={styles.helperText}>{isEn ? 'The challenge still keeps real-time leaderboard and round progression.' : 'Le challenge conserve néanmoins la structure temps réel pour le leaderboard et la progression de manche.'}</p>
              </section>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}