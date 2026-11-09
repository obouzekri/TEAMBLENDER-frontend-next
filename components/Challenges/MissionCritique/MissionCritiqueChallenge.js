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
import ChallengeDebriefHeading from '../ChallengeDebriefHeading';
import useI18n from '@/lib/i18n/useI18n';
import useModalFocus from '@/lib/useModalFocus';
import { ClipboardList, ListTodo, ArrowUp, ArrowDown, Trash2, X, Check, Users, CircleCheck, AlertTriangle, Flag, Link2 } from 'lucide-react';
import styles from './MissionCritique.module.css';
import { translate } from '@/lib/i18n';
import { normalizeLocale, DEFAULT_LOCALE } from '@/lib/i18n/routing';

const PHASES = Object.freeze([
  { key: 'cadrage', label: 'Cadrage', mobileLabel: 'Cadre', className: 'phaseCadrage' },
  { key: 'preparation', label: 'Planification', mobileLabel: 'Planif.', className: 'phasePreparation' },
  { key: 'execution', label: 'Jour J', mobileLabel: 'Jour J', className: 'phaseExecution' },
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

const PHASE_KEYS = new Set(['cadrage', 'preparation', 'execution', 'cloture']);

function phaseKey(phase) {
  return PHASE_KEYS.has(phase.key) ? phase.key : 'cloture';
}

function phaseLabel(phase, locale) {
  if (normalizeLocale(locale) === DEFAULT_LOCALE) return phase.label;
  return translate(locale, `challengeMission.phase_${phaseKey(phase)}`);
}

function mobilePhaseLabel(phase, locale) {
  if (normalizeLocale(locale) === DEFAULT_LOCALE) return phase.mobileLabel;
  return translate(locale, `challengeMission.phaseShort_${phaseKey(phase)}`);
}

const INDICATOR_KEYS = Object.freeze(['time_management', 'communication', 'coordination', 'rigor', 'shared_leadership']);

function formatGameTime(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

// The lowest measured component under 70/100, the one the debrief tip is about.
function weakestComponent(indicator) {
  const measured = Object.entries(indicator?.components || {}).filter(([, value]) => Number.isFinite(value));
  if (!measured.length) return '';
  const [key, value] = measured.reduce((low, entry) => (entry[1] < low[1] ? entry : low));
  return value < 70 ? key : '';
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

// "Jeanne Dupont" -> "Jeanne D.", short enough for a backlog row.
function shortParticipantName(value) {
  const [first, ...rest] = formatParticipantName(value).split(/\s+/).filter(Boolean);
  if (!first) return 'Participant';
  const last = rest[rest.length - 1];
  return last && !/^\d+$/.test(last) ? `${first} ${last.charAt(0)}.` : [first, ...rest].join(' ');
}

const BACKLOG_FILTERS = Object.freeze(['all', 'free', 'mine', 'taken']);
export default function MissionCritiqueChallenge({
  engineKey,
  runtimePayload,
  socket,
  context,
  onChallengeCompleted,
}) {
  const { locale, t } = useI18n();
  const [activePhase, setActivePhase] = useState('cadrage');
  const [modalTaskId, setModalTaskId] = useState('');
  const [backlogFilter, setBacklogFilter] = useState('all');
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
  const collectiveResult = mission.collective_result || mission.result || null;
  const boardSummary = useMemo(() => {
    const knownTaskIds = new Set(tasks.map((task) => String(task.id)));
    const placedTaskIds = new Set(facilitatorBoard.flatMap((item) => (
      Array.isArray(item.timeline) ? item.timeline.map(String).filter((id) => knownTaskIds.has(id)) : []
    )));
    return {
      placed: placedTaskIds.size,
      submitted: facilitatorBoard.filter((item) => item.submitted).length,
      errors: facilitatorBoard.reduce((total, item) => total + Number(item.errors_count || 0), 0),
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

  // Live view of the team plan sent to participants: who placed each task,
  // team duplicates, critical tasks nobody placed, own dependency issues.
  const team = mission.team && typeof mission.team === 'object' ? mission.team : null;
  const teamPlacements = useMemo(
    () => (team?.placements && typeof team.placements === 'object' ? team.placements : {}),
    [team]
  );
  const dependencyIssues = team?.dependency_issues && typeof team.dependency_issues === 'object'
    ? team.dependency_issues
    : {};
  function teammatePlacements(taskId) {
    const placements = teamPlacements[String(taskId)];
    return Array.isArray(placements) ? placements.filter((placement) => !placement.self) : [];
  }
  function teammateNames(taskId) {
    return teammatePlacements(taskId).map((placement) => shortParticipantName(placement.name)).join(', ');
  }
  function taskLabels(taskIds) {
    return (Array.isArray(taskIds) ? taskIds : [])
      .map((taskId) => taskMap.get(String(taskId))?.label || String(taskId))
      .join(' · ');
  }
  const backlogFilterMatches = useMemo(() => {
    const matches = { all: tasks, free: [], mine: [], taken: [] };
    tasks.forEach((task) => {
      const id = String(task.id);
      const placements = Array.isArray(teamPlacements[id]) ? teamPlacements[id] : [];
      if (timelineSet.has(id)) matches.mine.push(task);
      if (placements.some((placement) => !placement.self)) matches.taken.push(task);
      if (!timelineSet.has(id) && !placements.length) matches.free.push(task);
    });
    return matches;
  }, [tasks, teamPlacements, timelineSet]);
  // Keep the exact server order in backlog. No client-side sort.
  const backlogTasks = backlogFilterMatches[backlogFilter] || tasks;
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
  const displayedResult = collectiveResult || submitResult;
  const collectiveTimelineItems = useMemo(() => {
    const resultTimeline = Array.isArray(displayedResult?.timeline) ? displayedResult.timeline : [];
    const timelinePhases = Array.isArray(displayedResult?.timeline_phases)
      ? displayedResult.timeline_phases
      : [];

    return resultTimeline.map((taskId, index) => {
      const phaseKey = PHASES.some((phase) => phase.key === timelinePhases[index])
        ? timelinePhases[index]
        : inferPhaseKey(index, resultTimeline.length);
      return {
        taskId: String(taskId),
        index,
        phase: PHASES.find((phase) => phase.key === phaseKey) || PHASES[3],
      };
    });
  }, [displayedResult]);
  const submittedCount = Math.max(0, Number(mission.submitted_count || 0));
  const participantCount = Math.max(
    0,
    Number(mission.participant_count || facilitatorBoard.length || 0)
  );
  const allParticipantsSubmitted = participantCount > 0 && submittedCount >= participantCount;
  const missionDebrief = state?.summary?.mission_debrief || null;
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
      t('challengeMission.scoringTransparentAllIndividualTimelinesAre'),
      t('challengeMission.penaltiesUnmetDependency8MissingCritical'),
      t('challengeMission.formula100PenaltiesClampedBetween0'),
      t('challengeMission.theTeamMustConvergeAndSubmit'),
      t('challengeMission.distributeTasksByPhaseScopingPreparation'),
      t('challengeMission.assignADependencyOwnerToValidate'),
    ];
  }, [rulesContent?.facilitator, locale]);

  const participantRules = useMemo(() => {
    const baseRules = Array.isArray(rulesContent?.participant) ? rulesContent.participant : [];
    return [
      ...baseRules,
      t('challengeMission.coordinateToSubmitOneUniqueAnd'),
      t('challengeMission.prioritizeDependenciesAndCriticalTasksFirst'),
    ];
  }, [rulesContent?.participant, locale]);

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

  function renderTeamDebrief() {
    if (!missionDebrief?.indicators) return null;
    const { indicators, facts = {}, moments = [] } = missionDebrief;
    const keys = INDICATOR_KEYS.filter((key) => indicators[key]);
    const questions = keys
      .filter((key) => Number.isFinite(indicators[key].score))
      .sort((a, b) => indicators[a].score - indicators[b].score)
      .slice(0, 2);
    const factLines = [
      facts.duration_seconds > 0
        ? t('challengeMission.debrief.facts.timeUsed', { used: formatGameTime(facts.time_used_seconds), total: formatGameTime(facts.duration_seconds) })
        : t('challengeMission.debrief.facts.timeUsedNoTimer', { used: formatGameTime(facts.time_used_seconds) }),
      Number.isFinite(facts.first_action_seconds)
        ? t('challengeMission.debrief.facts.firstAction', { time: formatGameTime(facts.first_action_seconds) })
        : null,
      Number.isFinite(facts.late_actions_percent)
        ? t('challengeMission.debrief.facts.lateActions', { percent: facts.late_actions_percent })
        : null,
      t('challengeMission.debrief.facts.messages', { count: facts.message_count || 0, authors: facts.chat_authors || 0, total: facts.participant_count || 0 }),
      Number.isFinite(facts.top_speaker_percent) && facts.participant_count > 1
        ? t('challengeMission.debrief.facts.topSpeaker', { percent: facts.top_speaker_percent })
        : null,
      t('challengeMission.debrief.facts.tasksPlaced', { placed: facts.tasks_placed || 0, total: facts.tasks_total || 0, duplicates: facts.duplicates || 0 }),
      facts.handoffs_total > 0
        ? t('challengeMission.debrief.facts.handoffs', { respected: facts.handoffs_respected, total: facts.handoffs_total })
        : null,
      facts.dependencies_total > 0
        ? t('challengeMission.debrief.facts.dependencies', { respected: facts.dependencies_respected, total: facts.dependencies_total })
        : null,
      t('challengeMission.debrief.facts.critical', { placed: facts.critical_placed || 0, total: facts.critical_total || 0 }),
      t('challengeMission.debrief.facts.revisions', { count: facts.revisions || 0 }),
    ].filter(Boolean);

    return (
      <section className={styles.teamDebrief} aria-labelledby="mission-team-indicators">
        <div className={styles.resultTimelineHeader}>
          <div>
            <h3 id="mission-team-indicators">{t('challengeMission.debrief.indicatorsTitle')}</h3>
            <p>{t('challengeMission.debrief.indicatorsNote')}</p>
          </div>
        </div>
        <div className={styles.indicatorGrid}>
          {keys.map((key) => {
            const indicator = indicators[key];
            const measured = Number.isFinite(indicator.score);
            const weakest = weakestComponent(indicator);
            return (
              <article key={key} className={styles.indicatorCard}>
                <span className={styles.indicatorTitle}>{t(`challengeMission.debrief.indicators.${key}.title`)}</span>
                <strong className={styles.indicatorScore}>
                  {measured ? t('challengeMission.debrief.scoreOutOf', { score: indicator.score }) : t('challengeMission.debrief.notMeasured')}
                </strong>
                {measured ? <span className={styles.indicatorBar} aria-hidden="true"><span style={{ width: `${indicator.score}%` }} /></span> : null}
                <p>{t(`challengeMission.debrief.indicators.${key}.what`)}</p>
                {weakest ? <p className={styles.indicatorTip}>{t('challengeMission.debrief.tip', { tip: t(`challengeMission.debrief.indicators.${key}.tips.${weakest}`) })}</p> : null}
                <details className={styles.indicatorDetails}>
                  <summary>{t('challengeMission.debrief.howComputed')}</summary>
                  <ul>
                    {Object.entries(indicator.components || {}).map(([part, value]) => (
                      <li key={part}>
                        <span>{t(`challengeMission.debrief.indicators.${key}.components.${part}`)}</span>
                        <strong>{Number.isFinite(value) ? t('challengeMission.debrief.scoreOutOf', { score: value }) : t('challengeMission.debrief.notMeasured')}</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            );
          })}
        </div>
        {indicators.communication ? <p className={styles.debriefNote}>{t('challengeMission.debrief.chatNote')}</p> : null}

        <div className={styles.debriefColumns}>
          <article className={styles.debriefPanel}>
            <h3>{t('challengeMission.debrief.factsTitle')}</h3>
            <ul className={styles.factList}>
              {factLines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </article>
          {moments.length > 0 ? (
            <article className={styles.debriefPanel}>
              <h3>{t('challengeMission.debrief.momentsTitle')}</h3>
              <ol className={styles.momentList}>
                {moments.map((moment) => {
                  const labelKey = moment.key === 'end' ? `end_${moment.reason || 'not_all_submitted'}` : moment.key;
                  return (
                    <li key={labelKey}>
                      <time>{formatGameTime(moment.t)}</time>
                      <span>{t(`challengeMission.debrief.moments.${labelKey}`)}</span>
                    </li>
                  );
                })}
              </ol>
            </article>
          ) : null}
        </div>

        {questions.length > 0 ? (
          <article className={styles.debriefPanel}>
            <h3>{t('challengeMission.debrief.questionsTitle')}</h3>
            <p className={styles.debriefNote}>{t('challengeMission.debrief.questionsNote')}</p>
            <ul className={styles.questionList}>
              {questions.map((key) => (
                <li key={key}>
                  <strong>{t(`challengeMission.debrief.indicators.${key}.title`)}</strong>
                  <span>{t(`challengeMission.debrief.indicators.${key}.question`)}</span>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </section>
    );
  }

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
        timer={hasChallengeStarted ? { remainingSeconds: timerRemainingSeconds } : null}
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
          isStarted={hasChallengeStarted}
          title={t('challengeMission.timer')}
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
          ) : isDebrief ? (
            <section className={`${styles.card} ${styles.resultCard}`} data-debrief-content>
              <div className={styles.resultHeader}>
                <div>
                  <ChallengeDebriefHeading />
                  <p className={styles.resultDescription}>
                    {displayedResult
                      ? t('challengeMission.theFinalScoreIsBasedOn')
                      : t('challengeMission.timeRanOutBeforeEveryParticipant')}
                  </p>
                </div>
                <span className={`${styles.resultCompleteBadge}${allParticipantsSubmitted ? '' : ` ${styles.resultPendingBadge}`}`}>
                  {allParticipantsSubmitted
                    ? <CircleCheck size={17} aria-hidden="true" />
                    : <AlertTriangle size={17} aria-hidden="true" />}
                  {allParticipantsSubmitted
                    ? t('challengeMission.allSubmissionsReceived')
                    : t('challengeMission.submissionsIncomplete')}
                </span>
              </div>

              {displayedResult ? (
                <>
                  <div className={styles.resultScorePanel}>
                    <div className={styles.resultScoreLine}>
                      <span>{t('challengeMission.collectiveScore')}</span>
                      <strong>{Number(displayedResult.score || 0)}<small>/100</small></strong>
                    </div>
                    <progress
                      className={styles.resultScoreProgress}
                      value={Number(displayedResult.score || 0)}
                      max="100"
                      aria-label={t('challengeMission.collectiveScore')}
                    />
                    <p>
                      {participantCount > 0
                        ? t(participantCount > 1 ? 'challengeMission.submittedOfParticipantsPlural' : 'challengeMission.submittedOfParticipantsSingular', { submittedCount, participantCount })
                        : t('challengeMission.collectiveResult')}
                    </p>
                  </div>

                  <div className={styles.resultInsights}>
                    <article className={styles.resultInsight}>
                      <h3>{t('challengeMission.strengths')}</h3>
                      <p>
                        {(displayedResult.strengths || []).join(' · ') ||
                          t('challengeMission.noStrengthsIdentified')}
                      </p>
                    </article>
                    <article className={`${styles.resultInsight} ${styles.resultInsightReview}`}>
                      <h3>{t('challengeMission.areasToImprove')}</h3>
                      <p>
                        {(displayedResult.weaknesses || []).join(' · ') ||
                          t('challengeMission.noAreasToImprove')}
                      </p>
                    </article>
                  </div>

                  {renderTeamDebrief()}

                  {(displayedResult.errors || []).length > 0 ? (
                    <ul className={styles.errorList}>
                      {displayedResult.errors.map((errMsg, idx) => (
                        <li key={`${idx}-${errMsg}`}>{errMsg}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className={styles.resultTimeline}>
                    <div className={styles.resultTimelineHeader}>
                      <div>
                        <h3>{t('challengeMission.mergedTeamTimeline')}</h3>
                        <p>
                          {t('challengeMission.allParticipantTimelinesCombinedInParticipant')}
                        </p>
                      </div>
                      <span>{collectiveTimelineItems.length} {t('challengeMission.actions')}</span>
                    </div>
                    {collectiveTimelineItems.length > 0 ? (
                      <ol className={styles.resultTimelineList}>
                        {collectiveTimelineItems.map((item) => {
                          const task = taskMap.get(item.taskId);
                          return (
                            <li key={`${item.taskId}-${item.index}`} className={styles.resultTimelineItem}>
                              <span className={styles.resultTimelineOrder}>{item.index + 1}</span>
                              <div>
                                <span className={`${styles.phaseTag} ${styles[item.phase.className]}`}>
                                  {phaseLabel(item.phase, locale)}
                                </span>
                                <p>{task?.label || item.taskId}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className={styles.empty}>
                        {t('challengeMission.noTaskWasSubmitted')}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.resultIncomplete}>
                    <p>
                      {t(submittedCount > 1 ? 'challengeMission.submittedOfParticipantsPluralEnd' : 'challengeMission.submittedOfParticipantsSingularEnd', { submittedCount, participantCount })}
                    </p>
                  </div>
                  {renderTeamDebrief()}
                </>
              )}
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
                      <h2>{t('challengeMission.timeline')}</h2>
                      <p>
                        {t('challengeMission.assignTasksFromTheBacklogThen')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.submissionProgress} role="status" aria-live="polite">
                  {mission.submitted
                    ? <CircleCheck size={17} aria-hidden="true" />
                    : <Users size={17} aria-hidden="true" />}
                  <span>
                    {mission.submitted
                      ? t('challengeMission.yourSolutionIsSubmitted')
                      : t('challengeMission.submitYourSolutionWhenReady')}
                    {participantCount > 0
                      ? ` ${submittedCount}/${participantCount} ${t('challengeMission.participantsSubmitted')}.`
                      : ''}
                    {mission.submitted
                      ? t('challengeMission.theChallengeEndsWhenEveryoneHas')
                      : ''}
                  </span>
                </div>
                {team ? (
                  <div className={styles.teamSummary}>
                    <span className={styles.teamSummaryTitle}>{t('challengeMission.teamPlan')}</span>
                    <span className={styles.teamSummaryStat}>
                      <ListTodo size={15} aria-hidden="true" />
                      {t('challengeMission.teamTasksPlaced', { placed: Number(team.placed_count || 0), total: tasks.length })}
                    </span>
                    <span className={`${styles.teamSummaryStat}${team.duplicate_count > 0 ? ` ${styles.teamSummaryWarn}` : ''}`}>
                      <AlertTriangle size={15} aria-hidden="true" />
                      {t(team.duplicate_count === 1 ? 'challengeMission.teamDuplicatesSingular' : 'challengeMission.teamDuplicatesPlural', { count: Number(team.duplicate_count || 0) })}
                    </span>
                    <span className={`${styles.teamSummaryStat}${team.missing_critical_count > 0 ? ` ${styles.teamSummaryCritical}` : ''}`}>
                      <Flag size={15} aria-hidden="true" />
                      {t(team.missing_critical_count === 1 ? 'challengeMission.teamMissingCriticalSingular' : 'challengeMission.teamMissingCriticalPlural', { count: Number(team.missing_critical_count || 0) })}
                    </span>
                  </div>
                ) : null}
                <div
                  className={styles.stepper}
                  role="tablist"
                  aria-label={t('challengeMission.timelinePhases')}
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
                        <span className={styles.stepLabel} data-mobile-label={mobilePhaseLabel(phase, locale)}>{phaseLabel(phase, locale)}</span>
                        <span className={styles.stepCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div id="mission-phase-panel" className={styles.phasePanel} role="tabpanel" aria-labelledby={`mission-tab-${activePhase}`}>
                  {activePhaseItems.length === 0 ? (
                    <p className={styles.empty}>
                      {t('challengeMission.noTaskInThisPhaseYet')}
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
                      const missingDependencies = dependencyIssues[item.taskId] || [];
                      const duplicateOwners = teammateNames(item.taskId);
                      const hasIssue = missingDependencies.length > 0 || Boolean(duplicateOwners);
                      return (
                        <article key={itemKey} className={`${styles.timelineCodeItem} ${styles.timelineItemStack}${hasIssue ? ` ${styles.timelineItemIssue}` : ''}`}>
                          <div className={styles.timelineItemRow}>
                            <span className={styles.timelineItemLabel}>
                              {task?.label || item.taskId}
                              {task?.critical ? <span className={styles.criticalBadge}><Flag size={11} aria-hidden="true" />{t('challengeMission.critical')}</span> : null}
                            </span>
                            <span className={styles.timelineItemInlineControls}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveTaskWithinPhase(item.timelineIndex, upTarget)}
                                disabled={!canEditTimeline || !canMoveUp}
                                title={t('challengeMission.moveUp')}
                                aria-label={t('challengeMission.moveUpInPhase')}
                              >
                                <ArrowUp size={16} strokeWidth={2.4} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveTaskWithinPhase(item.timelineIndex, downTarget)}
                                disabled={!canEditTimeline || !canMoveDown}
                                title={t('challengeMission.moveDown')}
                                aria-label={t('challengeMission.moveDownInPhase')}
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
                                title={t('challengeMission.remove')}
                                aria-label={t('challengeMission.removeFromTimeline')}
                              >
                                <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
                              </button>
                            </span>
                          </div>
                          {missingDependencies.length > 0 ? (
                            <p className={styles.timelineItemWarning}>
                              <Link2 size={13} aria-hidden="true" />
                              {t('challengeMission.dependencyIssue', { tasks: taskLabels(missingDependencies) })}
                            </p>
                          ) : null}
                          {duplicateOwners ? (
                            <p className={styles.timelineItemWarning}>
                              <AlertTriangle size={13} aria-hidden="true" />
                              {t('challengeMission.alsoPlacedBy', { names: duplicateOwners })}
                            </p>
                          ) : null}
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
                    {t('challengeMission.submitMySolution')}
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
                    <h2>{t('challengeMission.missionBacklog')}</h2>
                  </div>
                  <p>
                    {t('challengeMission.clickATaskToAssignIt')}
                  </p>
                </div>
                {team && tasks.length > 0 ? (
                  <div className={styles.backlogFilters} role="group" aria-label={t('challengeMission.backlogFilter')}>
                    {BACKLOG_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={`${styles.filterChip}${backlogFilter === filter ? ` ${styles.filterChipActive}` : ''}`}
                        aria-pressed={backlogFilter === filter}
                        onClick={() => setBacklogFilter(filter)}
                      >
                        {t(`challengeMission.filter_${filter}`)}
                        <span className={styles.filterChipCount}>{backlogFilterMatches[filter].length}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {backlogTasks.length === 0 ? (
                  <p className={styles.empty}>
                    {tasks.length > 0 ? t('challengeMission.noTaskMatchesFilter') : t('challengeMission.noTasksAvailable')}
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
                      const teammates = teammatePlacements(id);
                      const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
                      const rowState = assigned
                        ? (teammates.length ? styles.taskRowDuplicate : styles.taskRowAssigned)
                        : (teammates.length ? styles.taskRowTaken : '');
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className={`${styles.taskRow}${rowState ? ` ${rowState}` : ''}`}
                          onClick={() => openTaskModal(id)}
                          disabled={!canEditTimeline}
                          title={String(task.label || '').trim()}
                        >
                          <span className={styles.taskRowMain}>
                            <span className={styles.taskRowLabel}>
                              {task.label}
                              {task.critical ? <span className={styles.criticalBadge}><Flag size={11} aria-hidden="true" />{t('challengeMission.critical')}</span> : null}
                            </span>
                            {dependencies.length > 0 ? (
                              <span className={styles.taskRowMeta}>
                                <Link2 size={12} aria-hidden="true" />
                                {t('challengeMission.dependsOn', { tasks: taskLabels(dependencies) })}
                              </span>
                            ) : null}
                            {teammates.length > 0 ? (
                              <span className={styles.taskRowTeam}>
                                <Users size={12} aria-hidden="true" />
                                {t('challengeMission.placedByLabel')}
                                {teammates.map((placement, index) => {
                                  const phase = PHASES.find((entry) => entry.key === placement.phase);
                                  return (
                                    <span key={`${placement.name}-${index}`} className={`${styles.teammateChip}${phase ? ` ${styles[phase.className]}` : ''}`}>
                                      {shortParticipantName(placement.name)}
                                      {phase ? ` · ${phaseLabel(phase, locale)}` : ''}
                                    </span>
                                  );
                                })}
                              </span>
                            ) : null}
                          </span>
                          {assignedPhase ? (
                            <span
                              className={`${styles.phaseTag} ${styles[assignedPhase.className]}`}
                            >
                              {phaseLabel(assignedPhase, locale)}
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
                        aria-label={t('challengeMission.close')}
                        title={t('challengeMission.close')}
                      >
                        <X size={16} strokeWidth={2.1} aria-hidden="true" />
                      </button>
                    </div>
                    <p className={styles.modalHint}>
                      {t('challengeMission.assignThisTaskToAPhase')}
                    </p>
                    {modalTask.critical || (modalTask.dependencies || []).length > 0 || teammateNames(modalTask.id) ? (
                      <ul className={styles.modalTaskFacts}>
                        {modalTask.critical ? (
                          <li><Flag size={14} aria-hidden="true" />{t('challengeMission.criticalTaskHint')}</li>
                        ) : null}
                        {(modalTask.dependencies || []).length > 0 ? (
                          <li><Link2 size={14} aria-hidden="true" />{t('challengeMission.dependsOn', { tasks: taskLabels(modalTask.dependencies) })}</li>
                        ) : null}
                        {teammateNames(modalTask.id) ? (
                          <li className={styles.modalTaskFactWarn}><Users size={14} aria-hidden="true" />{t('challengeMission.placedBy', { names: teammateNames(modalTask.id) })}</li>
                        ) : null}
                      </ul>
                    ) : null}
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
                          <span>{phaseLabel(phase, locale)}</span>
                          {modalAssignedPhase === phase.key ? <span className={styles.selectedPhaseMark}><Check size={16} aria-hidden="true" />{t('challengeMission.selected')}</span> : null}
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
                          {t('challengeMission.removeFromTimeline')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

            </>
          ) : (
            <section className={styles.card} data-debrief-content={isDebrief || undefined}>
              <div className={styles.dashboardHeader}>
                <div>
                  {isDebrief ? <ChallengeDebriefHeading /> : <h2>{t('challengeMission.facilitatorDashboard')}</h2>}
                  <p className={styles.meta}>{isDebrief ? t('challengeMission.reviewTaskPlacementSubmissionsAndCollective') : t('challengeMission.liveTaskPlacementAndSubmissionTracking')}</p>
                </div>
                {!isDebrief ? <span className={styles.liveBadge}><span aria-hidden="true" />{t('challengeMission.live')}</span> : null}
              </div>
              <div className={styles.dashboardMetrics} data-debrief-metrics={isDebrief || undefined}>
                <article><Users size={20} aria-hidden="true" /><strong>{facilitatorBoard.length}</strong><span>{t('challengeMission.participants')}</span></article>
                <article><ListTodo size={20} aria-hidden="true" /><strong>{boardSummary.placed}/{tasks.length}</strong><span>{t('challengeMission.uniqueTasksPlaced')}</span></article>
                <article><CircleCheck size={20} aria-hidden="true" /><strong>{boardSummary.submitted}/{facilitatorBoard.length}</strong><span>{t('challengeMission.submissions')}</span></article>
                <article><AlertTriangle size={20} aria-hidden="true" /><strong>{boardSummary.errors}</strong><span>{t('challengeMission.teamPlanErrors')}</span></article>
              </div>
              {collectiveResult ? (
                <p className={styles.score}>
                  {t('challengeMission.collectiveScore')}:{' '}
                  {Number(collectiveResult.score || 0)}/100
                </p>
              ) : null}
              {facilitatorBoard.length === 0 ? (
                <p className={styles.empty}>
                  {t('challengeMission.noActiveParticipantsYet')}
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
                          {item.submitted ? t('challengeMission.submitted') : t('challengeMission.inProgress')}
                        </span>
                      </div>
                      <div className={styles.participantMetrics}>
                        <div><span>{t('challengeMission.tasksPlaced')}</span><strong>{placed}/{tasks.length}</strong></div>
                        <div><span>{t('challengeMission.errors')}</span><strong className={item.errors_count > 0 ? styles.metricError : ''}>{item.errors_count ?? 0}</strong><small>{t('challengeMission.teamPlanErrorsHint')}</small></div>
                      </div>
                      <div className={styles.participantProgress}>
                        <span>{t('challengeMission.taskPlacement')} <strong>{progress}%</strong></span>
                        <progress value={placed} max={Math.max(1, tasks.length)} aria-label={`${participantLabel} — ${t('challengeMission.taskPlacement2')}`} />
                      </div>
                      <details className={styles.participantTimelineBlock} open>
                        <summary className={styles.miniTitle}>
                          {t('challengeMission.realTimeTimeline')}
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
                                      <h3>{phaseLabel(phase, locale)}</h3>
                                      <span>{facPhaseItems.length}</span>
                                    </div>
                                  </section>
                                  <section className={styles.timelineLane}>
                                    {facPhaseItems.length === 0 ? (
                                      <div className={styles.timelineLaneHint}>
                                        {t('challengeMission.noAction')}
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
                            {t('challengeMission.noActionPlacedYet')}
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
              isStarted={hasChallengeStarted}
              title={t('challengeMission.timer')}
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
            title={t('challengeMission.chat')}
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
