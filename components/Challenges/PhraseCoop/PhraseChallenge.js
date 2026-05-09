'use client';
import React, { useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import styles from './PhraseCoop.module.css';

export default function PhraseChallenge({ engineKey, runtimePayload, socket, context }) {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [word, setWord] = useState('');
  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context });

  const slots = Array.isArray(state?.phrase?.slots) ? state.phrase.slots : [];
  const participantSlot = Number(state?.participantSlot || 0);
  const mySlots = useMemo(
    () => slots.filter((slot) => Number(slot.assigned_slot) === participantSlot),
    [slots, participantSlot]
  );

  const availableWords = Array.isArray(state?.phrase?.available_words) ? state.phrase.available_words : [];
  const timer = state?.timer || null;

  function placeWord() {
    const index = Number(selectedSlot);
    if (!Number.isInteger(index) || !word.trim()) return;
    emitEvent('phrase.place', { index, word: word.trim() });
  }

  function clearWord() {
    const index = Number(selectedSlot);
    if (!Number.isInteger(index)) return;
    emitEvent('phrase.clear', { index });
  }

  return (
    <div className={styles.phraseContainer}>
      <section className={styles.hero}>
        <h1>Phrase Collaborative</h1>
        <p>Challenge temps réel</p>
      </section>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>Slots</h2>
          {slots.length === 0 ? <p>En attente de l état initial...</p> : null}
          <ul className={styles.list}>
            {slots.map((slot) => (
              <li key={String(slot.index)} className={styles.item}>
                <strong>#{slot.index}</strong>
                <span>assigné: {slot.assigned_slot}</span>
                <span>mot: {slot.current_word || '-'}</span>
                <span>ok: {slot.is_correct ? 'oui' : 'non'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel}>
          <h2>Actions {isFacilitator ? 'facilitateur' : 'participant'}</h2>
          <p>Mon slot: {participantSlot || '-'}</p>
          <p>Mes cases assignées: {mySlots.map((slot) => slot.index).join(', ') || '-'}</p>
          <p>Timer: {timer?.status || '-'} / {Number(timer?.remaining_seconds || 0)}s</p>
          {error ? <p className={styles.error}>{error}</p> : null}

          {!isFacilitator ? (
            <div className={styles.actions}>
              <label className={styles.label}>Index slot</label>
              <input className={styles.input} value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} placeholder="ex: 2" />
              <label className={styles.label}>Mot</label>
              <input className={styles.input} value={word} onChange={(e) => setWord(e.target.value)} placeholder="mot" />
              <button className={styles.btnPrimary} onClick={placeWord}>Placer</button>
              <button className={styles.btnSecondary} onClick={clearWord}>Effacer</button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => emitEvent('timer.start')}>Start timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.pause')}>Pause timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.resume')}>Resume timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.stop')}>Stop timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('phrase.request_hint')}>Indice</button>
            </div>
          )}

          <p>Mots dispo: {availableWords.join(', ') || '-'}</p>
        </section>
      </div>

      <details className={styles.debug}>
        <summary>Debug events</summary>
        <pre>{JSON.stringify(events.slice(0, 8), null, 2)}</pre>
      </details>
    </div>
  );
}