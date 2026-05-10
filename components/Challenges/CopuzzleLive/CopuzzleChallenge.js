'use client';

import React, { useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import { getBackendOrigin } from '@/lib/config';
import styles from './Copuzzle.module.css';

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeRuntimeConfig(config = {}) {
  const rows = clampInt(config?.grid?.rows, 4, 2, 16);
  const cols = clampInt(config?.grid?.cols, 4, 2, 16);
  const imageSrc = String(
    config?.image?.src
      || (typeof config?.image === 'string' ? config.image : '')
      || config?.image_url
      || config?.imageUrl
      || ''
  ).trim();

  return {
    title: String(config?.title || 'CoPuzzle Live'),
    grid: { rows, cols },
    image: {
      src: imageSrc,
      fit: String(config?.image?.fit || config?.image_fit || 'contain').toLowerCase() === 'cover' ? 'cover' : 'contain',
    },
    participants: {
      show_reference_image: config?.participants?.show_reference_image === true,
    },
    timer: {
      enabled: config?.timer?.enabled !== false,
    },
  };
}

function computePieceStyle(piece, config, imageUrl) {
  if (!imageUrl) {
    return {
      background: '#e2e8f0',
    };
  }

  const rows = Number(config?.grid?.rows || 1);
  const cols = Number(config?.grid?.cols || 1);
  const x = Number(piece?.correct?.x || 0);
  const y = Number(piece?.correct?.y || 0);
  const xPercent = cols > 1 ? (x / (cols - 1)) * 100 : 0;
  const yPercent = rows > 1 ? (y / (rows - 1)) * 100 : 0;

  return {
    backgroundImage: `url('${imageUrl.replace(/'/g, "\\'")}')`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${xPercent}% ${yPercent}%`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#f8fafc',
  };
}

export default function CopuzzleChallenge({ engineKey, runtimePayload, socket, context }) {
  const [selectedPieceId, setSelectedPieceId] = useState('');

  const {
    state,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context });

  const pieces = Array.isArray(state?.puzzle?.pieces) ? state.puzzle.pieces : [];
  const participantSlot = Number(state?.participantSlot || 0) || null;
  const timerState = String(state?.timer?.status || 'idle').trim();
  const canPlay = state?.timer?.enabled === false || timerState === 'running';
  const backendOrigin = useMemo(() => getBackendOrigin(), []);

  const effectiveConfig = useMemo(
    () => normalizeRuntimeConfig(state?.config || runtimePayload?.config || {}),
    [state, runtimePayload]
  );

  const imageUrl = useMemo(() => {
    const raw = String(effectiveConfig?.image?.src || '').trim();

    if (!raw) return '';
    if (raw.startsWith('/')) return `${backendOrigin}${raw}`;
    if (raw.startsWith('http://')) return raw.replace(/^http:\/\//i, 'https://');
    return raw;
  }, [backendOrigin, effectiveConfig]);

  const placedCount = useMemo(
    () => pieces.filter((piece) => piece?.placed === true).length,
    [pieces]
  );

  const completion = useMemo(() => {
    if (!pieces.length) return 0;
    return Math.round((placedCount / pieces.length) * 100);
  }, [pieces, placedCount]);

  const assignedPieces = useMemo(() => {
    if (!participantSlot) return [];
    return pieces.filter((piece) => Number(piece?.assigned_slot) === participantSlot);
  }, [pieces, participantSlot]);

  const trayPieces = useMemo(() => {
    if (isFacilitator) {
      return pieces.filter((piece) => !piece?.current);
    }
    return assignedPieces.filter((piece) => !piece?.current);
  }, [isFacilitator, pieces, assignedPieces]);

  const placedAssignedCount = useMemo(
    () => assignedPieces.filter((piece) => piece?.placed === true).length,
    [assignedPieces]
  );

  const boardOccupancy = useMemo(() => {
    const map = new Map();
    pieces.forEach((piece) => {
      if (!piece?.current) return;
      const key = `${Number(piece.current.x)}:${Number(piece.current.y)}`;
      map.set(key, piece);
    });
    return map;
  }, [pieces]);

  const selectedPiece = useMemo(
    () => trayPieces.find((piece) => String(piece.id) === String(selectedPieceId)) || null,
    [trayPieces, selectedPieceId]
  );

  function placeOnCell(x, y) {
    if (!selectedPiece || !canPlay) return;
    emitEvent('puzzle.place', {
      pieceId: selectedPiece.id,
      x,
      y,
    });
    setSelectedPieceId('');
  }

  function removePiece(pieceId) {
    if (!canPlay) return;
    emitEvent('puzzle.unplace', { pieceId });
  }

  const rowCount = Number(effectiveConfig.grid.rows || 4);
  const colCount = Number(effectiveConfig.grid.cols || 4);
  const boardCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < rowCount; y += 1) {
      for (let x = 0; x < colCount; x += 1) {
        cells.push({ x, y, key: `${x}:${y}` });
      }
    }
    return cells;
  }, [rowCount, colCount]);

  return (
    <div className={styles.copuzzleContainer}>
      <section className={styles.header}>
        <div>
          <h1>{effectiveConfig.title}</h1>
          <p>Puzzle collaboratif en temps reel</p>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Progression: {completion}%</span>
          <span className={styles.badge}>Timer: {timerState}</span>
          {!isFacilitator ? (
            <span className={styles.badge}>Slot {participantSlot || '-'}</span>
          ) : (
            <span className={styles.badge}>Facilitateur</span>
          )}
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.boardPanel}>
          <div
            className={styles.board}
            style={{
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
            }}
          >
            {boardCells.map((cell) => {
              const occupant = boardOccupancy.get(cell.key) || null;
              const isMyPiece = occupant && participantSlot && Number(occupant.assigned_slot) === participantSlot;

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`${styles.cell}${occupant ? ` ${styles.cellFilled}` : ''}`}
                  onClick={() => {
                    if (!occupant) {
                      placeOnCell(cell.x, cell.y);
                    }
                  }}
                  disabled={Boolean(occupant) || !selectedPiece || !canPlay}
                >
                  {occupant ? (
                    <div className={styles.cellContent}>
                      <div
                        className={styles.piecePreview}
                        style={computePieceStyle(occupant, effectiveConfig, imageUrl)}
                      />
                      <span className={styles.pieceLabel}>{occupant.id}</span>
                      {isMyPiece && canPlay ? (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removePiece(occupant.id);
                          }}
                        >
                          Retirer
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <span className={styles.cellHint}>{cell.x + 1}x{cell.y + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          {state?.summary ? (
            <div className={styles.summary}>
              <h3>Debrief collectif</h3>
              <p>Completion: {Number(state.summary?.completion_percent || completion)}%</p>
              <p>Actions: {Number(state.summary?.action_count || 0)}</p>
              <p>Messages: {Number(state.summary?.message_count || 0)}</p>
              <p>Score collectif: {Number(state.summary?.collective_score || 0)}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sidePanel}>
          <section className={styles.sideCard}>
            <h2>Pieces</h2>
            <p className={styles.metaLine}>Totales: {pieces.length}</p>
            {!isFacilitator ? (
              <p className={styles.metaLine}>Vos pieces placees: {placedAssignedCount}/{assignedPieces.length}</p>
            ) : (
              <p className={styles.metaLine}>Pieces restantes: {trayPieces.length}</p>
            )}
            <p className={styles.metaLine}>
              {canPlay ? 'Le plateau est actif.' : 'En attente du demarrage du facilitateur.'}
            </p>
          </section>

          <section className={styles.sideCard}>
            <h2>{isFacilitator ? 'Reference' : 'Pieces assignees'}</h2>

            {imageUrl && (isFacilitator || effectiveConfig.participants.show_reference_image) ? (
              <div className={styles.referenceWrap}>
                <img
                  src={imageUrl}
                  alt="Reference du puzzle"
                  className={styles.referenceImage}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : null}

            <div className={styles.tray}>
              {trayPieces.length === 0 ? (
                <p className={styles.empty}>Aucune piece disponible pour le moment.</p>
              ) : (
                trayPieces.map((piece) => {
                  const selected = String(piece.id) === String(selectedPieceId);
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      className={`${styles.trayPiece}${selected ? ` ${styles.trayPieceSelected}` : ''}`}
                      onClick={() => {
                        if (!canPlay) return;
                        setSelectedPieceId((prev) => (String(prev) === String(piece.id) ? '' : piece.id));
                      }}
                      disabled={!canPlay}
                      title={`Piece ${piece.id}`}
                    >
                      <span
                        className={styles.trayPreview}
                        style={computePieceStyle(piece, effectiveConfig, imageUrl)}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className={styles.sideCard}>
            <h2>Controles</h2>
            {error ? <p className={styles.error}>{error}</p> : null}

            {!isFacilitator ? (
              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  type="button"
                  onClick={() => setSelectedPieceId('')}
                  disabled={!selectedPieceId}
                >
                  Deselectionner la piece
                </button>
              </div>
            ) : (
              <div className={styles.actions}>
                <button className={styles.btnPrimary} type="button" onClick={() => emitEvent('timer.start')}>Demarrer timer</button>
                <button className={styles.btnSecondary} type="button" onClick={() => emitEvent('timer.pause')}>Pause timer</button>
                <button className={styles.btnSecondary} type="button" onClick={() => emitEvent('timer.resume')}>Reprendre timer</button>
                <button className={styles.btnSecondary} type="button" onClick={() => emitEvent('timer.stop')}>Arreter timer</button>
                <button className={styles.btnSecondary} type="button" onClick={() => emitEvent('puzzle.reference_visibility.update', { visible: true })}>Reference ON participants</button>
                <button className={styles.btnSecondary} type="button" onClick={() => emitEvent('puzzle.reference_visibility.update', { visible: false })}>Reference OFF participants</button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {!isFacilitator && selectedPiece ? (
        <section className={styles.selectionBanner}>
          <p>
            Piece selectionnee: <strong>{selectedPiece.id}</strong>. Cliquez sur une case libre du plateau pour la placer.
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
