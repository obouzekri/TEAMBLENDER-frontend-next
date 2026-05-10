'use client';
import React, { useEffect, useMemo, useState } from 'react';
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
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [draggingWord, setDraggingWord] = useState('');
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState(null);
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
                  Deselectionner le mot
                </button>
              </>
            ) : (
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={requestHint}>💡 Indice</button>
              </div>
            )}
          </section>

          <section className={`${styles.sideCard} ${styles.timerCard}`}>
            <h3 className={styles.timerTitle}>Chronomètre</h3>
            
            <div className={styles.timerRingContainer}>
              <div 
                className={styles.timerRing}
                style={{
                  background: `conic-gradient(#0284c7 ${timerStatus === 'running' ? 360 : timerStatus === 'paused' ? 180 : 0}deg, #e2e8f0 ${timerStatus === 'running' ? 360 : timerStatus === 'paused' ? 180 : 0}deg)`
                }}
              >
                <div className={styles.timerDisplay}>
                  <div className={styles.timerTime}>
                    {String(Math.floor(Number(timer?.remaining_seconds || 0) / 60)).padStart(2, '0')}:
                    {String(Number(timer?.remaining_seconds || 0) % 60).padStart(2, '0')}
                  </div>
                  <div className={styles.timerState}>
                    {timerStatus === 'running' ? 'En cours' : timerStatus === 'paused' ? 'Pause' : 'Attente'}
                  </div>
                </div>
              </div>
            </div>

            {isFacilitator ? (
              <div className={styles.timerActionsGroup}>
                <button 
                  className={styles.timerBtnStart} 
                  type="button" 
                  onClick={() => emitEvent('timer.start')}
                  disabled={timerStatus === 'running'}
                >
                  ▶️ Démarrer
                </button>
                <button 
                  className={styles.timerBtnPauseResume} 
                  type="button" 
                  onClick={() => timerStatus === 'paused' ? emitEvent('timer.resume') : emitEvent('timer.pause')}
                  disabled={timerStatus !== 'running' && timerStatus !== 'paused'}
                >
                  {timerStatus === 'paused' ? '⏯️ Reprendre' : '⏸️ Pause'}
                </button>
                <button 
                  className={styles.timerBtnStop} 
                  type="button" 
                  onClick={() => emitEvent('timer.stop')}
                  disabled={timerStatus === 'idle'}
                >
                  ⏹️ Arrêter
                </button>
              </div>
            ) : (
              <p style={{ margin: '0', fontSize: '0.8rem', color: '#0c4a6e', textAlign: 'center' }}>
                ⏳ En attente du facilitateur
              </p>
            )}
          </section>

          <section className={styles.sideCard}>
            {chatEnabled ? (
              <>
                <h2>Chat equipe</h2>
                <div className={styles.chatLog}>
                  {chatMessages.length === 0 ? (
                    <p className={styles.empty}>Aucun message pour le moment.</p>
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
                    placeholder="Ecrire un message"
                    className={styles.chatInput}
                    maxLength={240}
                  />
                  <button type="submit" className={styles.btnPrimary} disabled={!chatInput.trim()}>
                    Envoyer
                  </button>
                </form>
              </>
            ) : null}
            <p className={styles.helper}>
              {!isFacilitator
                ? 'Selectionnez ou glissez un mot vers une de vos cases pour le placer.'
                : 'Suivez la progression et pilotez le timer et les indices.'}
            </p>
          </section>
        </aside>
      </div>

      {!isFacilitator && selectedWord ? (
        <section className={styles.selectionBanner}>
          <p>
            Mot selectionne: <strong>{formatWord(selectedWord)}</strong>. Glissez-le ou cliquez sur une de vos cases pour le placer.
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