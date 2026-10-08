'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useFacilitatorTimerControls from '@/lib/challenges/useFacilitatorTimerControls';
import { refreshChallengeStateBeforeStart } from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getMissionCritiqueRulesPreset } from '@/lib/challenges/missionCritiqueRules';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeHeader from '../ChallengeHeader';
import ChallengePresentation from '../ChallengePresentation';
import useI18n from '@/lib/i18n/useI18n';
import useModalFocus from '@/lib/useModalFocus';
import { ClipboardList, ListTodo, ArrowUp, ArrowDown, Trash2, X, Check, Users, CircleCheck, AlertTriangle } from 'lucide-react';
import styles from './MissionCritique.module.css';

const PHASES = Object.freeze([
  { key: 'cadrage', label: 'Cadrage', mobileLabel: 'Cadre', className: 'phaseCadrage' },
  { key: 'preparation', label: 'Préparation', mobileLabel: 'Prépa', className: 'phasePreparation' },
  { key: 'execution', label: 'Exécution', mobileLabel: 'Exéc.', className: 'phaseExecution' },
  { key: 'cloture', label: 'Clôture', mobileLabel: 'Clôt.', className: 'phaseCloture' },
]);

function inferPhaseKey(index, total) {
  const safeTotal = Math.max(1, Number(total || 1));
  const ratio = Number(index || 0) / safeTotal;
  if (ratio < 0.25) return 'cadrage';
  if (ratio < 0.5) return 'preparation';
  if (ratio < 0.75) return 'execution';
  return 'cloture';
}

function phaseLabel(phase, isEn) {
  if (!isEn) return phase.label;
  if (phase.key === 'cadrage') return 'Scoping';
  if (phase.key === 'preparation') return 'Preparation';
  if (phase.key === 'execution') return 'Execution';
  return 'Closure';
}

function mobilePhaseLabel(phase, isEn) {
  if (!isEn) return phase.mobileLabel;
  if (phase.key === 'cadrage') return 'Scope';
  if (phase.key === 'preparation') return 'Prep';
  if (phase.key === 'execution') return 'Execute';
  return 'Close';
}

function normalizeName(value) {
  return String(value || '').trim();
}

function formatParticipantName(value) {
  return normalizeName(value).toLocaleLowerCase()
    .replace(/\p{L}[\p{L}\p{M}]*/gu, (word) => word.charAt(0).toLocaleUpperCase() + word.slice(1));
}

function isEmailLike(value) {
  return normalizeName(value).includes('@');
}

