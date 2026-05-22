'use client';
import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
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

export default function PhraseChallenge({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedWord, setSelectedWord] = useState('');
  const [draggingWord, setDraggingWord] = useState('');
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState(null);
  const {
    state,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

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
  const canPlay = timer?.enabled === false || timerStatus === 'running';
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

  const {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
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
    emitEvent('phrase.place', { index: Number(slot.index), word: wordToPlace });
    setSelectedWord('');
  }

  function clearSlot(slot) {
    if (!slot || !canPlay) return;
    emitEvent('phrase.clear', { index: Number(slot.index) });
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

  return (
    <div className={styles.phraseContainer}>
      <section className={styles.header}>
        <div>
          <h1>Phrase Mystère</h1>
          <p>Reconstituez la phrase en équipe, slot par slot.</p>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Progression: {completion}%</span>
          <span className={styles.badge}>Timer: {timerStatus}</span>
          {!isFacilitator ? (
            <span className={styles.badge}>Slot {participantSlot || '-'}</span>
          ) : (
            <span className={styles.badge}>Facilitateur</span>
          )}
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.boardPanel}>
          {slots.length === 0 ? (
            <p className={styles.empty}>En attente de l'état initial...</p>
          ) : (
            <div className={styles.board}>
              {slots.map((slot) => {
                const isMine = !isFacilitator && participantSlot && Number(slot.assigned_slot) === participantSlot;
                const isLocked = !isFacilitator && !isMine;
                const isCorrect = slot?.is_correct === true;
                const hiddenWord = modeVisionLimitee && isLocked && slot?.current_word ? '...' : '';
                const displayedWord = hiddenWord || formatWord(slot?.current_word || '');
                const expectedWord = isFacilitator ? formatWord(slot?.expected_word || '') : '';
                const isDragOver = Number(dragOverSlotIndex) === Number(slot.index);

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
                    <span className={styles.slotIndex}>Case {Number(slot.index) + 1}</span>
                    <span className={styles.slotWord}>{displayedWord || '\u00a0'}</span>
                    {isFacilitator ? (
                      <span className={styles.slotExpected}>Cible: {expectedWord || '-'}</span>
                    ) : (
                      <span className={styles.slotMeta}>Assignée: {slot.assigned_slot}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {summary ? (
            <div className={styles.summary}>
              <h3>Débrief équipe</h3>
              <p>Completion: {Number(summary.completion_percent || completion)}%</p>
              <p>Temps total: {Number(summary.total_time_seconds || 0)}s</p>
              <p>Actions: {Number(summary.action_count || 0)}</p>
              <p>Messages: {Number(summary.message_count || 0)}</p>
              <p>Score collectif: {Number(summary.collective_score || 0)}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sidePanel}>
          <ChallengeTimerCard
            className={`${styles.sideCard} ${styles.timerCard}`}
            title="Chronometre"
            remainingSeconds={Number(timer?.remaining_seconds || 0)}
            durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 0)}
            status={timerStatus}
            isFacilitator={isFacilitator}
            waitingText="⏳ En attente du facilitateur"
            ringAction={isFacilitator ? (
              <button
                className={styles.timerIconBtn}
                type="button"
                onClick={() => {
                  if (timerStatus === 'running') emitEvent('timer.pause');
                  else if (timerStatus === 'paused') emitEvent('timer.resume');
                  else emitEvent('timer.start');
                }}
                title={timerStatus === 'running' ? 'Mettre en pause' : 'Démarrer / Reprendre'}
                aria-label={timerStatus === 'running' ? 'Mettre en pause' : 'Démarrer / Reprendre'}
              >
                {timerStatus === 'running' ? '⏸' : '▶'}
              </button>
            ) : null}
          />

          <section className={styles.sideCard}>
            <h2>{isFacilitator ? 'Vue globale' : 'Vos informations'}</h2>
            {!isFacilitator ? (
              <>
                <p className={styles.meta}>Mon slot: {participantSlot || '-'}</p>
                <p className={styles.meta}>Mes cases: {mySlots.map((slot) => Number(slot.index) + 1).join(', ') || '-'}</p>
              </>
            ) : (
              <p className={styles.meta}>Slots total: {slots.length}</p>
            )}
            <p className={styles.meta}>Temps restant: {Number(timer?.remaining_seconds || 0)}s</p>
            <p className={styles.meta}>{canPlay ? 'Interaction active.' : 'En attente du démarrage du timer.'}</p>
            {error ? <p className={styles.error}>{error}</p> : null}
          </section>

          <section className={styles.sideCard}>
            <h2>{isFacilitator ? 'Actions facilitateur' : 'Mots disponibles'}</h2>

            {!isFacilitator ? (
              <>
                <div className={styles.wordBank}>
                  {groupedWords.length === 0 ? (
                    <p className={styles.empty}>Aucun mot disponible.</p>
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
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedWord('')}
                  disabled={!selectedWord}
                >
                  Désélectionner le mot
                </button>
              </>
            ) : (
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={requestHint}>💡 Indice</button>
              </div>
            )}
          </section>

          <section className={styles.sideCard}>
            {chatEnabled ? (
              <ChallengeChatCard
                title="Chat equipe"
                messages={chatMessages}
                currentAuthor={displayName}
                inputValue={chatInput}
                onInputChange={setChatInput}
                onSubmit={submitChat}
                emptyText="Aucun message pour le moment."
                placeholder="Ecrire un message"
                maxLength={240}
              />
            ) : null}
            <p className={styles.helper}>
              {!isFacilitator
                ? 'Sélectionnez ou glissez un mot vers une de vos cases pour le placer.'
                : 'Suivez la progression et pilotez le timer et les indices.'}
            </p>
          </section>
        </aside>
      </div>

      {!isFacilitator && selectedWord ? (
        <section className={styles.selectionBanner}>
          <p>
            Mot sélectionné: <strong>{formatWord(selectedWord)}</strong>. Glissez-le ou cliquez sur une de vos cases pour le placer.
          </p>
        </section>
      ) : null}

      {Boolean(engineKey) ? (
        <section className={styles.footerMeta}>
          <span>Engine: {engineKey}</span>
          <span>Session: {String(context?.sessionId || runtimePayload?.session_id || '-')}</span>
        </section>
      ) : null}
    </div>
  );
}