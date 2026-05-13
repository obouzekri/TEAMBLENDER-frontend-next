'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    chat: {
      enabled: config?.chat?.enabled !== false,
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

export default function CopuzzleChallenge({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedPieceId, setSelectedPieceId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [dragOverCellKey, setDragOverCellKey] = useState('');
  const [draggingPieceId, setDraggingPieceId] = useState('');

  const {
    state,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    const userId = String(context?.userId || context?.participantId || '').trim();
    return `participant-${userId || 'unknown'}`;
  }, [runtimePayload, context]);

  const pieces = Array.isArray(state?.puzzle?.pieces) ? state.puzzle.pieces : [];
  const participantSlot = Number(state?.participantSlot || 0) || null;
  const timerState = String(state?.timer?.status || 'idle').trim();
  const canPlay = state?.timer?.enabled === false || timerState === 'running';
  const backendOrigin = useMemo(() => getBackendOrigin(), []);
  const timerRemainingSeconds = Math.max(0, Number(state?.timer?.remaining_seconds || 0));
  const timerDurationSeconds = Math.max(
    0,
    Number(state?.timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 0)
  );

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
        ts: String(payload?.ts || ''),
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

  function placeOnCell(x, y, pieceId = selectedPiece?.id) {
    if (!pieceId || !canPlay) return;
    emitEvent('puzzle.place', {
      pieceId,
      x,
      y,
    });
    setSelectedPieceId((prev) => (String(prev) === String(pieceId) ? '' : prev));
  }

  function removePiece(pieceId) {
    if (!canPlay) return;
    emitEvent('puzzle.unplace', { pieceId });
  }

  function onTrayDragStart(event, piece) {
    if (!canPlay) {
      event.preventDefault();
      return;
    }
    const pieceId = String(piece?.id || '').trim();
    if (!pieceId) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', pieceId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingPieceId(pieceId);
    setSelectedPieceId(pieceId);
  }

  function onBoardDragStart(event, piece) {
    if (!canPlay) {
      event.preventDefault();
      return;
    }
    const pieceId = String(piece?.id || '').trim();
    if (!pieceId) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', pieceId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingPieceId(pieceId);
  }

  function onDragEnd() {
    setDraggingPieceId('');
    setDragOverCellKey('');
  }

  function onCellDragOver(event, cellKey, occupant) {
    if (!canPlay || occupant) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverCellKey(cellKey);
  }

  function onCellDrop(event, cell, occupant) {
    if (!canPlay || occupant) return;
    event.preventDefault();
    const droppedPieceId = String(event.dataTransfer.getData('text/plain') || '').trim();
    const targetPieceId = droppedPieceId || draggingPieceId || selectedPieceId;
    if (!targetPieceId) return;
    placeOnCell(cell.x, cell.y, targetPieceId);
    setDraggingPieceId('');
    setDragOverCellKey('');
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

  const rowCount = Number(effectiveConfig.grid.rows || 4);
  const colCount = Number(effectiveConfig.grid.cols || 4);

  const [cellSize, setCellSize] = useState(54);

  useEffect(() => {
    function computeCellSize() {
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      // Board panel takes most of the viewport width for a larger workspace.
      const panelW = Math.floor(vpW * 0.74) - 64;
      // Board panel height: viewport minus header (~140px), footer (~40px), board padding (~40px)
      const panelH = vpH - 180;
      const byWidth = Math.floor(panelW / colCount);
      const byHeight = Math.floor(panelH / rowCount);
      const computed = Math.max(30, Math.min(118, Math.min(byWidth, byHeight)));
      setCellSize(computed);
    }
    computeCellSize();
    window.addEventListener('resize', computeCellSize);
    return () => window.removeEventListener('resize', computeCellSize);
  }, [rowCount, colCount]);

  const boardCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < rowCount; y += 1) {
      for (let x = 0; x < colCount; x += 1) {
        cells.push({ x, y, key: `${x}:${y}` });
      }
    }
    return cells;
  }, [rowCount, colCount]);

  const timerProgress = useMemo(() => {
    if (timerState !== 'running' && timerState !== 'paused') {
      return 0;
    }
    if (!timerDurationSeconds) {
      return timerState === 'running' ? 100 : 50;
    }
    const ratio = timerRemainingSeconds / timerDurationSeconds;
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }, [timerDurationSeconds, timerRemainingSeconds, timerState]);

  const timerTone = useMemo(() => {
    if (timerState !== 'running') return 'idle';
    if (timerProgress <= 20) return 'danger';
    if (timerProgress <= 55) return 'warn';
    return 'safe';
  }, [timerProgress, timerState]);

  const timerStrokeColor =
    timerTone === 'danger' ? '#ef4444' : timerTone === 'warn' ? '#f59e0b' : '#22c55e';

  const timerRingClassName = `${styles.timerRing} ${timerTone === 'safe'
    ? styles.timerRingSafe
    : timerTone === 'warn'
      ? styles.timerRingWarn
      : timerTone === 'danger'
        ? styles.timerRingDanger
        : ''}`.trim();

  return (
    <div className={styles.copuzzleContainer}>
      <section className={styles.header}>
        <div>
          <h1>{effectiveConfig.title}</h1>
          <p>Puzzle collaboratif en temps reel</p>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Progression: {completion}%</span>
          <span className={styles.badge}>Chrono: {timerState}</span>
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
              gridTemplateColumns: `repeat(${colCount}, var(--copuzzle-cell-size))`,
              ['--copuzzle-cell-size']: `${cellSize}px`,
            }}
          >
            {boardCells.map((cell) => {
              const occupant = boardOccupancy.get(cell.key) || null;
              const isMyPiece = occupant && participantSlot && Number(occupant.assigned_slot) === participantSlot;
              const isHiddenPiece = occupant && !isFacilitator && !isMyPiece;
              const canDragBoardPiece = Boolean(occupant && canPlay && (isFacilitator || isMyPiece));
              const cellClass = `${styles.cell}${occupant ? ` ${styles.cellFilled}` : ''}${dragOverCellKey === cell.key ? ` ${styles.cellDropTarget}` : ''}`;

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={cellClass}
                  onClick={() => {
                    if (!occupant) {
                      placeOnCell(cell.x, cell.y);
                    }
                  }}
                  onDragOver={(event) => onCellDragOver(event, cell.key, occupant)}
                  onDragEnter={() => {
                    if (!occupant) {
                      setDragOverCellKey(cell.key);
                    }
                  }}
                  onDragLeave={() => setDragOverCellKey((prev) => (prev === cell.key ? '' : prev))}
                  onDrop={(event) => onCellDrop(event, cell, occupant)}
                  disabled={Boolean(occupant) || !canPlay}
                >
                  {occupant ? (
                    isHiddenPiece ? (
                      <div className={styles.cellContentHidden}>
                        <span className={styles.hiddenCellLabel}>Pièce assignée</span>
                      </div>
                    ) : (
                      <div
                        className={styles.cellContent}
                        draggable={canDragBoardPiece}
                        onDragStart={(event) => onBoardDragStart(event, occupant)}
                        onDragEnd={onDragEnd}
                      >
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
                    )
                  ) : (
                    <span className={styles.cellHint}>{cell.x + 1}x{cell.y + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          {state?.summary ? (
            <div className={styles.summary}>
              <h3 className={styles.summaryTitle}>🏆 Débrief collectif</h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue} style={{ color: '#34d399' }}>
                    {Number(state.summary?.completion_percent || completion)}%
                  </div>
                  <div className={styles.summaryLabel}>Complétion</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue} style={{ color: '#60a5fa' }}>
                    {Number(state.summary?.collective_score || 0)}
                  </div>
                  <div className={styles.summaryLabel}>Score collectif</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue} style={{ color: '#fbbf24' }}>
                    {Number(state.summary?.action_count || 0)}
                  </div>
                  <div className={styles.summaryLabel}>Actions</div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryValue} style={{ color: '#a78bfa' }}>
                    {Number(state.summary?.message_count || 0)}
                  </div>
                  <div className={styles.summaryLabel}>Messages</div>
                </div>
              </div>
              {state.summary?.total_time_seconds > 0 ? (
                <div className={styles.summaryTime}>
                  ⏱ Temps: {Math.floor(Number(state.summary.total_time_seconds) / 60)}m{' '}
                  {Number(state.summary.total_time_seconds) % 60}s
                </div>
              ) : null}
            </div>
          ) : null}

        </section>

        <aside className={styles.sidePanel}>
          <section className={`${styles.sideCard} ${styles.timerCard}`}>
            <h3 className={styles.timerTitle}>Chrono</h3>

            <div className={styles.timerRingContainer}>
              <div
                className={timerRingClassName}
                style={{
                  background: `conic-gradient(${timerStrokeColor} ${Math.round((timerProgress / 100) * 360)}deg, rgba(148, 163, 184, 0.18) ${Math.round((timerProgress / 100) * 360)}deg)`
                }}
              >
                <div className={styles.timerDisplay}>
                  <div className={styles.timerTime}>
                    {String(Math.floor(timerRemainingSeconds / 60)).padStart(2, '0')}:
                    {String(timerRemainingSeconds % 60).padStart(2, '0')}
                  </div>
                  <div className={styles.timerState}>
                    {timerState === 'running' ? 'En cours' : timerState === 'paused' ? 'Pause' : 'Attente'}
                  </div>
                </div>
              </div>
            </div>

            {isFacilitator ? (
              <div className={styles.timerInlineActions}>
                <button
                  className={styles.timerIconBtn}
                  type="button"
                  onClick={() => emitEvent('timer.start')}
                  disabled={timerState === 'running'}
                  title="Demarrer le chrono"
                  aria-label="Demarrer le chrono"
                >
                  ▶
                </button>
                <button
                  className={styles.timerIconBtn}
                  type="button"
                  onClick={() => timerState === 'paused' ? emitEvent('timer.resume') : emitEvent('timer.pause')}
                  disabled={timerState !== 'running' && timerState !== 'paused'}
                  title={timerState === 'paused' ? 'Reprendre le chrono' : 'Mettre en pause'}
                  aria-label={timerState === 'paused' ? 'Reprendre le chrono' : 'Mettre en pause'}
                >
                  {timerState === 'paused' ? '⏯' : '⏸'}
                </button>
              </div>
            ) : (
              <p className={styles.timerWaitingText}>
                ⏳ En attente du facilitateur
              </p>
            )}
          </section>

          <section className={styles.sideCard}>
            <h2>{isFacilitator ? 'Image de reference' : 'Pieces assignees'}</h2>

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

            {isFacilitator ? (
              <label className={styles.referenceToggle}>
                <input
                  type="checkbox"
                  checked={effectiveConfig.participants.show_reference_image === true}
                  onChange={(event) => {
                    emitEvent('puzzle.reference_visibility.update', { visible: event.target.checked });
                  }}
                />
                <span>Afficher l'image aux participants</span>
              </label>
            ) : null}

            {!isFacilitator ? (
              <>
                <p className={styles.metaLine}>Vos pieces placees: {placedAssignedCount}/{assignedPieces.length}</p>
                <p className={styles.metaLine}>
                  {canPlay ? 'Le plateau est actif.' : 'En attente du demarrage du facilitateur.'}
                </p>
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
                          className={`${styles.trayPiece}${selected ? ` ${styles.trayPieceSelected}` : ''}${draggingPieceId === String(piece.id) ? ` ${styles.trayPieceDragging}` : ''}`}
                          onClick={() => {
                            if (!canPlay) return;
                            setSelectedPieceId((prev) => (String(prev) === String(piece.id) ? '' : piece.id));
                          }}
                          draggable={canPlay}
                          onDragStart={(event) => onTrayDragStart(event, piece)}
                          onDragEnd={onDragEnd}
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
              </>
            ) : null}
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
            ) : null}
          </section>

          {effectiveConfig.chat.enabled ? (
            <section className={styles.chatCard}>
              <h3>Chat equipe</h3>
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
                  placeholder="Ecrire un message d'equipe"
                  className={styles.chatInput}
                  maxLength={240}
                />
                <button type="submit" className={styles.btnPrimary} disabled={!chatInput.trim()}>
                  Envoyer
                </button>
              </form>
            </section>
          ) : null}
        </aside>
      </div>

      {!isFacilitator && selectedPiece ? (
        <section className={styles.selectionBanner}>
          <p>
            Piece selectionnee: <strong>{selectedPiece.id}</strong>. Glissez-la vers une case libre ou cliquez sur une case pour la placer.
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