export default function MissionCritiqueChallenge({
  engineKey,
  runtimePayload,
  socket,
  context,
  onChallengeCompleted,
}) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const [activePhase, setActivePhase] = useState('cadrage');
  const [modalTaskId, setModalTaskId] = useState('');
  const [submitResult, setSubmitResult] = useState(null);

  const { state, error, isFacilitator, emitEvent, connected } = useRealtimeChallenge({
    runtimePayload,
    socket,
    context,
    onChallengeCompleted,
  });
  const timerControls = useFacilitatorTimerControls({ socket, emitEvent, state, isFacilitator });

  const mission = state?.mission || {};
  const tasks = Array.isArray(mission.tasks) ? mission.tasks : [];
  const timeline = Array.isArray(mission.timeline) ? mission.timeline : [];
  const facilitatorBoard = Array.isArray(mission.facilitator_board)
    ? mission.facilitator_board
    : [];
  const collectiveResult = mission.collective_result || null;
  const boardSummary = useMemo(() => {
    const knownTaskIds = new Set(tasks.map((task) => String(task.id)));
    const placedTaskIds = new Set(facilitatorBoard.flatMap((item) => (
      Array.isArray(item.timeline) ? item.timeline.map(String).filter((id) => knownTaskIds.has(id)) : []
    )));
    return {
      placed: placedTaskIds.size,
      submitted: facilitatorBoard.filter((item) => item.submitted).length,
      errors: facilitatorBoard.reduce((total, item) => total + (item.submitted ? Number(item.errors_count || 0) : 0), 0),
    };
  }, [tasks, facilitatorBoard]);

  const displayName = useMemo(() => {
    const firstName = String(
      runtimePayload?.context?.firstName ||
        runtimePayload?.context?.first_name ||
        context?.firstName ||
        context?.first_name ||
        ''
    ).trim();
    const lastName = String(
      runtimePayload?.context?.lastName ||
        runtimePayload?.context?.last_name ||
        context?.lastName ||
        context?.last_name ||
        ''
    ).trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return formatParticipantName(fullName);

    const fromPayload = String(
      runtimePayload?.context?.displayName || runtimePayload?.context?.name || ''
    ).trim();
    if (fromPayload && !isEmailLike(fromPayload)) return formatParticipantName(fromPayload);

    const fallbackName = String(context?.displayName || context?.name || '').trim();
    if (fallbackName && !isEmailLike(fallbackName)) return formatParticipantName(fallbackName);

    return 'Participant';
  }, [runtimePayload, context]);

  function resolveParticipantLabel(item) {
    const firstName = String(item?.first_name || item?.firstName || '').trim();
    const lastName = String(item?.last_name || item?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return formatParticipantName(fullName);

    const fromPayload = String(
      item?.display_name || item?.participant_name || item?.name || ''
    ).trim();
    if (fromPayload && !isEmailLike(fromPayload)) return formatParticipantName(fromPayload);
    if (Number.isFinite(Number(item?.slot))) return `Participant ${item.slot}`;
    return 'Participant';
  }

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat, chatDelivery } = useChallengeChat({
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

  // Keep the exact server order in backlog. No client-side sort.
  const backlogTasks = useMemo(() => tasks, [tasks]);

  const timerState = String(state?.timer?.status || 'idle').trim();
  const normalizedTimerState = timerState.toLowerCase();
  const isDebrief = Boolean(state?.summary) || ['completed', 'timeout'].includes(normalizedTimerState);
  const hasChallengeStarted =
    state?.timer?.enabled === false ||
    normalizedTimerState === 'running' ||
    normalizedTimerState === 'paused' ||
    normalizedTimerState === 'completed' ||
    normalizedTimerState === 'stopped' ||
    normalizedTimerState === 'timeout';
  const canEditTimeline =
    connected && !isFacilitator && (state?.timer?.enabled === false || timerState === 'running');

  const timerRemainingSeconds = Math.max(0, Number(state?.timer?.remaining_seconds || 0));
  const timerDurationSeconds = Math.max(1, Number(state?.timer?.duration_seconds || 1));
  const rulesPreset = useMemo(() => getMissionCritiqueRulesPreset(locale), [locale]);
  const rulesContent = useMemo(
    () => ({
      objective: rulesPreset.objective,
      facilitator: [...rulesPreset.facilitator],
      participant: [...rulesPreset.participant],
      footnote: rulesPreset.footnote,
    }),
    [rulesPreset]
  );
  const challengeName = String(rulesPreset?.challengeName || 'Mission Critique').trim();
  const challengeSubtitle = String(rulesPreset?.subtitle || '').trim();
  const rulesParticipantsMeta = useMemo(
    () => ({
      min: rulesPreset.participants.min,
      recommended: rulesPreset.participants.recommended,
      max: rulesPreset.participants.max,
    }),
    [rulesPreset]
  );

  const facilitatorRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.facilitator) ? rulesContent.facilitator : [];
    return [
      ...baseRules,
      isEn
        ? 'Scoring (transparent): all individual timelines are merged end-to-end, in participant order, into a single collective timeline, which is validated once (0 to 100).'
        : 'Calcul du score (transparent) : les timelines individuelles sont mises bout à bout, dans l’ordre des participants, pour former une seule timeline collective, validée une seule fois (0 à 100).',
      isEn
        ? 'Penalties: unmet dependency (-8), missing critical task (-10), duplicate (-5), unknown task (-3).'
        : 'Pénalités: dépendance non respectée (-8), tâche critique manquante (-10), doublon (-5), tâche inconnue (-3).',
      isEn
        ? 'Formula: 100 - penalties (clamped between 0 and 100).'
        : 'Formule: 100 - pénalités (borné entre 0 et 100).',
      isEn
        ? 'The team must converge and submit one coherent collective timeline.'
        : 'L’équipe doit converger puis soumettre une seule timeline cohérente au niveau collectif.',
      isEn
        ? 'Distribute tasks by phase (scoping, preparation, execution, closure) to balance workload.'
        : 'Répartissez les tâches par phase (cadrage, préparation, exécution, clôture) pour équilibrer la charge.',
      isEn
        ? 'Assign a dependency owner to validate prerequisites before each major move.'
        : 'Affectez un responsable dépendances pour valider les prérequis avant chaque déplacement majeur.',
    ];
  }, [rulesContent?.facilitator, isEn]);

  const participantRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.participant) ? rulesContent.participant : [];
    return [
      ...baseRules,
      isEn
        ? 'Coordinate to submit one unique and coherent timeline for the entire team.'
        : 'Synchronisez-vous pour soumettre une timeline unique et cohérente pour toute l’équipe.',
      isEn
        ? 'Prioritize dependencies and critical tasks first, then complete the remaining backlog.'
        : 'Priorisez d’abord les dépendances et les tâches critiques, puis complétez le reste du backlog.',
    ];
  }, [rulesContent?.participant, isEn]);

  // Phases come from the server (persisted per task). Ratio inference is only
  // a fallback for legacy timelines that predate server-side phase storage.
  const serverPhases = useMemo(
    () => (mission.phases && typeof mission.phases === 'object' ? mission.phases : {}),
    [mission.phases]
  );

  const phaseOfTask = useMemo(
    () =>
      (taskId, timelineIndex = 0) => {
        const raw = String(serverPhases[String(taskId)] || '').trim();
        if (PHASES.some((phase) => phase.key === raw)) return raw;
        return inferPhaseKey(timelineIndex, timeline.length);
      },
    [serverPhases, timeline.length]
  );

  const phaseItems = useMemo(() => {
    const buckets = PHASES.reduce((acc, phase) => {
      acc[phase.key] = [];
      return acc;
    }, {});

    timeline.forEach((taskId, timelineIndex) => {
      const id = String(taskId);
      const phaseKey = phaseOfTask(id, timelineIndex);
      const safePhaseKey = buckets[phaseKey] ? phaseKey : 'cloture';
      buckets[safePhaseKey].push({
        taskId: id,
        timelineIndex,
      });
    });

    return buckets;
  }, [phaseOfTask, timeline]);

  const activePhaseItems = phaseItems[activePhase] || [];

  const modalTask = modalTaskId ? taskMap.get(String(modalTaskId)) : null;
  const modalRef = useRef(null);
  const modalAssignedPhase =
    modalTask && timelineSet.has(String(modalTask.id))
      ? phaseOfTask(modalTask.id, timeline.indexOf(modalTask.id))
      : '';

  useModalFocus(Boolean(modalTask), modalRef, () => setModalTaskId(''));

  useEffect(() => {
    if (!modalTaskId) return () => {};
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalTaskId]);

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

  function openTaskModal(taskId) {
    if (!canEditTimeline) return;
    setModalTaskId(String(taskId));
  }

  function closeTaskModal() {
    setModalTaskId('');
  }

  function assignTaskToPhase(taskId, phaseKey) {
    if (!canEditTimeline) return;
    const id = String(taskId);
    const safePhase = PHASES.some((phase) => phase.key === phaseKey) ? phaseKey : 'cloture';
    const currentPhase = timelineSet.has(id) ? phaseOfTask(id, timeline.indexOf(id)) : '';
    if (currentPhase === safePhase) {
      closeTaskModal();
      return;
    }
    if (currentPhase) {
      if (!emitEvent('mission.task.remove', { taskId: id })) return;
    }
    if (emitEvent('mission.task.add', { taskId: id, phase: safePhase })) closeTaskModal();
  }

  function removeTaskFromTimeline(taskId) {
    if (!canEditTimeline) return;
    if (emitEvent('mission.task.remove', { taskId: String(taskId) })) closeTaskModal();
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

  function handleStartChallenge() {
    refreshChallengeStateBeforeStart(emitEvent);
    emitEvent('timer.start');
  }

  return (
    <ChallengePresentation className={`${styles.container} ${roleViewClass}`} isDebrief={isDebrief}>
      <ChallengeHeader
        title={challengeName}
        subtitle={
          challengeSubtitle ||
          String(
            state?.config?.scenario ||
              runtimePayload?.config?.scenario ||
              'Organiser un séminaire d’entreprise pour 80 personnes.'
          )
        }
        timer={{ remainingSeconds: timerRemainingSeconds }}
        headerAction={
          hasChallengeStarted ? (
            <ChallengeRulesPanel
              inHeader
              isStarted={hasChallengeStarted}
              isFacilitator={isFacilitator}
              showPrestartCard={false}
              challengeName={challengeName}
              objective={rulesContent.objective}
              participantsMeta={rulesParticipantsMeta}
              facilitatorRules={facilitatorRules}
              participantRules={participantRules}
              footnote={rulesContent.footnote}
            />
          ) : null
        }
      />

      <div className="challenge-mobile-timer">
        <ChallengeTimerCard
          title={isEn ? 'Timer' : 'Chrono'}
          remainingSeconds={timerRemainingSeconds}
          durationSeconds={timerDurationSeconds}
          status={timerState}
          isFacilitator={isFacilitator}
          onPause={timerControls.pause}
          onResume={timerControls.resume}
          controlPending={timerControls.busy}
          controlFeedback={timerControls.feedback}
        />
      </div>

      <div className={styles.layout} data-challenge-layout>
        <main className={styles.mainPane}>
          {!hasChallengeStarted ? (
            <section className={styles.card}>
              <ChallengeRulesPanel
                isStarted={false}
                isFacilitator={isFacilitator}
                challengeName={challengeName}
                objective={rulesContent.objective}
                participantsMeta={rulesParticipantsMeta}
                facilitatorRules={facilitatorRules}
                participantRules={participantRules}
                footnote={rulesContent.footnote}
                onStart={isFacilitator ? handleStartChallenge : null}
              />
            </section>
          ) : !isFacilitator ? (
            <>
              <section className={styles.card}>
                <div className={styles.stepperHead}>
                  <div className={styles.sectionTitleGroup}>
                    <ClipboardList
                      className={styles.sectionTitleIcon}
                      size={22}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <div>
                      <h2>{isEn ? 'Timeline' : 'Timeline'}</h2>
                      <p>
                        {isEn
                          ? 'Assign tasks from the backlog, then order them inside each phase.'
                          : 'Affectez les tâches depuis le backlog, puis ordonnez-les dans chaque phase.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={styles.stepper}
                  role="tablist"
                  aria-label={isEn ? 'Timeline phases' : 'Phases de la timeline'}
                >
                  {PHASES.map((phase) => {
                    const count = (phaseItems[phase.key] || []).length;
                    const isActive = activePhase === phase.key;
                    return (
                      <button
                        key={phase.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        id={`mission-tab-${phase.key}`}
                        aria-controls="mission-phase-panel"
                        tabIndex={isActive ? 0 : -1}
                        className={`${styles.stepperStep} ${styles[phase.className]}${isActive ? ` ${styles.stepperStepActive}` : ''}`}
                        onClick={() => setActivePhase(phase.key)}
                        onKeyDown={(event) => {
                          const index = PHASES.findIndex((entry) => entry.key === phase.key);
                          let nextIndex;
                          if (event.key === 'ArrowRight') nextIndex = (index + 1) % PHASES.length;
                          if (event.key === 'ArrowLeft') nextIndex = (index + PHASES.length - 1) % PHASES.length;
                          if (event.key === 'Home') nextIndex = 0;
                          if (event.key === 'End') nextIndex = PHASES.length - 1;
                          if (nextIndex === undefined) return;
                          event.preventDefault();
                          setActivePhase(PHASES[nextIndex].key);
                          event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex].focus();
                        }}
                      >
                        <span className={styles.stepLabel} data-mobile-label={mobilePhaseLabel(phase, isEn)}>{phaseLabel(phase, isEn)}</span>
                        <span className={styles.stepCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div id="mission-phase-panel" className={styles.phasePanel} role="tabpanel" aria-labelledby={`mission-tab-${activePhase}`}>
                  {activePhaseItems.length === 0 ? (
                    <p className={styles.empty}>
                      {isEn
                        ? 'No task in this phase yet. Assign one from the backlog below.'
                        : 'Aucune tâche dans cette phase. Affectez-en une depuis le backlog ci-dessous.'}
                    </p>
                  ) : (
                    activePhaseItems.map((item, indexInPhase) => {
                      const task = taskMap.get(String(item.taskId));
                      const canMoveUp = indexInPhase > 0;
                      const canMoveDown = indexInPhase < activePhaseItems.length - 1;
                      const upTarget = canMoveUp
                        ? activePhaseItems[indexInPhase - 1].timelineIndex
                        : item.timelineIndex;
                      const downTarget = canMoveDown
                        ? activePhaseItems[indexInPhase + 1].timelineIndex
                        : item.timelineIndex;
                      const itemKey = `${item.taskId}-${item.timelineIndex}`;
                      return (
                        <article key={itemKey} className={styles.timelineCodeItem}>
                          <div className={styles.timelineItemRow}>
                            <span className={styles.timelineItemLabel}>{task?.label || item.taskId}</span>
                            <span className={styles.timelineItemInlineControls}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveTaskWithinPhase(item.timelineIndex, upTarget)}
                                disabled={!canEditTimeline || !canMoveUp}
                                title={isEn ? 'Move up' : 'Monter'}
                                aria-label={isEn ? 'Move up in phase' : 'Monter dans la phase'}
                              >
                                <ArrowUp size={16} strokeWidth={2.4} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveTaskWithinPhase(item.timelineIndex, downTarget)}
                                disabled={!canEditTimeline || !canMoveDown}
                                title={isEn ? 'Move down' : 'Descendre'}
                                aria-label={isEn ? 'Move down in phase' : 'Descendre dans la phase'}
                              >
                                <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                onClick={() =>
                                  emitEvent('mission.task.remove', { index: item.timelineIndex })
                                }
                                disabled={!canEditTimeline}
                                title={isEn ? 'Remove' : 'Retirer'}
                                aria-label={isEn ? 'Remove from timeline' : 'Retirer de la timeline'}
                              >
                                <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
                              </button>
                            </span>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>

                <div className={styles.timelineSubmitRow}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.primaryBtnCompact}`}
                    onClick={submitTimeline}
                    disabled={!canEditTimeline || timeline.length === 0}
                  >
                    {isEn ? 'Submit my solution' : 'Valider ma solution'}
                  </button>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHead}>
                  <div className={styles.sectionTitleGroup}>
                    <ListTodo
                      className={styles.sectionTitleIcon}
                      size={22}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <h2>{isEn ? 'Mission backlog' : 'Backlog mission'}</h2>
                  </div>
                  <p>
                    {isEn
                      ? 'Click a task to assign it to a phase.'
                      : 'Cliquez sur une tâche pour l’affecter à une phase.'}
                  </p>
                </div>

                {backlogTasks.length === 0 ? (
                  <p className={styles.empty}>
                    {isEn ? 'No tasks available.' : 'Aucune tâche disponible.'}
                  </p>
                ) : (
                  <div className={styles.backlogList}>
                    {backlogTasks.map((task) => {
                      const id = String(task.id);
                      const assigned = timelineSet.has(id);
                      const assignedPhaseKey = assigned
                        ? phaseOfTask(id, timeline.indexOf(task.id))
                        : '';
                      const assignedPhase = PHASES.find((phase) => phase.key === assignedPhaseKey);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className={`${styles.taskRow}${assigned ? ` ${styles.taskRowAssigned}` : ''}`}
                          onClick={() => openTaskModal(id)}
                          disabled={!canEditTimeline}
                          title={String(task.label || '').trim()}
                        >
                          <span className={styles.taskRowLabel}>{task.label}</span>
                          {assignedPhase ? (
                            <span
                              className={`${styles.phaseTag} ${styles[assignedPhase.className]}`}
                            >
                              {phaseLabel(assignedPhase, isEn)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {modalTask ? (
                <div className={styles.modalOverlay} onClick={closeTaskModal} role="presentation">
                  <div
                    className={styles.modalCard}
                    ref={modalRef}
                    tabIndex={-1}
                    role="dialog"
                    aria-modal="true"
                    aria-label={String(modalTask.label || '')}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className={styles.modalHead}>
                      <h3 className={styles.modalTitle}>{modalTask.label}</h3>
                      <button
                        type="button"
                        className={styles.modalCloseBtn}
                        onClick={closeTaskModal}
                        aria-label={isEn ? 'Close' : 'Fermer'}
                        title={isEn ? 'Close' : 'Fermer'}
                      >
                        <X size={16} strokeWidth={2.1} aria-hidden="true" />
                      </button>
                    </div>
                    <p className={styles.modalHint}>
                      {isEn ? 'Assign this task to a phase.' : 'Affectez cette tâche à une phase.'}
                    </p>
                    <div className={styles.modalPhaseGrid}>
                      {PHASES.map((phase) => (
                        <button
                          key={phase.key}
                          type="button"
                          className={`${styles.modalPhaseBtn} ${styles[phase.className]}${modalAssignedPhase === phase.key ? ` ${styles.modalPhaseBtnActive}` : ''}`}
                          onClick={() => assignTaskToPhase(modalTask.id, phase.key)}
                          disabled={!canEditTimeline}
                          aria-pressed={modalAssignedPhase === phase.key}
                        >
                          <span>{phaseLabel(phase, isEn)}</span>
                          {modalAssignedPhase === phase.key ? <span className={styles.selectedPhaseMark}><Check size={16} aria-hidden="true" />{isEn ? 'Selected' : 'Sélectionnée'}</span> : null}
                        </button>
                      ))}
                    </div>
                    {modalAssignedPhase ? (
                      <div className={styles.modalActions}>
                        <button
                          type="button"
                          className={`${styles.ghostBtn} ${styles.modalRemoveBtn}`}
                          onClick={() => removeTaskFromTimeline(modalTask.id)}
                          disabled={!canEditTimeline}
                        >
                          {isEn ? 'Remove from timeline' : 'Retirer de la timeline'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {submitResult || mission.result ? (
                <section className={styles.card} data-debrief-content={isDebrief || undefined}>
                  <h2>{isDebrief ? (isEn ? 'Team debrief' : 'Débrief équipe') : (isEn ? 'Result' : 'Résultat')}</h2>
                  <p className={styles.score}>
                    {isEn ? 'Score' : 'Score'}:{' '}
                    {Number((submitResult || mission.result)?.score || 0)}/100
                  </p>
                  <h3>{isEn ? 'Strengths' : 'Points forts'}</h3>
                  <p className={styles.meta}>
                    {((submitResult || mission.result)?.strengths || []).join(' | ') ||
                      (isEn ? 'None' : 'Aucun')}
                  </p>
                  <h3>{isEn ? 'Areas to review' : 'Points à améliorer'}</h3>
                  <p className={styles.meta}>
                    {((submitResult || mission.result)?.weaknesses || []).join(' | ') ||
                      (isEn ? 'None' : 'Aucun')}
                  </p>
                  <ul className={styles.errorList}>
                    {((submitResult || mission.result)?.errors || []).map((errMsg, idx) => (
                      <li key={`${idx}-${errMsg}`}>{errMsg}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <section className={styles.card} data-debrief-content={isDebrief || undefined}>
              <div className={styles.dashboardHeader}>
                <div>
                  <h2>{isDebrief ? (isEn ? 'Team debrief' : 'Débrief équipe') : (isEn ? 'Facilitator dashboard' : 'Tableau de bord facilitateur')}</h2>
                  <p className={styles.meta}>{isDebrief ? (isEn ? 'Review task placement, submissions and collective results.' : 'Analysez le placement des tâches, les soumissions et les résultats collectifs.') : (isEn ? 'Live task placement and submission tracking' : 'Suivi des tâches placées et des soumissions en temps réel')}</p>
                </div>
                {!isDebrief ? <span className={styles.liveBadge}><span aria-hidden="true" />{isEn ? 'Live' : 'En direct'}</span> : null}
              </div>
              <div className={styles.dashboardMetrics} data-debrief-metrics={isDebrief || undefined}>
                <article><Users size={20} aria-hidden="true" /><strong>{facilitatorBoard.length}</strong><span>{isEn ? 'Participants' : 'Participants'}</span></article>
                <article><ListTodo size={20} aria-hidden="true" /><strong>{boardSummary.placed}/{tasks.length}</strong><span>{isEn ? 'Unique tasks placed' : 'Tâches distinctes placées'}</span></article>
                <article><CircleCheck size={20} aria-hidden="true" /><strong>{boardSummary.submitted}/{facilitatorBoard.length}</strong><span>{isEn ? 'Submissions' : 'Soumissions'}</span></article>
                <article><AlertTriangle size={20} aria-hidden="true" /><strong>{boardSummary.submitted ? boardSummary.errors : '—'}</strong><span>{isEn ? 'Errors in submissions' : 'Erreurs des soumissions'}</span></article>
              </div>
              {collectiveResult ? (
                <p className={styles.score}>
                  {isEn ? 'Collective score' : 'Score collectif'}:{' '}
                  {Number(collectiveResult.score || 0)}/100
                </p>
              ) : null}
              {facilitatorBoard.length === 0 ? (
                <p className={styles.empty}>
                  {isEn ? 'No active participants yet.' : 'Aucun participant actif pour le moment.'}
                </p>
              ) : (
                <div className={styles.boardGrid}>
                  {facilitatorBoard.map((item) => {
                    const placed = new Set((Array.isArray(item.timeline) ? item.timeline : [])
                      .map(String).filter((id) => taskMap.has(id))).size;
                    const progress = tasks.length ? Math.round((placed / tasks.length) * 100) : 0;
                    const participantLabel = resolveParticipantLabel(item);
                    return (
                    <article key={item.participant_id} className={styles.facilitatorCard}>
                      <div className={styles.participantCardHeader}>
                        <div className={styles.participantIdentity}>
                          <span className={styles.participantAvatar} aria-hidden="true">{participantLabel.split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span>
                          <h3>{participantLabel}</h3>
                        </div>
                        <span className={`${styles.submissionBadge} ${item.submitted ? styles.submissionDone : styles.submissionPending}`}>
                          {item.submitted ? <CircleCheck size={15} aria-hidden="true" /> : <ClipboardList size={15} aria-hidden="true" />}
                          {item.submitted ? (isEn ? 'Submitted' : 'Soumis') : (isEn ? 'In progress' : 'En cours')}
                        </span>
                      </div>
                      <div className={styles.participantMetrics}>
                        <div><span>{isEn ? 'Tasks placed' : 'Tâches placées'}</span><strong>{placed}/{tasks.length}</strong></div>
                        <div><span>{isEn ? 'Errors' : 'Erreurs'}</span><strong className={item.submitted && item.errors_count > 0 ? styles.metricError : ''}>{item.submitted ? (item.errors_count ?? 0) : '—'}</strong><small>{item.submitted ? (isEn ? 'Validated submission' : 'Soumission évaluée') : (isEn ? 'Not evaluated yet' : 'Non évalué')}</small></div>
                      </div>
                      <div className={styles.participantProgress}>
                        <span>{isEn ? 'Task placement' : 'Placement des tâches'} <strong>{progress}%</strong></span>
                        <progress value={placed} max={Math.max(1, tasks.length)} aria-label={`${participantLabel} — ${isEn ? 'task placement' : 'placement des tâches'}`} />
                      </div>
                      <details className={styles.participantTimelineBlock} open>
                        <summary className={styles.miniTitle}>
                          {isEn ? 'Real-time timeline' : 'Timeline temps réel'}
                        </summary>
                        {Array.isArray(item.timeline) && item.timeline.length > 0 ? (
                          <div className={styles.phaseTimeline}>
                            {PHASES.map((phase) => {
                              const itemPhases =
                                item.phases && typeof item.phases === 'object' ? item.phases : {};
                              const facPhaseItems = item.timeline
                                .map((taskId, idx) => ({ taskId, idx }))
                                .filter((entry) => {
                                  const stored = String(
                                    itemPhases[String(entry.taskId)] || ''
                                  ).trim();
                                  const phaseKey = PHASES.some((p) => p.key === stored)
                                    ? stored
                                    : inferPhaseKey(entry.idx, item.timeline.length);
                                  return phaseKey === phase.key;
                                });

                              return (
                                <React.Fragment key={`${item.participant_id}-${phase.key}`}>
                                  <section
                                    className={`${styles.phaseLine} ${styles[phase.className]}`}
                                  >
                                    <div className={styles.phaseLineHeader}>
                                      <h3>{phaseLabel(phase, isEn)}</h3>
                                      <span>{facPhaseItems.length}</span>
                                    </div>
                                  </section>
                                  <section className={styles.timelineLane}>
                                    {facPhaseItems.length === 0 ? (
                                      <div className={styles.timelineLaneHint}>
                                        {isEn ? 'No action' : 'Aucune action'}
                                      </div>
                                    ) : (
                                      facPhaseItems.map((entry) => {
                                        const task = taskMap.get(String(entry.taskId));
                                        return (
                                          <article
                                            key={`${item.participant_id}-${phase.key}-${entry.taskId}-${entry.idx}`}
                                            className={styles.timelineCodeItem}
                                          >
                                            <div className={styles.timelineItemBody}>
                                              <p className={styles.meta}>
                                                {task?.label || String(entry.taskId)}
                                              </p>
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
                        ) : (
                          <p className={styles.meta}>
                            {isEn
                              ? 'No action placed yet.'
                              : 'Aucune action placée pour le moment.'}
                          </p>
                        )}
                      </details>
                    </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {error ? <p className={styles.error}>{error}</p> : null}
        </main>

        <aside className={styles.sidebar}>
          <div className="challenge-desktop-timer">
            <ChallengeTimerCard
              title={isEn ? 'Timer' : 'Chrono'}
              remainingSeconds={timerRemainingSeconds}
              durationSeconds={timerDurationSeconds}
              status={timerState}
              isFacilitator={isFacilitator}
              onPause={timerControls.pause}
              onResume={timerControls.resume}
              controlPending={timerControls.busy}
              controlFeedback={timerControls.feedback}
            />
          </div>

          <ChallengeChatCard
            title={isEn ? 'Chat' : 'Chat'}
            messages={chatMessages}
            currentAuthor={displayName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            delivery={chatDelivery}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            maxLength={240}
          />
        </aside>
      </div>
    </ChallengePresentation>
  );
}
