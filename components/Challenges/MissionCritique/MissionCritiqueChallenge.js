'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import styles from './MissionCritique.module.css';

const QUICK_CHAT_TEMPLATES = Object.freeze([
  'Je prends la phase cadrage',
  'Verifier les dependances critiques',
  'On verrouille la timeline finale ?'
]);

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

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function MissionCritiqueChallenge({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
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

  const taskMap = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => map.set(String(task.id), task));
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
  const canEditTimeline = !isFacilitator && (state?.timer?.enabled === false || timerState === 'running');

  const timerRemainingSeconds = Math.max(0, Number(state?.timer?.remaining_seconds || 0));
  const timerDurationSeconds = Math.max(1, Number(state?.timer?.duration_seconds || 1));
  const timerProgress = Math.max(0, Math.min(100, Math.round((timerRemainingSeconds / timerDurationSeconds) * 100)));

  const timerToneClass = useMemo(() => {
    if (timerState !== 'running') return styles.timerToneIdle;
    if (timerProgress <= 20) return styles.timerToneDanger;
    if (timerProgress <= 55) return styles.timerToneWarn;
    return styles.timerToneSafe;
  }, [timerProgress, timerState]);

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

      if (type === 'chat.message') {
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
      }

      if (type === 'mission.completed' && payload?.result) {
        setSubmitResult(payload.result);
      }
    };

    socket.on('challenge:event', onEvent);
    return () => {
      socket.off('challenge:event', onEvent);
    };
  }, [socket]);

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

  function sendQuickChat(text) {
    const message = String(text || '').trim();
    if (!message) return;
    emitEvent('chat.message', {
      text: message,
      author: displayName,
    });
  }

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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Mission Critique</h1>
          <p>{String(state?.config?.scenario || runtimePayload?.config?.scenario || '')}</p>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>Engine: {engineKey}</span>
          <span className={styles.badge}>Statut: {timerState}</span>
          <span className={styles.badge}>Role: {isFacilitator ? 'Facilitateur' : 'Participant'}</span>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainPane}>
          {!isFacilitator ? (
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
                              const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
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
                                  title={dependencies.length ? `Dependances: ${dependencies.join(', ')}` : 'Sans dependance'}
                                >
                                  <div className={styles.taskChipTop}>
                                    <span className={styles.taskChipTitle}>{task.label}</span>
                                    {task.critical ? <strong className={styles.critical}>Critique</strong> : null}
                                  </div>
                                  <p className={styles.taskChipMeta}>
                                    {dependencies.length ? `Dependances: ${dependencies.join(', ')}` : 'Sans dependance'}
                                  </p>
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
                      return (
                        <section
                          key={phase.key}
                          className={`${styles.phaseCard} ${styles[phase.className]}${dropTarget.phaseKey === phase.key ? ` ${styles.phaseCardActive}` : ''}`}
                        >
                          <header className={styles.phaseHeader}>
                            <div className={styles.phaseTitleRow}>
                              <h3>{phase.label}</h3>
                              <span>{items.length}</span>
                            </div>
                            <div className={styles.phaseSeparator} />
                          </header>

                          <div className={styles.phaseStack}>
                            <div
                              className={`${styles.phaseDropZone}${dropTarget.phaseKey === phase.key && dropTarget.index === 0 ? ` ${styles.phaseDropZoneActive}` : ''}${dropPulseTarget.phaseKey === phase.key && dropPulseTarget.index === 0 ? ` ${styles.dropZonePulse}` : ''}`}
                              onDragOver={(event) => {
                                if (!canEditTimeline) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                setDropTarget({ phaseKey: phase.key, index: 0 });
                              }}
                              onDragLeave={() => {
                                setDropTarget((prev) => (
                                  prev.phaseKey === phase.key && prev.index === 0
                                    ? { phaseKey: '', index: -1 }
                                    : prev
                                ));
                              }}
                              onDrop={(event) => onTimelineDrop(event, phase.key, 0)}
                            >
                              {items.length === 0 ? <span>Deposer une tache ici</span> : null}
                            </div>

                            {items.map((item, indexInPhase) => {
                              const task = taskMap.get(String(item.taskId));
                              const dependencies = Array.isArray(task?.dependencies) ? task.dependencies : [];
                              return (
                                <React.Fragment key={`${phase.key}-${item.taskId}-${item.timelineIndex}`}>
                                  <article
                                    className={`${styles.timelineItem}${dragTaskId === String(item.taskId) ? ` ${styles.timelineItemDragging}` : ''}`}
                                    draggable={canEditTimeline}
                                    onDragStart={(event) => onTaskDragStart(event, item.taskId, item.timelineIndex, 'timeline', phase.key, indexInPhase)}
                                    onDragEnd={onTaskDragEnd}
                                  >
                                    <div className={styles.timelineItemBody}>
                                      <p className={styles.order}>Etape {item.timelineIndex + 1}</p>
                                      <h3>{task?.label || item.taskId}</h3>
                                      {task?.critical ? <strong className={styles.critical}>Critique</strong> : null}
                                      <p className={styles.meta}>
                                        {dependencies.length ? `Dependances: ${dependencies.join(', ')}` : 'Sans dependance'}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.ghostBtn}
                                      onClick={() => emitEvent('mission.task.remove', { index: item.timelineIndex })}
                                      disabled={!canEditTimeline}
                                    >
                                      Retirer
                                    </button>
                                  </article>

                                  <div
                                    className={`${styles.phaseDropZone}${dropTarget.phaseKey === phase.key && dropTarget.index === indexInPhase + 1 ? ` ${styles.phaseDropZoneActive}` : ''}${dropPulseTarget.phaseKey === phase.key && dropPulseTarget.index === indexInPhase + 1 ? ` ${styles.dropZonePulse}` : ''}`}
                                    onDragOver={(event) => {
                                      if (!canEditTimeline) return;
                                      event.preventDefault();
                                      event.dataTransfer.dropEffect = 'move';
                                      setDropTarget({ phaseKey: phase.key, index: indexInPhase + 1 });
                                    }}
                                    onDragLeave={() => {
                                      setDropTarget((prev) => (
                                        prev.phaseKey === phase.key && prev.index === indexInPhase + 1
                                          ? { phaseKey: '', index: -1 }
                                          : prev
                                      ));
                                    }}
                                    onDrop={(event) => onTimelineDrop(event, phase.key, indexInPhase + 1)}
                                  >
                                    {dropTarget.phaseKey === phase.key && dropTarget.index === indexInPhase + 1 ? <span>Inserer ici</span> : null}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </section>
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
          <section className={`${styles.card} ${styles.timerCard}`}>
            <h2>Chrono</h2>
            <div
              className={`${styles.timerRing} ${timerToneClass}`}
              style={{
                background: `conic-gradient(currentColor ${Math.max(2, timerProgress)}%, rgba(148, 163, 184, 0.2) 0)`,
              }}
            >
              <div className={styles.timerCenter}>
                <p className={styles.timerTime}>{formatTimer(timerRemainingSeconds)}</p>
                <p className={styles.timerState}>{timerState === 'running' ? 'En cours' : timerState === 'paused' ? 'Pause' : 'Attente'}</p>
              </div>
            </div>
            <div className={styles.timerMetaBar}>
              <span>Progression</span>
              <strong>{timerProgress}%</strong>
            </div>
            {isFacilitator ? (
              <div className={styles.timerActions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    if (timerState === 'running') emitEvent('timer.pause');
                    else if (timerState === 'paused') emitEvent('timer.resume');
                    else emitEvent('timer.start');
                  }}
                >
                  {timerState === 'running' ? 'Pause' : timerState === 'paused' ? 'Reprendre' : 'Demarrer'}
                </button>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => emitEvent('timer.stop')}
                >
                  Stop
                </button>
              </div>
            ) : (
              <p className={styles.meta}>En attente du facilitateur pour demarrer le chrono.</p>
            )}
          </section>

          <section className={`${styles.card} ${styles.chatCard}`}>
            <h2>Chat equipe</h2>
            <div className={styles.quickChatRow}>
              {QUICK_CHAT_TEMPLATES.map((template) => (
                <button key={template} type="button" className={styles.quickChip} onClick={() => sendQuickChat(template)}>
                  {template}
                </button>
              ))}
            </div>
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
                className={styles.chatInput}
                placeholder="Ecrire un message"
                maxLength={240}
              />
              <button type="submit" className={styles.primaryBtn} disabled={!chatInput.trim()}>
                Envoyer
              </button>
            </form>
            <p className={styles.chatHint}>{chatInput.length}/240 caracteres</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
