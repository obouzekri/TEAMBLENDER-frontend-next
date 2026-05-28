'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { resolveChallengeRules } from '@/lib/challenges/rules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import styles from './MissionCritique.module.css';

const PHASES = Object.freeze([
  { key: 'cadrage', label: 'Cadrage', className: 'phaseCadrage' },
  { key: 'preparation', label: 'Preparation', className: 'phasePreparation' },
  { key: 'execution', label: 'Execution', className: 'phaseExecution' },
  { key: 'cloture', label: 'Cloture', className: 'phaseCloture' },
]);

function inferPhaseKey(index, total) {
  const safeTotal = Math.max(1, Number(total || 1));
  const ratio = Number(index || 0) / safeTotal;
  if (ratio < 0.25) return 'cadrage';
  if (ratio < 0.5) return 'preparation';
  if (ratio < 0.75) return 'execution';
  return 'cloture';
}

function normalizeName(value) {
  return String(value || '').trim();
}

function toTitleWord(raw) {
  const token = String(raw || '').trim().toLowerCase();
  if (!token) return '';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function humanizeIdentifier(value) {
  const normalized = normalizeName(value);
  if (!normalized) return '';

  if (!normalized.includes('@')) {
    return normalized;
  }

  const localPart = normalized.split('@')[0] || '';
  const chunks = localPart
    .replace(/[^a-zA-Z._-]/g, ' ')
    .split(/[._\-\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!chunks.length) return 'Participant';
  if (chunks.length === 1) {
    const single = chunks[0];
    if (single.length > 1) {
      return `${toTitleWord(single.slice(0, 1))} ${toTitleWord(single.slice(1))}`.trim();
    }
    return toTitleWord(single);
  }

  return `${toTitleWord(chunks[0])} ${toTitleWord(chunks[chunks.length - 1])}`.trim();
}

export default function MissionCritiqueChallenge({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const [dropTarget, setDropTarget] = useState({ phaseKey: '', index: -1 });
  const [dropPulseTarget, setDropPulseTarget] = useState({ phaseKey: '', index: -1 });
  const [dragTaskId, setDragTaskId] = useState('');
  const [phaseByTask, setPhaseByTask] = useState({});
  const [submitResult, setSubmitResult] = useState(null);

  const {
    state,
    error,
    isFacilitator,
    emitEvent,
  } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });

  const mission = state?.mission || {};
  const tasks = Array.isArray(mission.tasks) ? mission.tasks : [];
  const timeline = Array.isArray(mission.timeline) ? mission.timeline : [];
  const facilitatorBoard = Array.isArray(mission.facilitator_board) ? mission.facilitator_board : [];
  const collectiveResult = mission.collective_result || null;

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || runtimePayload?.context?.name || '').trim();
    if (fromPayload) return fromPayload;

    const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
    const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;

    const fallbackName = String(context?.displayName || context?.name || '').trim();
    if (fallbackName) return fallbackName;

    return 'Participant';
  }, [runtimePayload, context]);

  function resolveParticipantLabel(item) {
    const firstName = String(item?.first_name || item?.firstName || '').trim();
    const lastName = String(item?.last_name || item?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return humanizeIdentifier(fullName) || fullName;

    const fromPayload = String(item?.display_name || item?.participant_name || item?.name || '').trim();
    if (fromPayload) return humanizeIdentifier(fromPayload) || fromPayload;
    if (Number.isFinite(Number(item?.slot))) return `Participant ${item.slot}`;
    return 'Participant';
  }

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
    enabled: true,
    maxMessages: 80,
    maxLength: 240,
  });

  const taskMap = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => map.set(String(task.id), task));
    return map;
  }, [tasks]);

  const timelineSet = useMemo(() => new Set(timeline.map((taskId) => String(taskId))), [timeline]);

  const backlogTasks = useMemo(() => tasks, [tasks]);

  const completionPercent = Math.max(0, Math.min(100, Math.round((timeline.length / Math.max(1, tasks.length)) * 100)));

  const timerState = String(state?.timer?.status || 'idle').trim();
  const normalizedTimerState = timerState.toLowerCase();
  const hasChallengeStarted = state?.timer?.enabled === false
    || normalizedTimerState === 'running'
    || normalizedTimerState === 'paused'
    || normalizedTimerState === 'completed'
    || normalizedTimerState === 'stopped'
    || normalizedTimerState === 'timeout';
  const canEditTimeline = !isFacilitator && (state?.timer?.enabled === false || timerState === 'running');

  const timerRemainingSeconds = Math.max(0, Number(state?.timer?.remaining_seconds || 0));
  const timerDurationSeconds = Math.max(1, Number(state?.timer?.duration_seconds || 1));
  const rulesContent = useMemo(
    () => resolveChallengeRules(state?.config || runtimePayload?.config),
    [runtimePayload?.config, state?.config]
  );

  const facilitatorRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.facilitator) ? rulesContent.facilitator : [];
    return [
      ...baseRules,
      'Score collectif: moyenne des scores individuels de l’équipe (0 à 100).',
      'Pénalités: dépendance non respectée (-8), tâche critique manquante (-10), doublon (-5), tâche inconnue (-3).',
      'Répartissez les tâches par phase (cadrage, préparation, exécution, clôture) pour équilibrer la charge.',
      'Affectez un responsable dépendances pour valider les prérequis avant chaque déplacement majeur.'
    ];
  }, [rulesContent?.facilitator]);

  const participantRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.participant) ? rulesContent.participant : [];
    return [
      ...baseRules,
      'Le score final est collectif: votre ordre impacte la moyenne de toute l’équipe.',
      'Priorisez d’abord les dépendances et les tâches critiques, puis complétez le reste du backlog.'
    ];
  }, [rulesContent?.participant]);

  useEffect(() => {
    setPhaseByTask((prev) => {
      const next = {};
      timeline.forEach((taskId, index) => {
        const id = String(taskId);
        next[id] = prev[id] || inferPhaseKey(index, timeline.length);
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const sameSize = prevKeys.length === nextKeys.length;
      const unchanged = sameSize && nextKeys.every((key) => prev[key] === next[key]);
      return unchanged ? prev : next;
    });
  }, [timeline]);

  const phaseItems = useMemo(() => {
    const buckets = PHASES.reduce((acc, phase) => {
      acc[phase.key] = [];
      return acc;
    }, {});

    timeline.forEach((taskId, timelineIndex) => {
      const id = String(taskId);
      const phaseKey = phaseByTask[id] || inferPhaseKey(timelineIndex, timeline.length);
      const safePhaseKey = buckets[phaseKey] ? phaseKey : 'cloture';
      buckets[safePhaseKey].push({
        taskId: id,
        timelineIndex,
      });
    });

    return buckets;
  }, [phaseByTask, timeline]);

  const phaseOffsets = useMemo(() => {
    let offset = 0;
    return PHASES.reduce((acc, phase) => {
      acc[phase.key] = offset;
      offset += (phaseItems[phase.key] || []).length;
      return acc;
    }, {});
  }, [phaseItems]);

  useEffect(() => {
    if (!socket) return () => {};

    const onEvent = (packet = {}) => {
      const type = String(packet?.type || '').trim();
      const payload = packet?.payload || {};

      if (type === 'mission.completed' && payload?.result) {
        setSubmitResult(payload.result);
      }
    };

    socket.on('challenge:event', onEvent);
    return () => {
      socket.off('challenge:event', onEvent);
    };
  }, [socket]);

  function onTaskDragStart(event, taskId, timelineIndex = -1, from = 'catalog', fromPhase = '', fromPhaseIndex = -1) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({
      taskId,
      timelineIndex,
      from,
      fromPhase,
      fromPhaseIndex,
    }));
    setDragTaskId(String(taskId));
  }

  function onTaskDragEnd() {
    setDragTaskId('');
    setDropTarget({ phaseKey: '', index: -1 });
  }

  function onTimelineDrop(event, toPhaseKey, toPhaseIndex) {
    if (!canEditTimeline) return;
    event.preventDefault();
    setDropTarget({ phaseKey: '', index: -1 });

    let dragData = null;
    try {
      dragData = JSON.parse(String(event.dataTransfer.getData('application/json') || '{}'));
    } catch {
      dragData = null;
    }

    const taskId = String(dragData?.taskId || '').trim();
    if (!taskId) return;

    const safePhaseKey = PHASES.some((phase) => phase.key === toPhaseKey) ? toPhaseKey : 'cloture';
    const phaseOffset = Number(phaseOffsets[safePhaseKey] || 0);
    const targetIndex = Math.max(0, phaseOffset + Number(toPhaseIndex || 0));

    setDropPulseTarget({ phaseKey: safePhaseKey, index: Number(toPhaseIndex) });
    window.setTimeout(() => {
      setDropPulseTarget((prev) => (
        prev.phaseKey === safePhaseKey && prev.index === Number(toPhaseIndex)
          ? { phaseKey: '', index: -1 }
          : prev
      ));
    }, 320);

    setPhaseByTask((prev) => ({
      ...prev,
      [taskId]: safePhaseKey,
    }));

    if (dragData?.from === 'timeline' && Number.isInteger(dragData?.timelineIndex)) {
      emitEvent('mission.task.move', {
        fromIndex: Number(dragData.timelineIndex),
        toIndex: Number(targetIndex),
      });
      return;
    }

    emitEvent('mission.task.add', {
      taskId,
      index: Number(targetIndex),
    });
  }

  function submitTimeline() {
    emitEvent('mission.submit');
  }

  function moveTaskWithinPhase(fromTimelineIndex, targetTimelineIndex) {
    if (!canEditTimeline) return;
    if (!Number.isInteger(fromTimelineIndex) || !Number.isInteger(targetTimelineIndex)) return;
    if (fromTimelineIndex === targetTimelineIndex) return;
    emitEvent('mission.task.move', {
      fromIndex: fromTimelineIndex,
      toIndex: targetTimelineIndex,
    });
  }

  const roleViewClass = isFacilitator ? styles.facilitatorView : styles.participantView;

  return (
    <div className={`${styles.container} ${roleViewClass}`}>
      <header className={`${styles.card} ${styles.headerBlock}`}>
        <div className={styles.headerTitleLine}>
          <span className={styles.headerTitle}>Mission Critique</span>
          <span className={styles.headerDescription}>
            {String(state?.config?.scenario || runtimePayload?.config?.scenario || 'Organiser un séminaire d’entreprise pour 80 personnes.')}
          </span>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainPane}>
          {!hasChallengeStarted ? (
            <section className={styles.card}>
              <ChallengeRulesPanel
                isStarted={false}
                isFacilitator={isFacilitator}
                challengeName="Mission Critique"
                objective={rulesContent.objective}
                facilitatorRules={rulesContent.facilitator}
                participantRules={rulesContent.participant}
                footnote={rulesContent.footnote}
                onStart={isFacilitator ? () => emitEvent('timer.start') : null}
              />
            </section>
          ) : !isFacilitator ? (
            <>
              <section className={`${styles.card} ${styles.progressCard}`}>
                <div className={styles.progressMeta}>
                  <p className={styles.progressLabel}>Progression de mission</p>
                  <strong>{timeline.length}/{tasks.length} tâches placées</strong>
                </div>
                <div className={styles.progressTrack}>
                  <span className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
                </div>
              </section>

              <section className={styles.workspaceGrid}>
                <section className={`${styles.card} ${styles.taskCard}`}>
                  <div className={styles.sectionHead}>
                    <h2>Backlog mission</h2>
                    <p>Toutes les tâches sont disponibles. Glisser-déposer ou cliquer pour ajouter.</p>
                  </div>

                  {backlogTasks.length === 0 ? (
                    <p className={styles.empty}>Aucune tâche disponible.</p>
                  ) : (
                    <div className={styles.taskGrid}>
                      {backlogTasks.map((task) => {
                        const inTimeline = timelineSet.has(String(task.id));
                        return (
                          <button
                            key={task.id}
                            type="button"
                            className={`${styles.taskChip}${inTimeline ? ` ${styles.taskChipUsed}` : ''}${dragTaskId === String(task.id) ? ` ${styles.taskChipDragging}` : ''}`}
                            draggable={canEditTimeline}
                            onDragStart={(event) => onTaskDragStart(event, task.id, -1, 'catalog')}
                            onDragEnd={onTaskDragEnd}
                            onClick={() => {
                              if (!canEditTimeline) return;
                              emitEvent('mission.task.add', { taskId: task.id, index: timeline.length });
                            }}
                            disabled={!canEditTimeline}
                            title={String(task.label || '').trim()}
                          >
                            <div className={styles.taskChipTop}>
                              <span className={styles.taskChipTitle}>
                                <span>{task.label}</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className={`${styles.card} ${styles.timelineCard}`}>
                  <div className={styles.timelineHead}>
                    <div>
                      <h2>Timeline par phases</h2>
                      <p>Glissez les tâches dans chaque phase, puis ordonnez-les verticalement.</p>
                    </div>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={submitTimeline}
                      disabled={!canEditTimeline || timeline.length === 0}
                    >
                      Valider ma solution
                    </button>
                  </div>

                  <div className={`${styles.phaseTimeline}${dragTaskId ? ` ${styles.phaseTimelineDragging}` : ''}`}>
                    {PHASES.map((phase) => {
                      const items = phaseItems[phase.key] || [];
                      const phaseDropIndex = items.length;
                      return (
                        <React.Fragment key={phase.key}>
                          <section className={`${styles.phaseLine} ${styles[phase.className]}`}>
                            <div className={styles.phaseLineHeader}>
                              <h3>{phase.label}</h3>
                              <span>{items.length}</span>
                            </div>
                          </section>

                          <section
                            className={`${styles.timelineLane}${dropTarget.phaseKey === phase.key ? ` ${styles.timelineLaneActive}` : ''}${dropPulseTarget.phaseKey === phase.key ? ` ${styles.dropZonePulse}` : ''}`}
                            onDragOver={(event) => {
                              if (!canEditTimeline) return;
                              event.preventDefault();
                              event.dataTransfer.dropEffect = 'move';
                              setDropTarget({ phaseKey: phase.key, index: phaseDropIndex });
                            }}
                            onDragLeave={() => {
                              setDropTarget((prev) => (
                                prev.phaseKey === phase.key ? { phaseKey: '', index: -1 } : prev
                              ));
                            }}
                            onDrop={(event) => onTimelineDrop(event, phase.key, phaseDropIndex)}
                          >
                            {items.length === 0 ? (
                              <div className={styles.timelineLaneHint}>Déposer une action ici</div>
                            ) : (
                              items.map((item, indexInPhase) => {
                                const task = taskMap.get(String(item.taskId));
                                const canMoveUp = indexInPhase > 0;
                                const canMoveDown = indexInPhase < items.length - 1;
                                const upTarget = canMoveUp ? items[indexInPhase - 1].timelineIndex : item.timelineIndex;
                                const downTarget = canMoveDown ? items[indexInPhase + 1].timelineIndex : item.timelineIndex;
                                return (
                                  <article
                                    key={`${phase.key}-${item.taskId}-${item.timelineIndex}`}
                                    className={`${styles.timelineCodeItem}${dragTaskId === String(item.taskId) ? ` ${styles.timelineItemDragging}` : ''}`}
                                    draggable={canEditTimeline}
                                    onDragStart={(event) => onTaskDragStart(event, item.taskId, item.timelineIndex, 'timeline', phase.key, indexInPhase)}
                                    onDragEnd={onTaskDragEnd}
                                  >
                                    <div className={styles.timelineItemBody}>
                                      <p className={styles.meta}>{task?.label || item.taskId}</p>
                                    </div>
                                    <div className={styles.timelineItemControls}>
                                      <button
                                        type="button"
                                        className={styles.ghostBtn}
                                        onClick={() => moveTaskWithinPhase(item.timelineIndex, upTarget)}
                                        disabled={!canEditTimeline || !canMoveUp}
                                        title="Monter"
                                        aria-label="Monter dans la phase"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.ghostBtn}
                                        onClick={() => moveTaskWithinPhase(item.timelineIndex, downTarget)}
                                        disabled={!canEditTimeline || !canMoveDown}
                                        title="Descendre"
                                        aria-label="Descendre dans la phase"
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.ghostBtn}
                                        onClick={() => emitEvent('mission.task.remove', { index: item.timelineIndex })}
                                        disabled={!canEditTimeline}
                                      >
                                        Retirer
                                      </button>
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </section>
                        </React.Fragment>
                      );
                    })}
                  </div>
              </section>
              </section>

              {(submitResult || mission.result) ? (
                <section className={styles.card} style={{ order: -1 }}>
                  <h2>Résultat</h2>
                  <p className={styles.score}>Score: {Number((submitResult || mission.result)?.score || 0)}/100</p>
                  <p className={styles.meta}>Points forts: {((submitResult || mission.result)?.strengths || []).join(' | ') || 'Aucun'}</p>
                  <p className={styles.meta}>Points faibles: {((submitResult || mission.result)?.weaknesses || []).join(' | ') || 'Aucun'}</p>
                  <ul className={styles.errorList}>
                    {((submitResult || mission.result)?.errors || []).map((errMsg, idx) => (
                      <li key={`${idx}-${errMsg}`}>{errMsg}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <section className={styles.card}>
              <h2>Vue globale facilitateur</h2>
              {collectiveResult ? (
                <p className={styles.score}>Score collectif: {Number(collectiveResult.score || 0)}/100</p>
              ) : null}
              {facilitatorBoard.length === 0 ? (
                <p className={styles.empty}>Aucun participant actif pour le moment.</p>
              ) : (
                <div className={styles.boardGrid}>
                  {facilitatorBoard.map((item) => (
                    <article key={item.participant_id} className={styles.facilitatorCard}>
                      <p className={styles.order}>Participant</p>
                      <h3>{resolveParticipantLabel(item)}</h3>
                      <p className={styles.meta}>Timeline: {item.timeline_length} tâches</p>
                      <p className={styles.meta}>Soumis: {item.submitted ? 'Oui' : 'Non'}</p>
                      <p className={styles.meta}>Erreurs: {item.errors_count ?? 0}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {error ? <p className={styles.error}>{error}</p> : null}
        </main>

        <aside className={styles.sidebar}>
          <ChallengeRulesPanel
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName="Mission Critique"
            objective={rulesContent.objective}
            facilitatorRules={facilitatorRules}
            participantRules={participantRules}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title="Chrono"
            remainingSeconds={timerRemainingSeconds}
            durationSeconds={timerDurationSeconds}
            status={timerState}
            isFacilitator={isFacilitator}
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

          <ChallengeChatCard
            title="Chat"
            messages={chatMessages}
            currentAuthor={displayName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            placeholder="Écrire un message"
            maxLength={240}
          />
        </aside>
      </div>
    </div>
  );
}
