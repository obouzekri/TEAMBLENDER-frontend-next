'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
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

export default function MissionCritiqueChallenge({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const [dropTarget, setDropTarget] = useState({ phaseKey: '', index: -1 });
  const [dropPulseTarget, setDropPulseTarget] = useState({ phaseKey: '', index: -1 });
  const [dragTaskId, setDragTaskId] = useState('');
  const [phaseByTask, setPhaseByTask] = useState({});
  const [taskFilter, setTaskFilter] = useState('pending');
  const [taskQuery, setTaskQuery] = useState('');
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

  const displayName = useMemo(() => {
    const fromPayload = String(runtimePayload?.context?.displayName || '').trim();
    if (fromPayload) return fromPayload;
    const userId = String(context?.userId || context?.participantId || '').trim();
    return `participant-${userId || 'unknown'}`;
  }, [runtimePayload, context]);

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

  const taskCodeById = useMemo(() => {
    const map = new Map();
    tasks.forEach((task, index) => {
      map.set(String(task.id), `A${index + 1}`);
    });
    return map;
  }, [tasks]);

  const timelineSet = useMemo(() => new Set(timeline.map((taskId) => String(taskId))), [timeline]);

  const filteredTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const id = String(task.id || '').toLowerCase();
      const label = String(task.label || '').toLowerCase();
      const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
      const inTimeline = timelineSet.has(String(task.id));

      if (taskFilter === 'critical' && !task.critical) return false;
      if (taskFilter === 'pending' && inTimeline) return false;
      if (taskFilter === 'blocked' && dependencies.length === 0) return false;
      if (!q) return true;
      return label.includes(q) || id.includes(q);
    });
  }, [tasks, taskFilter, taskQuery, timelineSet]);

  const groupedTasks = useMemo(() => {
    const buckets = {
      critical: [],
      blocked: [],
      standard: []
    };

    filteredTasks.forEach((task) => {
      const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
      if (task.critical) {
        buckets.critical.push(task);
        return;
      }
      if (dependencies.length > 0) {
        buckets.blocked.push(task);
        return;
      }
      buckets.standard.push(task);
    });

    return [
      { key: 'critical', title: 'Taches critiques', hint: 'Impact fort sur le score', items: buckets.critical },
      { key: 'blocked', title: 'Taches avec dependances', hint: 'A placer au bon moment', items: buckets.blocked },
      { key: 'standard', title: 'Taches standards', hint: 'Execution et coordination', items: buckets.standard },
    ].filter((group) => group.items.length > 0);
  }, [filteredTasks]);

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
  const timerProgress = Math.max(0, Math.min(100, Math.round((timerRemainingSeconds / timerDurationSeconds) * 100)));

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

  const roleViewClass = isFacilitator ? styles.facilitatorView : styles.participantView;

  return (
    <div className={`${styles.container} ${roleViewClass}`}>
      <header className={styles.header}>
        <div className={styles.headerTitleLine}>
          <span className={styles.headerTitle}>Mission Critique</span>
          <span className={styles.headerDescription}>
            : {String(state?.config?.scenario || runtimePayload?.config?.scenario || 'Organiser un seminaire d\'entreprise pour 80 personnes.')}
          </span>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Engine: {engineKey}</span>
          <span className={styles.badge}>Statut: {timerState}</span>
          <span className={styles.badge}>Role: {isFacilitator ? 'Facilitateur' : 'Participant'}</span>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainPane}>
          {!hasChallengeStarted ? (
            <section className={styles.card}>
              <ChallengeRulesPanel
                isStarted={false}
                challengeName="Mission Critique"
                objective="Construisez une timeline coherent pour maximiser le score equipe avant la fin du chrono."
                facilitatorRules={[
                  'Lancez le chrono quand tous les participants sont prets.',
                  'Surveillez les blocages et relancez les arbitrages.',
                  'Appuyez la coordination via le chat et les retours rapides.'
                ]}
                participantRules={[
                  'Placez les taches dans les bonnes phases.',
                  'Respectez les dependances critiques et l ordre logique.',
                  'Validez votre proposition quand la timeline est coherente.'
                ]}
                footnote="Des le lancement, le brief se masque et la vue de mission devient active."
              />
            </section>
          ) : !isFacilitator ? (
            <>
              <section className={`${styles.card} ${styles.progressCard}`}>
                <div className={styles.progressMeta}>
                  <p className={styles.progressLabel}>Progression de mission</p>
                  <strong>{timeline.length}/{tasks.length} taches placees</strong>
                </div>
                <div className={styles.progressTrack}>
                  <span className={styles.progressFill} style={{ width: `${completionPercent}%` }} />
                </div>
              </section>

              <section className={styles.workspaceGrid}>
                <section className={`${styles.card} ${styles.taskCard}`}>
                  <div className={styles.sectionHead}>
                    <h2>Backlog mission</h2>
                    <p>Glisser-deposer ou clic pour ajouter</p>
                  </div>

                  <div className={styles.taskToolbar}>
                    <div className={styles.segmented}>
                      <button type="button" className={`${styles.segmentBtn}${taskFilter === 'pending' ? ` ${styles.segmentBtnActive}` : ''}`} onClick={() => setTaskFilter('pending')}>A placer</button>
                      <button type="button" className={`${styles.segmentBtn}${taskFilter === 'critical' ? ` ${styles.segmentBtnActive}` : ''}`} onClick={() => setTaskFilter('critical')}>Critiques</button>
                      <button type="button" className={`${styles.segmentBtn}${taskFilter === 'blocked' ? ` ${styles.segmentBtnActive}` : ''}`} onClick={() => setTaskFilter('blocked')}>Dependances</button>
                      <button type="button" className={`${styles.segmentBtn}${taskFilter === 'all' ? ` ${styles.segmentBtnActive}` : ''}`} onClick={() => setTaskFilter('all')}>Toutes</button>
                    </div>
                    <input
                      type="search"
                      className={styles.searchInput}
                      placeholder="Rechercher une tache"
                      value={taskQuery}
                      onChange={(event) => setTaskQuery(event.target.value)}
                    />
                  </div>

                  {groupedTasks.length === 0 ? (
                    <p className={styles.empty}>Aucune tache ne correspond a ce filtre.</p>
                  ) : (
                    <div className={styles.taskGroupList}>
                      {groupedTasks.map((group) => (
                        <section key={group.key} className={styles.taskGroup}>
                          <div className={styles.taskGroupHead}>
                            <h3>{group.title}</h3>
                            <span>{group.hint}</span>
                          </div>
                          <div className={styles.taskGrid}>
                            {group.items.map((task) => {
                              const inTimeline = timelineSet.has(String(task.id));
                              return (
                                <button
                                  key={task.id}
                                  type="button"
                                  className={`${styles.taskChip}${inTimeline ? ` ${styles.taskChipUsed}` : ''}${dragTaskId === String(task.id) ? ` ${styles.taskChipDragging}` : ''}${task.critical ? ` ${styles.taskChipCritical}` : ''}`}
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
                                      <strong className={styles.taskCode}>{taskCodeById.get(String(task.id)) || 'A?'}</strong>
                                      <span>{task.label}</span>
                                    </span>
                                    {task.critical ? <strong className={styles.critical}>Critique</strong> : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`${styles.card} ${styles.timelineCard}`}>
                  <div className={styles.timelineHead}>
                    <div>
                      <h2>Timeline par phases</h2>
                      <p>Glissez les taches dans chaque phase, puis ordonnez-les verticalement.</p>
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
                              <div className={styles.timelineLaneHint}>Deposer une action ici</div>
                            ) : (
                              items.map((item, indexInPhase) => {
                                const taskCode = taskCodeById.get(String(item.taskId)) || `A${item.timelineIndex + 1}`;
                                return (
                                  <article
                                    key={`${phase.key}-${item.taskId}-${item.timelineIndex}`}
                                    className={`${styles.timelineCodeItem}${dragTaskId === String(item.taskId) ? ` ${styles.timelineItemDragging}` : ''}`}
                                    draggable={canEditTimeline}
                                    onDragStart={(event) => onTaskDragStart(event, item.taskId, item.timelineIndex, 'timeline', phase.key, indexInPhase)}
                                    onDragEnd={onTaskDragEnd}
                                  >
                                    <span className={styles.timelineCode}>{taskCode}</span>
                                    <button
                                      type="button"
                                      className={styles.ghostBtn}
                                      onClick={() => emitEvent('mission.task.remove', { index: item.timelineIndex })}
                                      disabled={!canEditTimeline}
                                    >
                                      Retirer
                                    </button>
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
                <section className={styles.card}>
                  <h2>Resultat</h2>
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
              {facilitatorBoard.length === 0 ? (
                <p className={styles.empty}>Aucun participant actif pour le moment.</p>
              ) : (
                <div className={styles.boardGrid}>
                  {facilitatorBoard.map((item) => (
                    <article key={item.participant_id} className={styles.facilitatorCard}>
                      <p className={styles.order}>Participant {item.slot}</p>
                      <h3>{item.participant_id}</h3>
                      <p className={styles.meta}>Timeline: {item.timeline_length} taches</p>
                      <p className={styles.meta}>Soumis: {item.submitted ? 'Oui' : 'Non'}</p>
                      <p className={styles.meta}>Score: {item.score ?? '-'}</p>
                      <p className={styles.meta}>Erreurs: {item.errors_count}</p>
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
            showPrestartCard={false}
            challengeName="Mission Critique"
            objective="Rappel des regles disponible a tout moment pendant la session."
            facilitatorRules={[
              'Piloter le rythme et la priorisation collective.',
              'Recadrer les decisions non coherentes.'
            ]}
            participantRules={[
              'Structurer la timeline selon les phases.',
              'Collaborer activement sur les dependances.'
            ]}
          />

          <ChallengeTimerCard
            className={styles.timerCard}
            title="Chrono"
            remainingSeconds={timerRemainingSeconds}
            durationSeconds={timerDurationSeconds}
            status={timerState}
            progressPercent={timerProgress}
            isFacilitator={isFacilitator}
            waitingText="⏳ En attente du facilitateur"
            ringAction={isFacilitator ? (
              <button
                className={styles.timerIconBtn}
                type="button"
                onClick={() => {
                  if (timerState === 'running') emitEvent('timer.pause');
                  else if (timerState === 'paused') emitEvent('timer.resume');
                  else emitEvent('timer.start');
                }}
                title={timerState === 'running' ? 'Mettre en pause' : 'Demarrer / Reprendre'}
                aria-label={timerState === 'running' ? 'Mettre en pause' : 'Demarrer / Reprendre'}
              >
                {timerState === 'running' ? '⏸' : '▶'}
              </button>
            ) : null}
          />

          <ChallengeChatCard
            className={styles.chatCard}
            title="Chat"
            messages={chatMessages}
            currentAuthor={displayName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            placeholder="Ecrire un message"
            maxLength={240}
          />
        </aside>
      </div>
    </div>
  );
}
