'use client';
import React, { useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
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

export default function PhraseChallenge({ engineKey, runtimePayload, socket, context }) {
  const [selectedWord, setSelectedWord] = useState('');
  const {
    state,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context });

  const slots = Array.isArray(state?.phrase?.slots) ? state.phrase.slots : [];
  const participantSlot = Number(state?.participantSlot || 0) || null;
  const availableWords = Array.isArray(state?.phrase?.available_words) ? state.phrase.available_words : [];
  const timer = state?.timer || null;
  const timerStatus = String(timer?.status || 'idle').trim();
  const canPlay = timer?.enabled === false || timerStatus === 'running';
  const completion = useMemo(() => computeCompletionPercent(slots), [slots]);
  const modeVisionLimitee = state?.config?.modeVisionLimitee === true;

  const mySlots = useMemo(() => {
    if (!participantSlot) return [];
    return slots.filter((slot) => Number(slot?.assigned_slot) === participantSlot);
  }, [slots, participantSlot]);

  const groupedWords = useMemo(
    () => availableWords.map((word, idx) => ({ id: `w-${idx}-${word}`, value: String(word || '').trim() })).filter((entry) => entry.value),
    [availableWords]
  );

  const summary = state?.summary || null;

  function placeOnSlot(slot) {
    if (!slot || !selectedWord || !canPlay) return;
    emitEvent('phrase.place', { index: Number(slot.index), word: selectedWord });
    setSelectedWord('');
  }

  function clearSlot(slot) {
    if (!slot || !canPlay) return;
    emitEvent('phrase.clear', { index: Number(slot.index) });
  }

  function requestHint() {
    emitEvent('phrase.request_hint');
  }

  return (
    <div className={styles.phraseContainer}>
      <section className={styles.header}>
        <div>
          <h1>Phrase Mystere</h1>
          <p>Reconstituez la phrase en equipe, slot par slot.</p>
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
            <p className={styles.empty}>En attente de l'etat initial...</p>
          ) : (
            <div className={styles.board}>
              {slots.map((slot) => {
                const isMine = !isFacilitator && participantSlot && Number(slot.assigned_slot) === participantSlot;
                const isLocked = !isFacilitator && !isMine;
                const isCorrect = slot?.is_correct === true;
                const hiddenWord = modeVisionLimitee && isLocked && slot?.current_word ? '...' : '';
                const displayedWord = hiddenWord || formatWord(slot?.current_word || '');
                const expectedWord = isFacilitator ? formatWord(slot?.expected_word || '') : '';

                return (
                  <button
                    key={String(slot.index)}
                    type="button"
                    className={`${styles.slot}${isMine ? ` ${styles.slotMine}` : ''}${isLocked ? ` ${styles.slotLocked}` : ''}${isCorrect ? ` ${styles.slotOk}` : ''}`}
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
                    disabled={Boolean(isFacilitator || isLocked || !canPlay || (!selectedWord && !slot?.current_word))}
                  >
                    <span className={styles.slotIndex}>Case {Number(slot.index) + 1}</span>
                    <span className={styles.slotWord}>{displayedWord || '\u00a0'}</span>
                    {isFacilitator ? (
                      <span className={styles.slotExpected}>Cible: {expectedWord || '-'}</span>
                    ) : (
                      <span className={styles.slotMeta}>Assignee: {slot.assigned_slot}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {summary ? (
            <div className={styles.summary}>
              <h3>Debrief equipe</h3>
              <p>Completion: {Number(summary.completion_percent || completion)}%</p>
              <p>Temps total: {Number(summary.total_time_seconds || 0)}s</p>
              <p>Actions: {Number(summary.action_count || 0)}</p>
              <p>Messages: {Number(summary.message_count || 0)}</p>
              <p>Score collectif: {Number(summary.collective_score || 0)}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sidePanel}>
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
            <p className={styles.meta}>{canPlay ? 'Interaction active.' : 'En attente du demarrage du timer.'}</p>
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
                        className={`${styles.wordChip}${selected ? ` ${styles.wordChipSelected}` : ''}`}
                        onClick={() => {
                          if (!canPlay) return;
                          setSelectedWord((prev) => (prev === entry.value ? '' : entry.value));
                        }}
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
                  Deselectionner le mot
                </button>
              </>
            ) : (
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={() => emitEvent('timer.start')} disabled={timerStatus === 'running'}>Demarrer timer</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('timer.pause')} disabled={timerStatus !== 'running'}>Pause</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('timer.resume')} disabled={timerStatus !== 'paused'}>Reprendre</button>
                <button className={styles.btnSecondary} onClick={() => emitEvent('timer.stop')} disabled={timerStatus === 'stopped'}>Arreter</button>
                <button className={styles.btnSecondary} onClick={requestHint}>Indice</button>
              </div>
            )}
          </section>

          <section className={styles.sideCard}>
            <p className={styles.helper}>
              {!isFacilitator
                ? 'Selectionnez un mot, puis cliquez sur une de vos cases pour le placer.'
                : 'Suivez la progression et pilotez le timer et les indices.'}
            </p>
          </section>
        </aside>
      </div>

      {!isFacilitator && selectedWord ? (
        <section className={styles.selectionBanner}>
          <p>
            Mot selectionne: <strong>{formatWord(selectedWord)}</strong>. Cliquez sur une de vos cases pour le placer.
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