'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useFacilitatorTimerControls from '@/lib/challenges/useFacilitatorTimerControls';
import { refreshChallengeStateBeforeStart } from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getDictionary, translate } from '@/lib/i18n';
import ChallengeHeader from '../ChallengeHeader';
import ChallengePresentation from '../ChallengePresentation';
import ChallengeDebriefHeading from '../ChallengeDebriefHeading';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import styles from './LabDInnovation.module.css';
import useI18n from '@/lib/i18n/useI18n';

const PHASE_ORDER = ['problem', 'solution', 'argument', 'final_vote'];

function clampText(value, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function buildRank(rows = [], key = 'score') {
  const sorted = [...rows].sort((a, b) => (Number(b[key] || 0) - Number(a[key] || 0)) || (Number(a.ts_index || 0) - Number(b.ts_index || 0)) || String(a.id || '').localeCompare(String(b.id || '')));
  let currentRank = 1;
  return sorted.map((entry, index) => {
    if (index > 0 && Number(entry[key] || 0) < Number(sorted[index - 1][key] || 0)) {
      currentRank = index + 1;
    }
    return {
      ...entry,
      rank: currentRank
    };
  });
}

function sortByVotesAndAge(rows = []) {
  return [...rows].sort((a, b) => {
    const votesA = Number(a.vote_count || 0);
    const votesB = Number(b.vote_count || 0);
    if (votesA !== votesB) return votesB - votesA;
    return Number(a.ts_index || 0) - Number(b.ts_index || 0);
  });
}

function mergeById(rows = []) {
  return rows.reduce((acc, row) => {
    const id = String(row?.id || '').trim();
    if (!id) return acc;
    acc[id] = row;
    return acc;
  }, {});
}

function getPhaseLabel(locale, phaseKey) {
  const labels = {
    problem: translate(locale, 'challengeLab.problems'),
    solution: translate(locale, 'challengeLab.solutions'),
    argument: translate(locale, 'challengeLab.argumentation'),
    final_vote: translate(locale, 'challengeLab.finalVote')
  };
  return labels[phaseKey] || phaseKey;
}

function getPhaseTitle(locale, phaseKey) {
  const titles = {
    problem: translate(locale, 'challengeLab.clarifyTheKeyIssues'),
    solution: translate(locale, 'challengeLab.shapePracticalSolutions'),
    argument: translate(locale, 'challengeLab.strengthenPromisingSolutions'),
    final_vote: translate(locale, 'challengeLab.chooseTheSolutionWithTheGreatest')
  };
  return titles[phaseKey] || translate(locale, 'challengeLab.collaborativeInnovationLab');
}

function getPhaseIndex(phaseKey) {
  const index = PHASE_ORDER.indexOf(phaseKey);
  return index >= 0 ? index : 0;
}

function buildParticipantMap(participantsMeta = [], participantOrder = []) {
  const map = new Map();
  participantsMeta.forEach((item) => {
    const id = String(item?.participant_id || '').trim();
    if (!id) return;
    const firstName = String(item?.first_name || item?.firstName || '').trim();
    const lastName = String(item?.last_name || item?.lastName || '').trim();
    const displayName = String(item?.display_name || item?.displayName || '').trim();
    map.set(id, `${firstName} ${lastName}`.trim() || displayName || `Participant ${String(item?.slot || map.size + 1)}`);
  });

  participantOrder.forEach((id, index) => {
    if (!map.has(String(id))) {
      map.set(String(id), `Participant ${index + 1}`);
    }
  });

  return map;
}

function buildProgress(currentPhase) {
  return PHASE_ORDER.map((phaseKey, index) => ({
    key: phaseKey,
    label: phaseKey,
    index,
    active: phaseKey === currentPhase,
    done: PHASE_ORDER.indexOf(phaseKey) < PHASE_ORDER.indexOf(currentPhase)
  }));
}

function getPhaseGuidance(locale, phaseKey) {
  const guidance = {
    problem: translate(locale, 'challengeLab.collectTheStrongestSharedProblemsBefore'),
    solution: translate(locale, 'challengeLab.turnTheRetainedProblemsIntoConcrete'),
    argument: translate(locale, 'challengeLab.strengthenFinalistSolutionsWithClearActionable'),
    final_vote: translate(locale, 'challengeLab.voteAnonymouslyForTheSolutionThat')
  };
  return guidance[phaseKey] || '';
}

function getBadgeText(type, isEn = false) {
  const labels = {
    explorer: isEn ? 'Explorer' : 'Explorateur',
    innovator: isEn ? 'Innovator' : 'Innovateur',
    co_builder: isEn ? 'Co-builder' : 'Co-Constructeur',
    visionary: isEn ? 'Visionary' : 'Visionnaire',
    catalyst: isEn ? 'Catalyst' : 'Catalyseur'
  };
  return labels[type] || type;
}

function buildFallbackState(runtimePayload) {
  const config = runtimePayload?.config || {};
  return {
    phase: 'problem',
    current_phase_index: 0,
    phase_started_at_ms: Date.now(),
    phase_deadline_ms: Date.now() + 600000,
    phases: [
      { key: 'problem', duration_seconds: 600 },
      { key: 'solution', duration_seconds: 600 },
      { key: 'argument', duration_seconds: 600 },
      { key: 'final_vote', duration_seconds: 300 }
    ],
    config,
    participants_order: [],
    participants_meta: [],
    problems: [],
    solutions: [],
    contributions: [],
    final_votes: {},
    score_by_participant: {},
    rankings: [],
    top_problems: [],
    top_solutions: [],
    finalist_solutions: [],
    summary: null,
    stats: {
      problems_total: 0,
      solutions_total: 0,
      contributions_total: 0,
      votes_total: 0,
      participation_rate: 0,
      winner_solution_id: null,
      top_contributors: []
    }
  };
}

export default function LabDInnovationChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale, t } = useI18n();
  const isEn = locale === 'en';
  const { state, error, isFacilitator, emitEvent, participantId, connected } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const timerControls = useFacilitatorTimerControls({ socket, emitEvent, state, isFacilitator });
  const timer = state?.timer || {};
  const challenge = state?.labInnovation || state?.lab_innovation || state?.innovation || buildFallbackState(runtimePayload);
  const [problemText, setProblemText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [selectedSolutionId, setSelectedSolutionId] = useState('');
  const [contribution, setContribution] = useState({ advantage: '', improvement: '', impact: '' });
  const [finalVoteId, setFinalVoteId] = useState('');
  const [reactionMap, setReactionMap] = useState({});
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [pendingVote, setPendingVote] = useState(null);
  const [submissionFeedback, setSubmissionFeedback] = useState('');
  const [voteFeedback, setVoteFeedback] = useState('');
  const lastPhaseRef = useRef('');

  const rawParticipantsOrder = Array.isArray(challenge?.participants_order) ? challenge.participants_order : [];
  const rawParticipantsMeta = Array.isArray(challenge?.participants_meta) ? challenge.participants_meta : [];
  const participantMap = useMemo(() => buildParticipantMap(rawParticipantsMeta, rawParticipantsOrder), [rawParticipantsMeta, rawParticipantsOrder]);
  const me = String(participantId || context?.userId || '').trim();
  const myName = String(participantMap.get(me) || runtimePayload?.context?.displayName || context?.displayName || 'Participant').trim();
  const currentPhase = String(challenge?.phase || 'problem').trim();
  const currentPhaseIndex = getPhaseIndex(currentPhase);
  const phaseProgress = useMemo(() => buildProgress(currentPhase), [currentPhase]);
  const problemList = Array.isArray(challenge?.problems) ? challenge.problems : [];
  const solutionList = Array.isArray(challenge?.solutions) ? challenge.solutions : [];
  const contributionList = Array.isArray(challenge?.contributions) ? challenge.contributions : [];
  const finalistSolutions = Array.isArray(challenge?.finalist_solutions) ? challenge.finalist_solutions : [];
  const topProblems = Array.isArray(challenge?.top_problems) ? challenge.top_problems : [];
  const topSolutions = Array.isArray(challenge?.top_solutions) ? challenge.top_solutions : [];
  const scoreByParticipant = challenge?.score_by_participant || {};
  const rankings = Array.isArray(challenge?.rankings) ? challenge.rankings : [];
  const stats = challenge?.stats || buildFallbackState(runtimePayload).stats;

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat, chatDelivery } = useChallengeChat({
    socket,
    emitEvent,
    author: myName,
    enabled: true,
    maxMessages: 80,
    maxLength: 240
  });

  const normalizedTimerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const isDebrief = Boolean(state?.summary) || ['completed', 'timeout'].includes(normalizedTimerStatus);
  const hasChallengeStarted = ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(normalizedTimerStatus);
  const timerStatus = hasChallengeStarted ? normalizedTimerStatus : 'idle';
  const timerRemainingSeconds = useMemo(() => {
    if (hasChallengeStarted && Number.isFinite(Number(timer?.remaining_seconds))) {
      return Math.max(0, Number(timer.remaining_seconds || 0));
    }
    const deadline = Number(challenge?.phase_deadline_ms || 0);
    if (!deadline) {
      const durations = challenge?.phases || [];
      const current = durations[currentPhaseIndex] || durations[0] || { duration_seconds: 0 };
      return Number(current.duration_seconds || 0);
    }
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }, [challenge?.phase_deadline_ms, currentPhaseIndex, hasChallengeStarted, timer?.remaining_seconds]);
  const timerDurationSeconds = useMemo(() => {
    if (Number.isFinite(Number(timer?.duration_seconds)) && Number(timer.duration_seconds) > 0) {
      return Number(timer.duration_seconds);
    }
    const phases = Array.isArray(challenge?.phases) ? challenge.phases : [];
    return phases.reduce((sum, phase) => sum + Number(phase?.duration_seconds || 0), 0) || 2100;
  }, [challenge?.phases, timer?.duration_seconds]);

  const participantRows = useMemo(() => {
    return rankings.length > 0
      ? buildRank(rankings.map((entry) => ({ ...entry, id: String(entry.participant_id || entry.id || '') })), 'score')
      : buildRank(Object.entries(scoreByParticipant).map(([id, score], index) => ({ id, participant_id: id, score, ts_index: index })), 'score');
  }, [rankings, scoreByParticipant]);

  const visibleProblems = useMemo(() => sortByVotesAndAge(topProblems).slice(0, 4), [topProblems]);
  const visibleSolutions = useMemo(() => sortByVotesAndAge(solutionList).slice(0, 3), [solutionList]);
  const textLimit = Math.max(50, Math.min(500, Number(challenge.config?.limits?.text_max_length) || 200));
  const problemVoteLimit = Math.max(1, Number(challenge.config?.limits?.max_problem_votes_per_participant) || 2);
  const solutionVoteLimit = Math.max(1, Number(challenge.config?.limits?.max_solution_votes_per_participant) || 2);
  const votedProblemIds = useMemo(() => {
    const ids = Array.isArray(challenge.problem_votes_by_participant?.[me])
      ? challenge.problem_votes_by_participant[me].map(String)
      : [];
    problemList.forEach((item) => {
      if (Array.isArray(item.votes) && item.votes.map(String).includes(me)) ids.push(String(item.id));
    });
    return new Set(ids);
  }, [challenge.problem_votes_by_participant, me, problemList]);
  const votedSolutionIds = useMemo(() => {
    const ids = Array.isArray(challenge.solution_votes_by_participant?.[me])
      ? challenge.solution_votes_by_participant[me].map(String)
      : [];
    solutionList.forEach((item) => {
      if (Array.isArray(item.votes) && item.votes.map(String).includes(me)) ids.push(String(item.id));
    });
    return new Set(ids);
  }, [challenge.solution_votes_by_participant, me, solutionList]);
  const canParticipate = !isFacilitator && connected && (timer.enabled === false || normalizedTimerStatus === 'running') && !pendingSubmission && !pendingVote;
  const problemValid = Boolean(clampText(problemText));
  const solutionValid = Boolean(clampText(solutionText) && visibleProblems.some((item) => String(item.id) === selectedProblemId));
  const contributionValid = Boolean(finalistSolutions.some((item) => String(item.id) === selectedSolutionId)
    && clampText(contribution.advantage) && clampText(contribution.improvement) && clampText(contribution.impact));
  const finalVoteValid = finalistSolutions.some((item) => String(item.id) === finalVoteId);
  const hasFinalVote = Boolean(challenge.final_votes?.[me]);

  useEffect(() => {
    if (!pendingSubmission) return;
    const { type, payload } = pendingSubmission;
    const rows = type === 'problem' ? problemList : type === 'solution' ? solutionList : contributionList;
    const acknowledged = type === 'final_vote'
      ? String(challenge.final_votes?.[me] || '') === payload.solution_id
      : rows.some((item) => !pendingSubmission.existingIds.includes(item.id) && String(item.participant_id) === me
        && Object.entries(payload).every(([key, value]) => String(item[key] || '') === String(value)));
    if (acknowledged) {
      setPendingSubmission(null);
      setSubmissionFeedback(t('challengeLab.confirmedByTheServer'));
      if (type === 'problem') setProblemText('');
      if (type === 'solution') setSolutionText('');
      if (type === 'contribution') setContribution({ advantage: '', improvement: '', impact: '' });
      return;
    }
    if ((error && error !== pendingSubmission.previousError) || currentPhase !== pendingSubmission.phase) {
      setPendingSubmission(null);
      setSubmissionFeedback(error || t('challengeLab.phaseChangedYourDraftHasBeen'));
      return;
    }
    const timeout = window.setTimeout(() => {
      setPendingSubmission(null);
      setSubmissionFeedback(t('challengeLab.noServerConfirmationReceivedYourDraft'));
    }, Math.max(0, pendingSubmission.sentAt + 15000 - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [pendingSubmission, problemList, solutionList, contributionList, challenge.final_votes, me, error, currentPhase, locale]);

  useEffect(() => {
    if (!pendingVote) return;
    const rows = pendingVote.type === 'problem' ? problemList : solutionList;
    const votesByParticipant = pendingVote.type === 'problem'
      ? challenge.problem_votes_by_participant
      : challenge.solution_votes_by_participant;
    const participantVotes = votesByParticipant?.[me];
    const acknowledged = rows.some((item) => String(item.id) === pendingVote.id
      && Array.isArray(item.votes)
      && item.votes.map(String).includes(me))
      || (Array.isArray(participantVotes) && participantVotes.map(String).includes(pendingVote.id));
    if (acknowledged) {
      setPendingVote(null);
      setVoteFeedback(t('challengeLab.voteConfirmedByTheServer'));
      return;
    }
    if ((error && error !== pendingVote.previousError) || currentPhase !== pendingVote.phase) {
      setPendingVote(null);
      setVoteFeedback(error || t('challengeLab.thePhaseChangedBeforeYourVote'));
      return;
    }
    const timeout = window.setTimeout(() => {
      setPendingVote(null);
      setVoteFeedback(t('challengeLab.noConfirmationReceivedCheckTheVote'));
    }, Math.max(0, pendingVote.sentAt + 15000 - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [pendingVote, problemList, solutionList, challenge.problem_votes_by_participant, challenge.solution_votes_by_participant, me, error, currentPhase, locale]);

  function submit(type, eventType, payload) {
    if (!canParticipate) {
      setSubmissionFeedback(t('challengeLab.submissionUnavailableCheckTheConnectionAnd'));
      return;
    }
    setSubmissionFeedback('');
    setPendingSubmission({ type, payload, phase: currentPhase, sentAt: Date.now(), previousError: error, existingIds: [...problemList, ...solutionList, ...contributionList].map((item) => item.id) });
    emitEvent(eventType, payload);
  }

  useEffect(() => {
    if (lastPhaseRef.current && lastPhaseRef.current !== currentPhase) {
      // Keep the automatic phase transition visible with a clean state change.
      setSelectedProblemId('');
      setSelectedSolutionId('');
      setPendingVote(null);
      setVoteFeedback('');
    }
    lastPhaseRef.current = currentPhase;
  }, [currentPhase]);

  function emit(type, payload) {
    if (!canParticipate) return false;
    return emitEvent(type, payload || {});
  }

  function submitProblem() {
    const text = clampText(problemText, textLimit);
    if (!problemValid) {
      setSubmissionFeedback(t('challengeLab.describeAProblemBeforeSubmitting'));
      return;
    }
    submit('problem', 'lab.problem.submit', { text });
  }

  function submitSolution() {
    const text = clampText(solutionText, textLimit);
    if (!solutionValid) {
      setSubmissionFeedback(t('challengeLab.chooseAProblemAndDescribeYour'));
      return;
    }
    submit('solution', 'lab.solution.submit', { text, problem_id: selectedProblemId });
  }

  function submitContribution() {
    const payload = {
      solution_id: selectedSolutionId,
      advantage: clampText(contribution.advantage, textLimit),
      improvement: clampText(contribution.improvement, textLimit),
      impact: clampText(contribution.impact, textLimit)
    };
    if (!contributionValid) {
      setSubmissionFeedback(t('challengeLab.chooseASolutionAndCompleteAdvantage'));
      return;
    }
    submit('contribution', 'lab.contribution.submit', payload);
  }

  function castProblemVote(problemId) {
    castVote('problem', problemId, 'lab.problem.vote', { problem_id: problemId });
  }

  function castSolutionVote(solutionId) {
    castVote('solution', solutionId, 'lab.solution.vote', { solution_id: solutionId });
  }

  function castVote(type, id, eventType, payload) {
    if (!canParticipate) return;
    setVoteFeedback('');
    const sent = emitEvent(eventType, payload);
    if (sent) {
      setPendingVote({ type, id, phase: currentPhase, sentAt: Date.now(), previousError: error });
      setVoteFeedback(t('challengeLab.voteSentWaitingForConfirmation'));
    }
  }

  function castFinalVote() {
    if (hasFinalVote) return;
    if (!finalVoteValid) {
      setSubmissionFeedback(t('challengeLab.chooseASolutionBeforeVoting'));
      return;
    }
    submit('final_vote', 'lab.final.vote', { solution_id: finalVoteId });
  }

  const rulesPreset = useMemo(() => getDictionary(locale)?.challengeRules?.labInnovation || getDictionary('fr')?.challengeRules?.labInnovation || {}, [locale]);
  const rulesContent = useMemo(() => ({
    objective: String(rulesPreset?.objective || '').trim(),
    facilitator: Array.isArray(rulesPreset?.facilitator) ? rulesPreset.facilitator : [],
    participant: Array.isArray(rulesPreset?.participant) ? rulesPreset.participant : [],
    footnote: String(rulesPreset?.footnote || '').trim()
  }), [rulesPreset]);

  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset?.participants?.min || '3',
    recommended: rulesPreset?.participants?.recommended || '6',
    max: rulesPreset?.participants?.max || '12'
  }), [rulesPreset]);

  const facilitatorRules = useMemo(() => [...rulesContent.facilitator], [rulesContent.facilitator]);
  const participantRules = useMemo(() => [...rulesContent.participant], [rulesContent.participant]);

  const rankedParticipants = useMemo(() => {
    const list = participantRows.map((entry, index) => ({
      ...entry,
      participantName: participantMap.get(String(entry.participant_id || entry.id || '')) || `Participant ${index + 1}`
    }));
    return list.slice(0, 10);
  }, [participantRows, participantMap]);

  const topContributorNames = Array.isArray(stats.top_contributors) ? stats.top_contributors.map((item) => {
    const id = String(item?.participant_id || '').trim();
    return participantMap.get(id) || item?.participant_name || 'Participant';
  }).filter(Boolean) : [];

  function startChallenge() {
    refreshChallengeStateBeforeStart(emitEvent);
    emitEvent('timer.start');
  }

  function renderVoteButton(type, item, votedIds, voteLimit) {
    const isProblem = type === 'problem';
    const ownProposal = String(item.participant_id || '') === me;
    const hasVoted = votedIds.has(String(item.id));
    const limitReached = votedIds.size >= voteLimit;
    const waitingForThisVote = pendingVote?.type === type && pendingVote.id === String(item.id);
    const label = ownProposal
      ? (isEn ? (isProblem ? 'Your proposal' : 'Your solution') : (isProblem ? 'Votre proposition' : 'Votre solution'))
      : hasVoted
        ? t('challengeLab.voted')
        : waitingForThisVote
          ? t('challengeLab.sending')
          : limitReached
            ? t('challengeLab.limitReached')
            : t('challengeLab.vote');
    return (
      <button
        type="button"
        className={`${styles.ghostBtn}${hasVoted ? ` ${styles.voteRecorded}` : ''}`}
        disabled={!canParticipate || ownProposal || hasVoted || limitReached}
        onClick={() => (isProblem ? castProblemVote(String(item.id)) : castSolutionVote(String(item.id)))}
        aria-pressed={hasVoted}
        aria-label={`${label} : ${clampText(item.text, 120)}`}
      >
        {label}
      </button>
    );
  }

  const statisticsCard = hasChallengeStarted ? (
    <section className={styles.card} data-debrief-content={isDebrief || undefined}>
      <h3 className={styles.sectionTitle}>{t('challengeLab.challengeStats')}</h3>
      <div className={styles.statGrid} data-debrief-metrics={isDebrief || undefined}>
        <article className={styles.statTile}><strong>{Number(stats.problems_total || 0)}</strong><span>{t('challengeLab.problems')}</span></article>
        <article className={styles.statTile}><strong>{Number(stats.solutions_total || 0)}</strong><span>{t('challengeLab.solutions')}</span></article>
        <article className={styles.statTile}><strong>{Number(stats.contributions_total || 0)}</strong><span>{t('challengeLab.contributions')}</span></article>
        <article className={styles.statTile}><strong>{Number(stats.votes_total || 0)}</strong><span>{t('challengeLab.votes')}</span></article>
      </div>
      <p className={styles.metaLine}>{t('challengeLab.participationRate')}: {Number(stats.participation_rate || 0)}%</p>
      <p className={styles.metaLine}>{t('challengeLab.winningSolution')}: <strong>{clampText(stats.winner_solution_text || '-', 120)}</strong></p>
      {topContributorNames.length > 0 ? <p className={styles.metaLine}>{t('challengeLab.topContributors')}: {topContributorNames.slice(0, 3).join(' · ')}</p> : null}
    </section>
  ) : null;

  return (
    <ChallengePresentation className={styles.shell} isDebrief={isDebrief}>
      <ChallengeHeader
        title={rulesPreset?.challengeName || 'Lab d\'Innovation'}
        subtitle={rulesPreset?.subtitle || 'Innovation collaborative'}
        timer={hasChallengeStarted ? { remainingSeconds: timerRemainingSeconds } : null}
        headerAction={hasChallengeStarted ? (
          <ChallengeRulesPanel
            inHeader
            isStarted={hasChallengeStarted}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName={rulesPreset?.challengeName || 'Lab d\'Innovation'}
            objective={rulesContent.objective}
            participantsMeta={rulesParticipantsMeta}
            facilitatorRules={facilitatorRules}
            participantRules={participantRules}
            footnote={rulesContent.footnote}
          />
        ) : null}
      />

      <div className="challenge-mobile-timer">
        <ChallengeTimerCard
          isStarted={hasChallengeStarted}
          title={t('challengeLab.timer')}
          remainingSeconds={timerRemainingSeconds}
          durationSeconds={timerDurationSeconds}
          status={timerStatus}
          isFacilitator={isFacilitator}
          onPause={timerControls.pause}
          onResume={timerControls.resume}
          controlPending={timerControls.busy}
          controlFeedback={timerControls.feedback}
          waitingText={t('challengeLab.waitingForFacilitatorToStart')}
        />
      </div>

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <div className={styles.layout} data-challenge-layout>
        <main className={styles.mainColumn}>
          {!hasChallengeStarted ? (
            <section className={styles.card}>
              <ChallengeRulesPanel
                isStarted={false}
                isFacilitator={isFacilitator}
                challengeName={rulesPreset?.challengeName || 'Lab d\'Innovation'}
                objective={rulesContent.objective}
                participantsMeta={rulesParticipantsMeta}
                facilitatorRules={facilitatorRules}
                participantRules={participantRules}
                footnote={rulesContent.footnote}
                onStart={isFacilitator ? startChallenge : null}
                startLabel={t('challengeLab.startChallenge')}
                startStatusText={isFacilitator ? '' : t('challengeLab.waitingForFacilitatorToStart2')}
              />
            </section>
          ) : (
            <>
              <section className={styles.card} data-debrief-content={isDebrief || undefined}>
                <div className={styles.phaseHeader}>
                  <div>
                    {isDebrief ? <ChallengeDebriefHeading /> : <h2 className={styles.phaseTitle}>{getPhaseTitle(locale, currentPhase)}</h2>}
                    {!isDebrief ? <p className={styles.phaseGuidance}>{getPhaseGuidance(locale, currentPhase)}</p> : null}
                    {isFacilitator ? <p className={styles.facilitatorNote}>{t('challengeLab.facilitatorModeObservationOnly')}</p> : null}
                  </div>
                </div>

                {!isDebrief ? <div className={styles.progressBar} aria-hidden="true">
                  {phaseProgress.map((item) => (
                    <span key={item.key} className={`${styles.progressStep}${item.active ? ` ${styles.progressStepActive}` : ''}${item.done ? ` ${styles.progressStepDone}` : ''}`}>
                      <span className={styles.progressStepDot}>{item.index + 1}</span>
                      <span className={styles.progressStepLabel}>{getPhaseLabel(locale, item.key)}</span>
                    </span>
                  ))}
                </div> : null}
                {!isDebrief ? <>
                  {currentPhase === 'problem' || currentPhase === 'solution' ? (
                    <p className={styles.voteGuidance}>
                      {currentPhase === 'problem'
                        ? t('challengeLab.valueOfProblemvotelimitVotesRemaining', { value: Math.max(0, problemVoteLimit - votedProblemIds.size), problemVoteLimit })
                        : t('challengeLab.valueOfSolutionvotelimitVotesRemaining', { value: Math.max(0, solutionVoteLimit - votedSolutionIds.size), solutionVoteLimit })}
                    </p>
                  ) : null}
                  <p className={styles.phaseTransition} role="status">
                    {currentPhaseIndex < PHASE_ORDER.length - 1
                      ? `${t('challengeLab.next')} : ${getPhaseLabel(locale, PHASE_ORDER[currentPhaseIndex + 1])} · ${t('challengeLab.startsAutomaticallyWhenTimeIsUp')}`
                      : t('challengeLab.finalPhaseResultsAppearWhenTime')}
                  </p>
                </> : null}
                {pendingSubmission ? <p role="status">{t('challengeLab.waitingForServerConfirmation')}</p> : null}
                {submissionFeedback ? <p role="status">{submissionFeedback}</p> : null}
                {voteFeedback ? <p className={styles.voteFeedback} role="status">{voteFeedback}</p> : null}
                {!socket?.connected ? <p role="alert">{t('challengeLab.connectionInterruptedYourDraftIsKept')}</p> : null}
                {!isDebrief && timer.enabled !== false && normalizedTimerStatus !== 'running' ? <p role="status">{t('challengeLab.submissionsAreAvailableOnlyWhileThe')}</p> : null}
              </section>

          {isDebrief ? statisticsCard : null}

          {currentPhase === 'problem' ? (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('challengeLab.n1ProblemIdentification')}</h2>
              {!isFacilitator ? (
                <div className={styles.inputGrid}>
                  <div className={styles.textAreaWrap}>
                    <textarea className={styles.textArea} value={problemText} onChange={(event) => setProblemText(event.target.value)} maxLength={textLimit} disabled={Boolean(pendingSubmission)} placeholder={t('challengeLab.describeAProblemTextlimitCharsMax', { textLimit })} />
                    <span className={`${styles.charCount}${problemText.length >= textLimit * 0.9 ? ` ${problemText.length >= textLimit ? styles.charCountFull : styles.charCountNear}` : ''}`}>{problemText.length}/{textLimit}</span>
                  </div>
                  {!problemValid ? <p id="lab-problem-help">{t('challengeLab.describeAProblemBeforeSubmitting')}</p> : null}
                  <button type="button" className={styles.primaryBtn} onClick={submitProblem} disabled={!canParticipate || !problemValid} aria-describedby={!problemValid ? 'lab-problem-help' : undefined}>{t('challengeLab.submit')}</button>
                </div>
              ) : null}
              <div className={styles.listGrid}>
                {problemList.map((item) => (
                  <article key={item.id} className={styles.voteCard}>
                    <div className={styles.cardTopline}>
                      <span className={styles.avatar}>{getInitials(participantMap.get(String(item.participant_id || '')) || 'Participant')}</span>
                      <div>
                        <strong>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</strong>
                        <p>{clampText(item.text, 200)}</p>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <span className={styles.badge}>{Number(item.vote_count || 0)} {t('challengeLab.votes2')}</span>
                      {!isFacilitator ? renderVoteButton('problem', item, votedProblemIds, problemVoteLimit) : null}
                    </div>
                  </article>
                ))}
              </div>
              <section className={styles.listCard}>
                <h3>{t('challengeLab.top4Retained')}</h3>
                <div className={styles.compactList}>
                  {topProblems.slice(0, 4).map((item, index) => (
                    <article key={item.id} className={styles.compactRow}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <div>
                        <strong>{clampText(item.text, 120)}</strong>
                        <p>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

          {currentPhase === 'solution' ? (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('challengeLab.n2SolutionGeneration')}</h2>
              <div className={styles.listCard}>
                <h3>{t('challengeLab.problemsKeptForThisPhase')}</h3>
                <div className={styles.compactList}>
                  {visibleProblems.map((item, index) => (
                    <article key={item.id} className={styles.compactRow}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <div>
                        <strong>{clampText(item.text, 140)}</strong>
                        <p>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              {!isFacilitator ? (
                <div className={styles.inputGrid}>
                  <select className={styles.select} value={selectedProblemId} onChange={(event) => setSelectedProblemId(event.target.value)} disabled={Boolean(pendingSubmission)}>
                    <option value="">{t('challengeLab.chooseAProblem')}</option>
                    {visibleProblems.map((item) => <option key={item.id} value={item.id}>{clampText(item.text, 100)}</option>)}
                  </select>
                  <div className={styles.textAreaWrap}>
                    <textarea className={styles.textArea} value={solutionText} onChange={(event) => setSolutionText(event.target.value)} maxLength={textLimit} disabled={Boolean(pendingSubmission)} placeholder={t('challengeLab.describeASolutionTextlimitCharsMax', { textLimit })} />
                    <span className={`${styles.charCount}${solutionText.length >= textLimit * 0.9 ? ` ${solutionText.length >= textLimit ? styles.charCountFull : styles.charCountNear}` : ''}`}>{solutionText.length}/{textLimit}</span>
                  </div>
                  {!solutionValid ? <p id="lab-solution-help">{t('challengeLab.chooseAProblemAndDescribeYour')}</p> : null}
                  <button type="button" className={styles.primaryBtn} onClick={submitSolution} disabled={!canParticipate || !solutionValid} aria-describedby={!solutionValid ? 'lab-solution-help' : undefined}>{t('challengeLab.submit')}</button>
                </div>
              ) : null}
              <div className={styles.listGrid}>
                {solutionList.map((item) => (
                  <article key={item.id} className={styles.voteCard}>
                    <div className={styles.cardTopline}>
                      <span className={styles.avatar}>{getInitials(participantMap.get(String(item.participant_id || '')) || 'Participant')}</span>
                      <div>
                        <strong>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</strong>
                        <p>{clampText(item.text, 200)}</p>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <span className={styles.badge}>{Number(item.vote_count || 0)} {t('challengeLab.votes2')}</span>
                      {!isFacilitator ? renderVoteButton('solution', item, votedSolutionIds, solutionVoteLimit) : null}
                    </div>
                  </article>
                ))}
              </div>
              <section className={styles.listCard}>
                <h3>{t('challengeLab.top3Retained')}</h3>
                <div className={styles.compactList}>
                  {topSolutions.slice(0, 3).map((item, index) => (
                    <article key={item.id} className={styles.compactRow}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <div>
                        <strong>{clampText(item.text, 120)}</strong>
                        <p>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

          {currentPhase === 'argument' ? (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('challengeLab.n3ArgumentationBuilding')}</h2>
              <div className={styles.listCard}>
                <h3>{t('challengeLab.finalistSolutions')}</h3>
                <div className={styles.compactList}>
                  {finalistSolutions.map((item, index) => (
                    <article key={item.id} className={styles.compactRow}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <div>
                        <strong>{clampText(item.text, 120)}</strong>
                        <p>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              {!isFacilitator ? (
                <div className={styles.inputGrid}>
                  <select className={styles.select} value={selectedSolutionId} onChange={(event) => setSelectedSolutionId(event.target.value)} disabled={Boolean(pendingSubmission)}>
                    <option value="">{t('challengeLab.chooseAFinalistSolution')}</option>
                    {finalistSolutions.map((item) => <option key={item.id} value={item.id}>{clampText(item.text, 100)}</option>)}
                  </select>
                  <div className={styles.textAreaWrap}>
                    <textarea className={styles.textArea} value={contribution.advantage} onChange={(event) => setContribution((prev) => ({ ...prev, advantage: event.target.value }))} maxLength={textLimit} disabled={Boolean(pendingSubmission)} placeholder={t('challengeLab.advantageTextlimitMax', { textLimit })} />
                    <span className={`${styles.charCount}${contribution.advantage.length >= textLimit * 0.9 ? ` ${contribution.advantage.length >= textLimit ? styles.charCountFull : styles.charCountNear}` : ''}`}>{contribution.advantage.length}/{textLimit}</span>
                  </div>
                  <div className={styles.textAreaWrap}>
                    <textarea className={styles.textArea} value={contribution.improvement} onChange={(event) => setContribution((prev) => ({ ...prev, improvement: event.target.value }))} maxLength={textLimit} disabled={Boolean(pendingSubmission)} placeholder={t('challengeLab.improvementTextlimitMax', { textLimit })} />
                    <span className={`${styles.charCount}${contribution.improvement.length >= textLimit * 0.9 ? ` ${contribution.improvement.length >= textLimit ? styles.charCountFull : styles.charCountNear}` : ''}`}>{contribution.improvement.length}/{textLimit}</span>
                  </div>
                  <div className={styles.textAreaWrap}>
                    <textarea className={styles.textArea} value={contribution.impact} onChange={(event) => setContribution((prev) => ({ ...prev, impact: event.target.value }))} maxLength={textLimit} disabled={Boolean(pendingSubmission)} placeholder={`Impact (${textLimit} max)`} />
                    <span className={`${styles.charCount}${contribution.impact.length >= textLimit * 0.9 ? ` ${contribution.impact.length >= textLimit ? styles.charCountFull : styles.charCountNear}` : ''}`}>{contribution.impact.length}/{textLimit}</span>
                  </div>
                  {!contributionValid ? <p id="lab-contribution-help">{t('challengeLab.chooseASolutionAndCompleteAdvantage')}</p> : null}
                  <button type="button" className={styles.primaryBtn} onClick={submitContribution} disabled={!canParticipate || !contributionValid} aria-describedby={!contributionValid ? 'lab-contribution-help' : undefined}>{t('challengeLab.submit')}</button>
                </div>
              ) : null}
              <div className={styles.listGrid}>
                {contributionList.map((item) => (
                  <article key={item.id} className={styles.voteCard}>
                    <div className={styles.cardTopline}>
                      <span className={styles.avatar}>{getInitials(participantMap.get(String(item.participant_id || '')) || 'Participant')}</span>
                      <div>
                        <strong>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</strong>
                        <p>{clampText(item.advantage, 130)}</p>
                        <p>{clampText(item.improvement, 130)}</p>
                        <p>{clampText(item.impact, 130)}</p>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <span className={styles.badge}>{Number(item.reaction_count || 0)} {t('challengeLab.reactions')}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {currentPhase === 'final_vote' ? (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{t('challengeLab.n4FinalVote')}</h2>
              <div className={styles.listCard}>
                <h3>{t('challengeLab.solutionsToEvaluate')}</h3>
                <div className={styles.compactList}>
                  {finalistSolutions.map((item, index) => (
                    <article key={item.id} className={styles.compactRow}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <div>
                        <strong>{clampText(item.text, 120)}</strong>
                        <p>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</p>
                      </div>
                      {!isFacilitator ? <button type="button" className={styles.ghostBtn} onClick={() => setFinalVoteId(String(item.id))} aria-pressed={finalVoteId === String(item.id)}>{finalVoteId === String(item.id) ? t('challengeLab.selected') : t('challengeLab.select')}</button> : null}
                    </article>
                  ))}
                </div>
              </div>
              {!isFacilitator ? (
                <div className={styles.voteHero}>
                  <span className={styles.voteHeroLabel}>{t('challengeLab.anonymousVote')}</span>
                  <strong>{t('challengeLab.chooseOneSolution')}</strong>
                  {!finalVoteValid ? <p id="lab-vote-help">{t('challengeLab.chooseASolutionBeforeVoting')}</p> : null}
                  <button type="button" className={styles.primaryBtn} onClick={castFinalVote} disabled={!canParticipate || !finalVoteValid || hasFinalVote} aria-describedby={!finalVoteValid ? 'lab-vote-help' : undefined}>{hasFinalVote ? t('challengeLab.voteRecorded') : t('challengeLab.submitVote')}</button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{isDebrief ? t('challengeLab.finalRanking') : t('challengeLab.liveLeaderboard')}</h2>
            <div className={styles.leaderboardGrid}>
              {rankedParticipants.map((entry, index) => (
                <article key={entry.participant_id || entry.id || index} className={styles.leaderboardCard}>
                  <div className={styles.leaderboardIdentity}>
                    <span className={styles.leaderAvatar}>{getInitials(entry.participantName)}</span>
                    <div>
                      <strong>{entry.participantName}</strong>
                      <p>{t('challengeLab.scoreTotal')}: {Number(entry.score || 0)}</p>
                    </div>
                  </div>
                  <div className={styles.leaderboardMeta}>
                    <span className={styles.rankPill}>#{entry.rank || index + 1}</span>
                    <span className={styles.badge}>{Number(entry.qualifying_count || 0)} {t('challengeLab.qualifiedProposals')}</span>
                    <span className={styles.badge}>{Number(entry.contribution_count || 0)} {t('challengeLab.contributions2')}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

            </>
          )}
        </main>

        <aside className={styles.sideColumn}>
          <div className="challenge-desktop-timer">
            <ChallengeTimerCard
              isStarted={hasChallengeStarted}
              title={t('challengeLab.timer')}
              remainingSeconds={timerRemainingSeconds}
              durationSeconds={timerDurationSeconds}
              status={timerStatus}
              isFacilitator={isFacilitator}
              onPause={timerControls.pause}
              onResume={timerControls.resume}
              controlPending={timerControls.busy}
              controlFeedback={timerControls.feedback}
              waitingText={t('challengeLab.waitingForFacilitatorToStart')}
            />
          </div>

          {!isDebrief ? statisticsCard : null}

          <ChallengeChatCard
            title={t('challengeLab.chat')}
            messages={chatMessages}
            currentAuthor={myName}
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
