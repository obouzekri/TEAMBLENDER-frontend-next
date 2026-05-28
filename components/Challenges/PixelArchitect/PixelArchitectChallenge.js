'use client';

import React, { useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import styles from './PixelArchitect.module.css';

function toCellKey(x, y, z) {
  return `${x}:${y}:${z}`;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function computeProgress(pixelState) {
  const maxCubes = Math.max(1, Number(pixelState?.max_cubes || 1));
  const placed = Number(pixelState?.placed_count || 0);
  return Math.max(0, Math.min(100, Math.round((placed / maxCubes) * 100)));
}

export default function PixelArchitectChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [selectedColor, setSelectedColor] = useState('');
  const [activeLayer, setActiveLayer] = useState(0);

  const { state, error, isFacilitator, emitEvent } = useRealtimeChallenge({
    runtimePayload,
    socket,
    context,
    onChallengeCompleted,
  });

  const pixelState = state?.pixel || null;
  const timer = state?.timer || null;
  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasChallengeStarted = timer?.enabled === false || ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(timerStatus);
  const canBuild = !isFacilitator && (timer?.enabled === false || timerStatus === 'running');

  const gridX = clampInt(pixelState?.grid?.x, 8, 4, 20);
  const gridY = clampInt(pixelState?.grid?.y, 8, 4, 20);
  const gridZ = clampInt(pixelState?.grid?.z, 5, 2, 10);
  const safeLayer = Math.max(0, Math.min(activeLayer, gridZ - 1));
  const palette = Array.isArray(pixelState?.palette) && pixelState.palette.length > 0
    ? pixelState.palette
    : ['#2D9CDB', '#27AE60', '#F2C94C'];
  const effectiveColor = selectedColor && palette.includes(selectedColor) ? selectedColor : palette[0];

  const cubesByKey = pixelState?.cubes && typeof pixelState.cubes === 'object' ? pixelState.cubes : {};
  const layers = Array.from({ length: gridZ }, (_, index) => index);
  const progress = computeProgress(pixelState);

  const displayName = useMemo(() => {
    const payloadName = String(runtimePayload?.context?.displayName || runtimePayload?.context?.name || '').trim();
    if (payloadName) return payloadName;
    const contextName = String(context?.displayName || context?.name || '').trim();
    if (contextName) return contextName;
    return 'Participant';
  }, [runtimePayload, context]);

  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config),
    [runtimePayload?.config, state?.config]
  );

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat } = useChallengeChat({
    socket,
    emitEvent,
    author: displayName,
    enabled: state?.config?.chat?.enabled !== false,
    maxMessages: 100,
    maxLength: 240,
  });

  function onCellAction(x, y, z) {
    if (!canBuild) return;
    const key = toCellKey(x, y, z);
    if (cubesByKey[key]) {
      emitEvent('pixel.cube.remove', { x, y, z });
      return;
    }
    emitEvent('pixel.cube.place', { x, y, z, color: effectiveColor });
  }

  function onCubeColorUpdate(x, y, z) {
    if (!canBuild) return;
    emitEvent('pixel.cube.updateColor', { x, y, z, color: effectiveColor });
  }

  function onSubmitFinal() {
    emitEvent('pixel.submit_final');
  }

  function onRequestHint() {
    if (isFacilitator) {
      emitEvent('pixel.request_hint');
    }
  }

  const summary = state?.summary || null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Pixel Architect</h1>
          <p>Construisez une structure voxel en equipe sous contraintes.</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.badge}>Mode: {String(pixelState?.mode || 'replication')}</span>
          <span className={styles.badge}>Collaboration: {String(pixelState?.collaboration_mode || 'standard')}</span>
          <span className={styles.badge}>Role: {String(pixelState?.viewer_role || (isFacilitator ? 'facilitator' : 'participant'))}</span>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainPane}>
          {!hasChallengeStarted ? (
            <ChallengeRulesPanel
              isStarted={false}
              isFacilitator={isFacilitator}
              challengeName="Pixel Architect"
              objective={rulesContent.objective}
              facilitatorRules={rulesContent.facilitator}
              participantRules={rulesContent.participant}
              footnote={rulesContent.footnote}
              onStart={isFacilitator ? () => emitEvent('timer.start') : null}
              compactStartButton
            />
          ) : (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2>Construction</h2>
                  <p>
                    Grille {gridX} x {gridY} x {gridZ} • Cubes restants: {Number(pixelState?.remaining_cubes || 0)}
                  </p>
                </div>

                <div className={styles.layerTabs}>
                  {layers.map((layer) => (
                    <button
                      key={`layer-${layer}`}
                      type="button"
                      className={`${styles.layerBtn}${safeLayer === layer ? ` ${styles.layerBtnActive}` : ''}`}
                      onClick={() => setActiveLayer(layer)}
                    >
                      Niveau {layer + 1}
                    </button>
                  ))}
                </div>

                <div className={styles.paletteRow}>
                  {palette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.colorDot}${effectiveColor === color ? ` ${styles.colorDotActive}` : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Couleur ${color}`}
                      title={color}
                    />
                  ))}
                </div>

                <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${gridX}, minmax(0, 1fr))` }}>
                  {Array.from({ length: gridY }).flatMap((_, y) => (
                    Array.from({ length: gridX }).map((__, x) => {
                      const key = toCellKey(x, y, safeLayer);
                      const cube = cubesByKey[key] || null;
                      return (
                        <button
                          key={`cell-${key}`}
                          type="button"
                          className={`${styles.cell}${cube ? ` ${styles.cellFilled}` : ''}`}
                          style={cube ? { backgroundColor: cube.color } : undefined}
                          onClick={() => onCellAction(x, y, safeLayer)}
                          onDoubleClick={() => {
                            if (cube) {
                              onCubeColorUpdate(x, y, safeLayer);
                            }
                          }}
                          disabled={!canBuild}
                          title={cube ? `Cube ${x},${y},${safeLayer}` : `Case ${x},${y},${safeLayer}`}
                        >
                          {cube ? '■' : ''}
                        </button>
                      );
                    })
                  ))}
                </div>

                {!isFacilitator ? (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnPrimary} onClick={onSubmitFinal}>
                      Soumettre ma construction
                    </button>
                  </div>
                ) : (
                  <div className={styles.actionsRow}>
                    <button type="button" className={styles.btnSecondary} onClick={onRequestHint}>
                      Diffuser un indice
                    </button>
                  </div>
                )}
              </section>

              {summary ? (
                <section className={styles.panel}>
                  <h2>Debrief</h2>
                  <div className={styles.summaryGrid}>
                    <p>Score global: <strong>{Number(summary.collective_score || 0)}</strong></p>
                    <p>Completion: <strong>{Number(summary.completion_percent || 0)}%</strong></p>
                    <p>Actions: <strong>{Number(summary.action_count || 0)}</strong></p>
                    <p>Messages: <strong>{Number(summary.message_count || 0)}</strong></p>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>

        <aside className={styles.sidebar}>
          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={Number(timer?.remaining_seconds || 0)}
            durationSeconds={Number(timer?.duration_seconds || 0)}
            status={String(timer?.status || 'idle')}
            progressPercent={progress}
            isFacilitator={isFacilitator}
            actions={isFacilitator ? (
              <>
                <button type="button" className={styles.timerBtn} onClick={() => emitEvent('timer.start')}>Demarrer</button>
                <button type="button" className={styles.timerBtn} onClick={() => emitEvent('timer.pause')}>Pause</button>
                <button type="button" className={styles.timerBtn} onClick={() => emitEvent('timer.resume')}>Reprendre</button>
                <button type="button" className={styles.timerBtn} onClick={() => emitEvent('timer.stop')}>Arreter</button>
              </>
            ) : null}
          />

          <section className={styles.panel}>
            <h3>Etat equipe</h3>
            <p>Cubes poses: {Number(pixelState?.placed_count || 0)}</p>
            <p>Cubes restants: {Number(pixelState?.remaining_cubes || 0)}</p>
            <p>Indices utilises: {Number(pixelState?.hints_used || 0)}</p>
            {pixelState?.mode === 'creatif' ? (
              <p>Theme: {String(pixelState?.creative_theme || '-')}</p>
            ) : (
              <p>Template: {String(pixelState?.selected_template?.name || 'Mode asymetrique')}</p>
            )}
          </section>

          {state?.config?.chat?.enabled !== false ? (
            <ChallengeChatCard
              title="Chat"
              messages={chatMessages}
              currentAuthor={displayName}
              inputValue={chatInput}
              onInputChange={setChatInput}
              onSubmit={submitChat}
              onQuickMessage={sendQuickChat}
              quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
              disabled={!hasChallengeStarted}
              placeholder="Coordonnez vos actions"
            />
          ) : null}

          {error ? <p className={styles.errorText}>{error}</p> : null}
        </aside>
      </div>
    </div>
  );
}
