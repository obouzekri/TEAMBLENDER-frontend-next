'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import styles from './MissionCritique.module.css';

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function MissionCritiqueChallenge({ engineKey, runtimePayload, socket, context, onChallengeCompleted }) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [dropIndex, setDropIndex] = useState(-1);
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

  function onTaskDragStart(event, taskId, index = -1, from = 'catalog') {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ taskId, index, from }));
  }

  function onTimelineDrop(event, toIndex) {
    if (!canEditTimeline) return;
    event.preventDefault();
    setDropIndex(-1);

    let dragData = null;
    try {
      dragData = JSON.parse(String(event.dataTransfer.getData('application/json') || '{}'));
    } catch {
      dragData = null;
    }

    const taskId = String(dragData?.taskId || '').trim();
    if (!taskId) return;

    if (dragData?.from === 'timeline' && Number.isInteger(dragData?.index)) {
      emitEvent('mission.task.move', {
        fromIndex: Number(dragData.index),
        toIndex: Number(toIndex),
      });
      return;
    }

    emitEvent('mission.task.add', {
      taskId,
      index: Number(toIndex),
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
              <section className={styles.card}>
                <h2>Liste des taches</h2>
                <div className={styles.taskGrid}>
                  {tasks.map((task) => {
                    const inTimeline = timeline.includes(task.id);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={`${styles.taskChip}${inTimeline ? ` ${styles.taskChipUsed}` : ''}`}
                        draggable={canEditTimeline}
                        onDragStart={(event) => onTaskDragStart(event, task.id, -1, 'catalog')}
                        onClick={() => {
                          if (!canEditTimeline) return;
                          emitEvent('mission.task.add', { taskId: task.id, index: timeline.length });
                        }}
                        disabled={!canEditTimeline}
                        title={task.dependencies?.length ? `Dependances: ${task.dependencies.join(', ')}` : 'Sans dependance'}
                      >
                        <span>{task.label}</span>
                        {task.critical ? <strong className={styles.critical}>Critique</strong> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.timelineHead}>
                  <h2>Timeline ordonnee</h2>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={submitTimeline}
                    disabled={!canEditTimeline || timeline.length === 0}
                  >
                    Valider ma solution
                  </button>
                </div>

                <div className={styles.timelineList}>
                  <div
                    className={`${styles.dropZone}${dropIndex === 0 ? ` ${styles.dropZoneActive}` : ''}`}
                    onDragOver={(event) => {
                      if (!canEditTimeline) return;
                      event.preventDefault();
                      setDropIndex(0);
                    }}
                    onDragLeave={() => setDropIndex((prev) => (prev === 0 ? -1 : prev))}
                    onDrop={(event) => onTimelineDrop(event, 0)}
                  />

                  {timeline.length === 0 ? (
                    <p className={styles.empty}>Glissez des taches ici pour construire la timeline.</p>
                  ) : timeline.map((taskId, index) => {
                    const task = taskMap.get(String(taskId));
                    return (
                      <React.Fragment key={`${taskId}-${index}`}>
                        <article
                          className={styles.timelineItem}
                          draggable={canEditTimeline}
                          onDragStart={(event) => onTaskDragStart(event, taskId, index, 'timeline')}
                        >
                          <div>
                            <p className={styles.order}>Etape {index + 1}</p>
                            <h3>{task?.label || taskId}</h3>
                            {task?.dependencies?.length ? (
                              <p className={styles.meta}>Dependances: {task.dependencies.join(', ')}</p>
                            ) : <p className={styles.meta}>Sans dependance</p>}
                          </div>
                          <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => emitEvent('mission.task.remove', { index })}
                            disabled={!canEditTimeline}
                          >
                            Retirer
                          </button>
                        </article>
                        <div
                          className={`${styles.dropZone}${dropIndex === index + 1 ? ` ${styles.dropZoneActive}` : ''}`}
                          onDragOver={(event) => {
                            if (!canEditTimeline) return;
                            event.preventDefault();
                            setDropIndex(index + 1);
                          }}
                          onDragLeave={() => setDropIndex((prev) => (prev === index + 1 ? -1 : prev))}
                          onDrop={(event) => onTimelineDrop(event, index + 1)}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
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
            <div className={`${styles.timerRing} ${timerToneClass}`}>
              <div className={styles.timerCenter}>
                <p className={styles.timerTime}>{formatTimer(timerRemainingSeconds)}</p>
                <p className={styles.timerState}>{timerState === 'running' ? 'En cours' : timerState === 'paused' ? 'Pause' : 'Attente'}</p>
              </div>
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
          </section>
        </aside>
      </div>
    </div>
  );
}
