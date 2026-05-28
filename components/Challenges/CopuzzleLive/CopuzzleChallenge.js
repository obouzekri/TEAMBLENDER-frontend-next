'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import { getBackendOrigin } from '@/lib/config';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import styles from './Copuzzle.module.css';

const COPUZZLE_ADMIN_REFERENCE_IMAGES = Object.freeze([
  { id: 'default_1', title: 'Image administrateur 1', src: '/copuzzle/default-blue.svg' },
  { id: 'default_2', title: 'Image administrateur 2', src: '/copuzzle/default-grid.svg' },
  { id: 'default_3', title: 'Image administrateur 3', src: '/copuzzle/default-sunrise.svg' },
]);

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeRuntimeConfig(config = {}) {
  const rows = clampInt(config?.grid?.rows, 4, 2, 16);
  const cols = clampInt(config?.grid?.cols, 4, 2, 16);
  const defaultImagesFromConfig = Array.isArray(config?.default_images)
    ? config.default_images
        .map((item) => {
          const src = String(item?.src || item?.url || item?.value || '').trim();
          if (!src) return null;
          return {
            id: String(item?.id || ''),
            title: String(item?.title || '').trim() || 'Image',
            src,
          };
        })
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const defaultImages = defaultImagesFromConfig.length > 0
    ? defaultImagesFromConfig
    : COPUZZLE_ADMIN_REFERENCE_IMAGES;
  const sourceMode = String(config?.image_source_mode || '').trim().toLowerCase() === 'custom' ? 'custom' : 'defaults';
  const selectedDefaultId = String(config?.default_image_id || '').trim();
  const selectedDefaultImage = defaultImages.find((item) => item.id === selectedDefaultId) || defaultImages[0] || null;
  const selectedDefaultSrc = String(selectedDefaultImage?.src || '/copuzzle/default-blue.svg').trim();
  const customSrc = String(
    config?.image?.src
      || (typeof config?.image === 'string' ? config.image : '')
      || config?.image_url
      || config?.imageUrl
      || ''
  ).trim();
  const imageSrc = sourceMode === 'custom'
    ? (customSrc || selectedDefaultSrc)
    : selectedDefaultSrc;

  const timerDurationSeconds = clampInt(config?.timer?.duration_seconds, 1200, 30, 7200);
  const timerWarningSeconds = clampInt(config?.timer?.warning_threshold_seconds, 60, 10, 600);

  return {
    title: String(config?.title || 'CoPuzzle Live'),
    default_images: defaultImages,
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
      duration_seconds: timerDurationSeconds,
      warning_threshold_seconds: timerWarningSeconds,
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

export default function CopuzzleChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedPieceId, setSelectedPieceId] = useState('');
  const [dragOverCellKey, setDragOverCellKey] = useState('');
  const [draggingPieceId, setDraggingPieceId] = useState('');

  const {
    state,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const displayName = useMemo(() => {
    const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
    const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const fromContext = String(context?.displayName || '').trim();
    if (fromContext) return fromContext;
    const userId = String(context?.userId || context?.participantId || '').trim();
    return `Participant ${userId || 'unknown'}`;
  }, [runtimePayload, context]);

  const pieces = Array.isArray(state?.puzzle?.pieces) ? state.puzzle.pieces : [];
  const participantSlot = Number(state?.participantSlot || 0) || null;
  const timerState = String(state?.timer?.status || 'idle').trim();
  const normalizedTimerState = timerState.toLowerCase();
  const hasChallengeStarted = state?.timer?.enabled === false
    || normalizedTimerState === 'running'
    || normalizedTimerState === 'paused'
    || normalizedTimerState === 'completed'
    || normalizedTimerState === 'stopped'
    || normalizedTimerState === 'timeout';
  const canPlay = state?.timer?.enabled === false || timerState === 'running';
  const backendOrigin = useMemo(() => getBackendOrigin(), []);
  const timerRemainingSeconds = Math.max(0, Number(state?.timer?.remaining_seconds || 0));
  const timerDurationSeconds = Math.max(
    0,
    Number(state?.timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 0)
  );
  const rawRulesConfig = state?.config || runtimePayload?.config || {};

  const effectiveConfig = useMemo(
    () => normalizeRuntimeConfig(rawRulesConfig),
    [rawRulesConfig]
  );

  const chatEnabled = effectiveConfig?.chat?.enabled === true;
  const rulesContent = useMemo(() => resolveChallengeRules(rawRulesConfig), [rawRulesConfig]);

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

  const imageUrl = useMemo(() => {
    const raw = String(effectiveConfig?.image?.src || '').trim();

    if (!raw) return '';
    if (raw.startsWith('/copuzzle/')) return raw;
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

  return (
    <div className={styles.copuzzleContainer}>
      <section className={styles.header}>
        <div className={styles.headerTitleLine}>
          <span className={styles.headerTitle}>{effectiveConfig.title}</span>
          <span className={styles.headerDescription}>: Puzzle collaboratif en temps réel</span>
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.boardPanel}>
          {!hasChallengeStarted ? (
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName="CoPuzzle Live"
              objective={rulesContent.objective}
              facilitatorRules={rulesContent.facilitator}
              participantRules={rulesContent.participant}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? () => emitEvent('timer.start') : null}
              compactStartButton
            />
          ) : (
            <>
              <div
                className={styles.board}
                style={{
                  gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                }}
              >
                {boardCells.map((cell) => {
                  const occupant = boardOccupancy.get(cell.key) || null;
                  const isMyPiece = occupant && participantSlot && Number(occupant.assigned_slot) === participantSlot;
                  const isHiddenPiece = occupant && !isFacilitator && !isMyPiece;
                  const canDragBoardPiece = Boolean(occupant && canPlay && (isFacilitator || isMyPiece));
                  const canRemoveBoardPiece = Boolean(occupant && canPlay && isMyPiece);
                  const shouldDisableCell = !canPlay || Boolean(occupant && !canRemoveBoardPiece);
                  const cellClass = `${styles.cell}${occupant ? ` ${styles.cellFilled}` : ''}${dragOverCellKey === cell.key ? ` ${styles.cellDropTarget}` : ''}`;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={cellClass}
                      onClick={() => {
                        if (occupant && canRemoveBoardPiece) {
                          removePiece(occupant.id);
                          setSelectedPieceId(String(occupant.id));
                          return;
                        }
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
                      disabled={shouldDisableCell}
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
            </>
          )}

        </section>

        <aside className={styles.sidePanel}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName="CoPuzzle Live"
            objective={rulesContent.objective}
            facilitatorRules={rulesContent.facilitator}
            participantRules={rulesContent.participant}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={timerRemainingSeconds}
            durationSeconds={timerDurationSeconds}
            status={timerState}
            isFacilitator={isFacilitator}
            waitingText=""
            ringAction={isFacilitator && hasChallengeStarted ? (
              <button
                type="button"
                onClick={() => {
                  if (timerState === 'running') emitEvent('timer.pause');
                  else if (timerState === 'paused') emitEvent('timer.resume');
                }}
                title={timerState === 'running' ? 'Mettre en pause' : 'Reprendre'}
                aria-label={timerState === 'running' ? 'Mettre en pause' : 'Reprendre'}
              >
                {timerState === 'running' ? '⏸' : '▶'}
              </button>
            ) : null}
          />

          {chatEnabled ? (
            <ChallengeChatCard
              title="Chat"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              onQuickMessage={sendQuickChat}
              emptyText="Aucun message pour le moment."
              placeholder="Ecrire un message d equipe"
              maxLength={240}
              submitLabel="➤"
            />
          ) : null}

          <section className={styles.sideCard}>
            <h2>{isFacilitator ? 'Image de référence' : 'Pièces assignées'}</h2>

            {imageUrl && (isFacilitator || effectiveConfig.participants.show_reference_image) ? (
              <div className={styles.referenceWrap}>
                <img
                  src={imageUrl}
                  alt="Référence du puzzle"
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
                <p className={styles.metaLine}>Vos pièces placées: {placedAssignedCount}/{assignedPieces.length}</p>
                <p className={styles.metaLine}>
                  {canPlay ? 'Le plateau est actif.' : 'En attente du démarrage du facilitateur.'}
                </p>
                <div className={styles.tray}>
                  {trayPieces.length === 0 ? (
                    <p className={styles.empty}>Aucune pièce disponible pour le moment.</p>
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
        </aside>
      </div>

      {!isFacilitator && selectedPiece ? (
        <section className={styles.selectionBanner}>
          <p>
            Pièce sélectionnée: <strong>{selectedPiece.id}</strong>. Glissez-la vers une case libre, ou cliquez sur une pièce posée pour la retirer.
          </p>
        </section>
      ) : null}

    </div>
  );
}
