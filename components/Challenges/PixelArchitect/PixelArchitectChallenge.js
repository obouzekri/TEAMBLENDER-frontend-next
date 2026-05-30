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
  const configuredTemplates = Array.isArray(runtimePayload?.config?.templates) ? runtimePayload.config.templates : [];
  const selectedTemplateId = String(pixelState?.replication?.templateId || runtimePayload?.config?.replication?.templateId || '').trim();
  const selectedTemplate = pixelState?.selected_template
    || configuredTemplates.find((item) => String(item?.id || '').trim() === selectedTemplateId)
    || null;

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

  const challengeBrief = useMemo(() => {
    const templateName = String(selectedTemplate?.name || '').trim();
    const templateDims = selectedTemplate?.max_dims || {};
    const targetCubes = Number(selectedTemplate?.target_cube_count || pixelState?.max_cubes || 0);
    const mode = String(pixelState?.mode || runtimePayload?.config?.mode || 'replication').trim().toLowerCase();
    if (mode === 'creatif') {
      const theme = String(pixelState?.creative_theme || runtimePayload?.config?.creative?.theme || rulesContent.objective || '').trim();
      return {
        title: 'Exemple de livrable',
        objective: theme ? `Construisez une structure lisible autour du thème: ${theme}.` : 'Construisez une structure lisible autour du thème de l’équipe.',
        example: 'Exemple: commencez par une base large et stable, puis ajoutez un volume central et un point de repère visuel.',
        constraints: `Gardez une silhouette simple, visible de loin, avec une palette cohérente sur ${Math.max(1, Number(pixelState?.max_colors || palette.length || 3))} couleur(s).`,
      };
    }

    return {
      title: 'Exemple de livrable',
      objective: templateName
        ? `Reproduisez le modèle ${templateName} en respectant les dimensions et les couleurs.`
        : 'Reproduisez le modèle cible en respectant les dimensions et les couleurs.',
      example: templateName
        ? `Exemple: placez d’abord la base du modèle, puis montez la silhouette jusqu’à environ ${targetCubes || 'le volume attendu'} cubes.`
        : 'Exemple: placez d’abord la base, puis montez la silhouette avant de corriger les détails.',
      constraints: templateName && templateDims.x && templateDims.y && templateDims.z
        ? `Modèle: ${templateName} • ${templateDims.x} x ${templateDims.y} x ${templateDims.z} • ${targetCubes || 'volume cible'} cubes.`
        : `Respectez la grille, la hauteur et la palette autorisée pour garder une structure propre.`,
    };
  }, [palette.length, pixelState?.creative_theme, pixelState?.max_colors, pixelState?.max_cubes, pixelState?.mode, pixelState?.replication?.templateId, pixelState?.selected_template, runtimePayload?.config?.creative?.theme, runtimePayload?.config?.mode, runtimePayload?.config?.replication?.templateId, runtimePayload?.config?.templates, rulesContent.objective, selectedTemplate]);

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
        <div className={styles.headerLine}>
          <h1>Pixel Architect</h1>
          <p>Construisez une structure voxel en equipe sous contraintes.</p>
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
                  <h2>{challengeBrief.title}</h2>
                  <p>{challengeBrief.objective}</p>
                </div>
                <div className={styles.briefGrid}>
                  <div className={styles.briefItem}>
                    <span className={styles.briefLabel}>Ce qu'il faut faire</span>
                    <strong>{challengeBrief.objective}</strong>
                  </div>
                  <div className={styles.briefItem}>
                    <span className={styles.briefLabel}>Exemple</span>
                    <p>{challengeBrief.example}</p>
                  </div>
                  <div className={styles.briefItem}>
                    <span className={styles.briefLabel}>Repères</span>
                    <p>{challengeBrief.constraints}</p>
                  </div>
                </div>
              </section>

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
            title="CHRONO"
            remainingSeconds={Number(timer?.remaining_seconds || 0)}
            durationSeconds={Number(timer?.duration_seconds || runtimePayload?.config?.timer?.duration_seconds || 900)}
            status={String(timer?.status || 'idle')}
            progressPercent={progress}
            isFacilitator={isFacilitator}
            collapsible={false}
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
