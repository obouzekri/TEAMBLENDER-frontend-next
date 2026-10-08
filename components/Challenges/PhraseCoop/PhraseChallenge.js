'use client';
import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useFacilitatorTimerControls from '@/lib/challenges/useFacilitatorTimerControls';
import useConfirmedAction from '@/lib/challenges/useConfirmedAction';
import ChallengeActionFeedback from '../ChallengeActionFeedback';
import { refreshChallengeStateBeforeStart } from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getPhraseMystereRulesPreset } from '@/lib/challenges/phraseMystereRules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeHeader from '../ChallengeHeader';
import useI18n from '@/lib/i18n/useI18n';
import styles from './PhraseCoop.module.css';

function computeCompletionPercent(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return 0;
  const ok = slots.filter((slot) => slot?.is_correct === true).length;
  return Math.round((ok / slots.length) * 100);
}

function formatWord(word) {
  const normalized = String(word || '').trim();
  if (!normalized) return '';
  return normalized.replace(/_\d+_\d+$/, '');
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatDuration(secondsValue) {
  const total = Math.max(0, Math.floor(toNumber(secondsValue, 0)));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildFallbackAvailableWords(slots, participantSlot, fakeWordsBySlot) {
  const slotNumber = Number(participantSlot || 0);
  if (!slotNumber || !Array.isArray(slots)) {
    return [];
  }

  const assignedWords = slots
    .filter((slot) => Number(slot?.assigned_slot) === slotNumber)
    .map((slot) => String(slot?.expected_word || '').trim())
    .filter(Boolean);

  const fakeWords = Array.isArray(fakeWordsBySlot?.[String(slotNumber)])
    ? fakeWordsBySlot[String(slotNumber)].map((word) => String(word || '').trim()).filter(Boolean)
    : [];

  const allWords = [...assignedWords, ...fakeWords];
  if (!allWords.length) {
    return [];
  }

  // Keep duplicates valid by decrementing placed occurrences only once per matching word.
  const placedCounts = new Map();
  slots
    .filter((slot) => Number(slot?.assigned_slot) === slotNumber)
    .forEach((slot) => {
      const placedWord = String(slot?.current_word || '').trim();
      if (!placedWord) return;
      placedCounts.set(placedWord, Number(placedCounts.get(placedWord) || 0) + 1);
    });

  return allWords.filter((word) => {
    const count = Number(placedCounts.get(word) || 0);
    if (count <= 0) return true;
    placedCounts.set(word, count - 1);
    return false;
  });
}

export default function PhraseChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const [selectedWord, setSelectedWord] = useState('');
  const [draggingWord, setDraggingWord] = useState('');
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState(null);
  const {
    state,
    error,
    isFacilitator,
    emitEvent,
    connected,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const action = useConfirmedAction({ socket, emitEvent, state });
  const timerControls = useFacilitatorTimerControls({ socket, emitEvent, state, isFacilitator });

  const slots = Array.isArray(state?.phrase?.slots) ? state.phrase.slots : [];
  const participantSlot = Number(state?.participantSlot || 0) || null;
  const availableWords = useMemo(() => {
    const wordsFromState = Array.isArray(state?.phrase?.available_words)
      ? state.phrase.available_words.map((word) => String(word || '').trim()).filter(Boolean)
      : [];

    if (wordsFromState.length > 0) {
      return wordsFromState;
    }

    const wordsFromSlotMap = Array.isArray(state?.phrase?.available_words_by_slot?.[String(participantSlot || '')])
      ? state.phrase.available_words_by_slot[String(participantSlot || '')]
        .map((word) => String(word || '').trim())
        .filter(Boolean)
      : [];

    if (wordsFromSlotMap.length > 0) {
      return wordsFromSlotMap;
    }

    return buildFallbackAvailableWords(slots, participantSlot, state?.phrase?.fake_words_by_slot || {});
  }, [
    slots,
    participantSlot,
    state?.phrase?.available_words,
    state?.phrase?.available_words_by_slot,
    state?.phrase?.fake_words_by_slot,
  ]);
  const timer = state?.timer || null;
  const timerStatus = String(timer?.status || 'idle').trim();
  const normalizedTimerStatus = timerStatus.toLowerCase();
  const hasChallengeStarted = timer?.enabled === false
    || normalizedTimerStatus === 'running'
    || normalizedTimerStatus === 'paused'
    || normalizedTimerStatus === 'completed'
    || normalizedTimerStatus === 'stopped'
    || normalizedTimerStatus === 'timeout';
  const canPlay = connected && !action.busy && (timer?.enabled === false || timerStatus === 'running');
  const completion = useMemo(() => computeCompletionPercent(slots), [slots]);
  const modeVisionLimitee = state?.config?.modeVisionLimitee === true;
  const modeCommunication = String(state?.config?.modeCommunication || 'libre').trim().toLowerCase();
  const chatEnabled = state?.config?.chat?.enabled !== false && !(modeCommunication === 'restreint' && !isFacilitator);

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    const userId = String(context?.userId || context?.participantId || '').trim();
    return `participant-${userId || 'unknown'}`;
  }, [runtimePayload, context]);

  const mySlots = useMemo(() => {
    if (!participantSlot) return [];
    return slots.filter((slot) => Number(slot?.assigned_slot) === participantSlot);
  }, [slots, participantSlot]);

  const groupedWords = useMemo(
    () => availableWords.map((word, idx) => ({ id: `w-${idx}-${word}`, value: String(word || '').trim() })).filter((entry) => entry.value),
    [availableWords]
  );

  const summary = state?.summary || null;
  const summaryCompletion = Math.max(0, Math.min(100, Math.round(toNumber(summary?.completion_percent, completion))));
  const summaryTimeSeconds = Math.max(0, Math.round(toNumber(summary?.total_time_seconds, 0)));
  const summaryActions = Math.max(0, Math.round(toNumber(summary?.action_count, 0)));
  const summaryMessages = Math.max(0, Math.round(toNumber(summary?.message_count, 0)));
  const summaryScore = Math.max(0, Math.round(toNumber(summary?.collective_score, 0)));
  const summaryTotalWords = Math.max(0, Math.round(toNumber(summary?.total_words, slots.length)));
  const summarySolvedWords = Math.max(0, Math.round(toNumber(summary?.correct_words, (summaryCompletion / 100) * summaryTotalWords)));
  const decoyRisk = Math.max(0, summaryActions - summarySolvedWords);
  const hintBudget = Math.max(0, Number(state?.phrase?.hint_budget ?? state?.config?.nombreIndices ?? runtimePayload?.config?.nombreIndices ?? 2));
  const rulesPreset = useMemo(() => getPhraseMystereRulesPreset(locale, hintBudget), [locale, hintBudget]);
  const hintsUsed = Number(state?.phrase?.hints_used || 0);
  const remainingHints = Math.max(0, hintBudget - hintsUsed);
  const rulesContent = useMemo(() => ({
    objective: rulesPreset.objective,
    facilitator: [...rulesPreset.facilitator],
    participant: [...rulesPreset.participant, ...rulesPreset.hints],
    footnote: rulesPreset.footnote,
  }), [rulesPreset]);
  const challengeName = String(rulesPreset?.challengeName || 'Phrase Mystère').trim();
  const challengeSubtitle = String(rulesPreset?.subtitle || '').trim();
  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset.participants.min,
    recommended: rulesPreset.participants.recommended,
    max: rulesPreset.participants.max,
  }), [rulesPreset]);

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

  function placeOnSlot(slot, word = selectedWord) {
    const wordToPlace = String(word || '').trim();
    if (!slot || !wordToPlace || !canPlay) return;
    const index = Number(slot.index);
    action.run({
      type: 'phrase.place',
      payload: { index, word: wordToPlace },
      isAvailable: (snapshot) => snapshot?.phrase?.slots?.some((entry) => Number(entry.index) === index && Number(entry.assigned_slot) === Number(snapshot.participantSlot)),
      isConfirmed: (snapshot) => snapshot?.phrase?.slots?.some((entry) => Number(entry.index) === index && entry.current_word === wordToPlace),
      onConfirmed: () => setSelectedWord((current) => current === wordToPlace ? '' : current),
    });
  }

  function clearSlot(slot) {
    if (!slot || !canPlay) return;
    const index = Number(slot.index);
    action.run({
      type: 'phrase.clear',
      payload: { index },
      isAvailable: (snapshot) => snapshot?.phrase?.slots?.some((entry) => Number(entry.index) === index && Number(entry.assigned_slot) === Number(snapshot.participantSlot)),
      isConfirmed: (snapshot) => snapshot?.phrase?.slots?.some((entry) => Number(entry.index) === index && !entry.current_word),
    });
  }

  function onWordDragStart(event, wordValue) {
    if (!canPlay) {
      event.preventDefault();
      return;
    }
    const normalized = String(wordValue || '').trim();
    if (!normalized) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', normalized);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingWord(normalized);
    setSelectedWord(normalized);
  }

  function onWordDragEnd() {
    setDraggingWord('');
    setDragOverSlotIndex(null);
  }

  function onSlotDragOver(event, slot, isMine) {
    if (!canPlay || !isMine) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverSlotIndex(Number(slot.index));
  }

  function onSlotDrop(event, slot, isMine) {
    if (!canPlay || !isMine) return;
    event.preventDefault();
    const droppedWord = String(event.dataTransfer.getData('text/plain') || '').trim();
    const targetWord = droppedWord || draggingWord || selectedWord;
    if (!targetWord) return;
    placeOnSlot({ ...slot }, targetWord);
    setDraggingWord('');
    setDragOverSlotIndex(null);
  }

  function requestHint() {
    emitEvent('phrase.request_hint');
  }

  function handleStartChallenge() {
    refreshChallengeStateBeforeStart(emitEvent);
    emitEvent('timer.start');
  }

  return (
    <div className={styles.phraseContainer}>
      <ChallengeHeader
        title={challengeName}
        subtitle={challengeSubtitle || (isEn ? 'Rebuild the phrase together, slot by slot' : 'Reconstituez la phrase en équipe, slot par slot')}
        timer={{ remainingSeconds: Number(timer?.remaining_seconds || 0) }}
        headerAction={hasChallengeStarted ? (
          <ChallengeRulesPanel
            inHeader
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
        ) : null}
      />

      <div className="challenge-mobile-timer">
        <ChallengeTimerCard
          title={isEn ? 'Timer' : 'Chrono'}
          remainingSeconds={Number(timer?.remaining_seconds || 0)}
          durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 0)}
          status={timerStatus}
          isFacilitator={isFacilitator}
          onPause={timerControls.pause}
          onResume={timerControls.resume}
          controlPending={timerControls.busy}
          controlFeedback={timerControls.feedback}
          waitingText=""
          showCompactBar={false}
        />
      </div>

      <div className={styles.shell}>
        <section className={styles.boardPanel}>
          <ChallengeActionFeedback feedback={action.feedback} />
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
              onStart={isFacilitator ? handleStartChallenge : null}
            />
          ) : (
            <>
              {slots.length === 0 ? (
                <p className={styles.empty}>{isEn ? 'Waiting for initial state...' : 'En attente de l’état initial...'}</p>
              ) : (
                <div className={styles.board}>
                  {slots.map((slot) => {
                    const isMine = !isFacilitator && participantSlot && Number(slot.assigned_slot) === participantSlot;
                    const isLocked = !isFacilitator && !isMine;
                    const isCorrect = slot?.is_correct === true;
                    const hiddenWord = modeVisionLimitee && isLocked && slot?.current_word ? '...' : '';
                    const displayedWord = hiddenWord || formatWord(slot?.current_word || '');
                    const expectedWord = isFacilitator ? formatWord(slot?.expected_word || '') : '';
                    const isDragOver = dragOverSlotIndex !== null && Number(dragOverSlotIndex) === Number(slot.index);

                    return (
                      <button
                        key={String(slot.index)}
                        type="button"
                        className={`${styles.slot}${isMine ? ` ${styles.slotMine}` : ''}${isLocked ? ` ${styles.slotLocked}` : ''}${isCorrect ? ` ${styles.slotOk}` : ''}${isDragOver ? ` ${styles.slotDropTarget}` : ''}`}
                        onClick={() => {
                          if (isFacilitator) return;
                          if (isMine && selectedWord) {
                            placeOnSlot(slot);
                            return;
                          }
                          if (isMine && slot?.current_word) {
                            clearSlot(slot);
                          }
                        }}
                        onDragOver={(event) => onSlotDragOver(event, slot, isMine)}
                        onDragEnter={() => {
                          if (isMine) {
                            setDragOverSlotIndex(Number(slot.index));
                          }
                        }}
                        onDragLeave={() => setDragOverSlotIndex((prev) => (Number(prev) === Number(slot.index) ? null : prev))}
                        onDrop={(event) => onSlotDrop(event, slot, isMine)}
                        disabled={Boolean(isFacilitator || isLocked || !canPlay)}
                      >
                        <span className={styles.slotIndex}>{isEn ? 'Cell' : 'Case'} {Number(slot.index) + 1}</span>
                        <span className={styles.slotWord}>{displayedWord || '\u00a0'}</span>
                        {isFacilitator ? (
                          <span className={styles.slotExpected}>{isEn ? 'Target' : 'Cible'}: {expectedWord || '-'}</span>
                        ) : (
                          <span className={styles.slotMeta}>{isEn ? 'Assigned' : 'Assignée'}: {slot.assigned_slot}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {summary ? (
                <div className={styles.summary} style={{ order: -1 }}>
                  <header className={styles.summaryHead}>
                    <h3>{isEn ? 'Team debrief — Mystery Phrase' : 'Débrief équipe — Phrase Mystère'}</h3>
                    <p>
                      {isEn ? (isFacilitator
                        ? 'Review coordination, decoy management and collective decisions.'
                        : 'Reflect on your choices, communication and detection of decoy words.') : isFacilitator
                        ? 'Analysez la coordination, la gestion des leurres et la qualité des décisions collectives.'
                        : 'Revenez sur vos choix, votre communication et la détection des faux mots.'}
                    </p>
                  </header>

                  <div className={styles.summaryStats}>
                    <article className={styles.summaryStatCard}>
                      <span>{isEn ? 'Collective score' : 'Score collectif'}</span>
                      <strong>{summaryScore}/100</strong>
                    </article>
                    <article className={styles.summaryStatCard}>
                      <span>{isEn ? 'Progress' : 'Progression'}</span>
                      <strong>{summarySolvedWords}/{summaryTotalWords}</strong>
                    </article>
                    <article className={styles.summaryStatCard}>
                      <span>{isEn ? 'Total time' : 'Temps total'}</span>
                      <strong>{formatDuration(summaryTimeSeconds)}</strong>
                    </article>
                    <article className={styles.summaryStatCard}>
                      <span>{isEn ? 'Coordination (chat)' : 'Coordination (chat)'}</span>
                      <strong>{summaryMessages}</strong>
                    </article>
                  </div>

                  <div className={styles.summaryColumns}>
                    <section className={styles.summaryPanel}>
                      <h4>✅ {isEn ? 'What worked well' : 'Ce qui a bien fonctionné'}</h4>
                      <ul>
                        <li>{isEn ? 'Final completion' : 'Complétion finale'} : {summaryCompletion}%.</li>
                        <li>{summarySolvedWords} {isEn ? 'word(s) correctly placed.' : 'mot(s) correctement positionné(s).'}</li>
                        <li>{summaryMessages} {isEn ? 'message(s) exchanged.' : 'échange(s) pour converger.'}</li>
                      </ul>
                    </section>

                    <section className={styles.summaryPanel}>
                      <h4>🎯 {isEn ? 'Areas for improvement' : 'Pistes d’amélioration'}</h4>
                      <ul>
                        <li>{isEn ? 'Reduce unsuccessful attempts' : 'Réduire les essais non concluants'} ({decoyRisk}).</li>
                        <li>{isEn ? 'Discuss ambiguous words and decoys together.' : 'Valider collectivement les mots ambigus (leurres).'}</li>
                        <li>{isEn ? 'Confirm key placements before final validation.' : 'Confirmer les placements clés avant validation finale.'}</li>
                      </ul>
                    </section>
                  </div>
                </div>
              ) : null}

              {!isFacilitator ? (
                <section className={styles.playerWorkbench}>
                  <div className={styles.playerWorkbenchHead}>
                    <h3>{isEn ? 'Available words' : 'Mots disponibles'}</h3>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={requestHint}
                      disabled={remainingHints <= 0 || !canPlay}
                    >
                      {`${isEn ? 'Discover a word' : 'Découvrir un mot'} (${remainingHints})`}
                    </button>
                  </div>
                  <div className={styles.wordBank}>
                    {groupedWords.length === 0 ? (
                      <p className={styles.empty}>{isEn ? 'No words available.' : 'Aucun mot disponible.'}</p>
                    ) : groupedWords.map((entry) => {
                      const selected = selectedWord === entry.value;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={`${styles.wordChip}${selected ? ` ${styles.wordChipSelected}` : ''}${draggingWord === entry.value ? ` ${styles.wordChipDragging}` : ''}`}
                          onClick={() => {
                            if (!canPlay) return;
                            setSelectedWord((prev) => (prev === entry.value ? '' : entry.value));
                          }}
                          draggable={canPlay}
                          onDragStart={(event) => onWordDragStart(event, entry.value)}
                          onDragEnd={onWordDragEnd}
                          disabled={!canPlay}
                        >
                          {formatWord(entry.value)}
                        </button>
                      );
                    })}
                  </div>
                  <p className={styles.helper}>
                    {isEn
                      ? `Select or drag a word to one of your cells. The team has ${hintBudget} “Discover a word” hints in total; ${remainingHints} remaining.`
                      : `Sélectionnez ou glissez un mot vers une de vos cases pour le placer. L’équipe dispose de ${hintBudget} indices « Découvrir un mot » au total ; ${remainingHints} restants.`}
                  </p>
                  {selectedWord ? (
                    <p className={styles.selectedWordStatus}>
                      {isEn ? 'Selected word' : 'Mot sélectionné'} : <strong>{formatWord(selectedWord)}</strong>. {isEn ? 'Drag it or choose one of your cells.' : 'Glissez-le ou choisissez une de vos cases.'}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </section>

        <aside className={styles.sidePanel}>
          <div className="challenge-desktop-timer">
            <ChallengeTimerCard
              title={isEn ? 'Timer' : 'Chrono'}
              remainingSeconds={Number(timer?.remaining_seconds || 0)}
              durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 0)}
              status={timerStatus}
              isFacilitator={isFacilitator}
              onPause={timerControls.pause}
              onResume={timerControls.resume}
              controlPending={timerControls.busy}
              controlFeedback={timerControls.feedback}
              waitingText=""
              showCompactBar={false}
            />
          </div>

          <section className={styles.sideCard}>
            {chatEnabled ? (
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
                emptyText={isEn ? 'No messages yet.' : 'Aucun message pour le moment.'}
                maxLength={240}
              />
            ) : null}
          </section>

          {error ? (
            <section className={styles.sideCard}>
              <p className={styles.error}>{error}</p>
            </section>
          ) : null}
        </aside>
      </div>

    </div>
  );
}