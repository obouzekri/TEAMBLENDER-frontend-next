'use client';
import React, { useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import styles from './Copuzzle.module.css';

export default function CopuzzleChallenge({ engineKey, runtimePayload, socket, context }) {
  const [pieceId, setPieceId] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');

  const {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context });

  const pieces = Array.isArray(state?.puzzle?.pieces) ? state.puzzle.pieces : [];
  const participantSlot = Number(state?.participantSlot || 0);
  const myPieces = useMemo(
    () => pieces.filter((piece) => Number(piece.assigned_slot) === participantSlot),
    [pieces, participantSlot]
  );

  function placePiece() {
    const parsedX = Number(x);
    const parsedY = Number(y);
    if (!pieceId || !Number.isInteger(parsedX) || !Number.isInteger(parsedY)) return;
    emitEvent('puzzle.place', { pieceId, x: parsedX, y: parsedY });
  }

  function unplacePiece() {
    if (!pieceId) return;
    emitEvent('puzzle.unplace', { pieceId });
  }

  return (
    <div className={styles.copuzzleContainer}>
      <section className={styles.hero}>
        <h1>Copuzzle Live</h1>
        <p>Puzzle collaboratif en temps réel</p>
      </section>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <h2>État puzzle</h2>
          <p>Pièces totales: {pieces.length}</p>
          <p>Mon slot: {participantSlot || '-'}</p>
          <p>Mes pièces: {myPieces.map((piece) => piece.id).join(', ') || '-'}</p>
          <ul className={styles.list}>
            {pieces.map((piece) => (
              <li key={piece.id} className={styles.item}>
                <strong>{piece.id}</strong>
                <span>slot: {piece.assigned_slot}</span>
                <span>current: {piece.current ? `${piece.current.x},${piece.current.y}` : '-'}</span>
                <span>placed: {piece.placed ? 'oui' : 'non'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.panel}>
          <h2>Actions</h2>
          {error ? <p className={styles.error}>{error}</p> : null}
          {!isFacilitator ? (
            <div className={styles.actions}>
              <label className={styles.label}>Piece ID</label>
              <input className={styles.input} value={pieceId} onChange={(e) => setPieceId(e.target.value)} placeholder="piece_1" />
              <label className={styles.label}>x</label>
              <input className={styles.input} value={x} onChange={(e) => setX(e.target.value)} placeholder="0" />
              <label className={styles.label}>y</label>
              <input className={styles.input} value={y} onChange={(e) => setY(e.target.value)} placeholder="0" />
              <button className={styles.btnPrimary} onClick={placePiece}>Placer</button>
              <button className={styles.btnSecondary} onClick={unplacePiece}>Retirer</button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => emitEvent('timer.start')}>Start timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.pause')}>Pause timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.resume')}>Resume timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('timer.stop')}>Stop timer</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('puzzle.reference_visibility.update', { visible: true })}>Référence ON</button>
              <button className={styles.btnSecondary} onClick={() => emitEvent('puzzle.reference_visibility.update', { visible: false })}>Référence OFF</button>
            </div>
          )}
        </section>
      </div>

      <details className={styles.debug}>
        <summary>Debug events</summary>
        <pre>{JSON.stringify(events.slice(0, 8), null, 2)}</pre>
      </details>
    </div>
  );
}