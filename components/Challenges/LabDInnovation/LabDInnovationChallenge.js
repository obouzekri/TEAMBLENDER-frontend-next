'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getDictionary } from '@/lib/i18n';
import ChallengeHeader from '../ChallengeHeader';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import styles from './LabDInnovation.module.css';
import useI18n from '@/lib/i18n/useI18n';

const PHASE_ORDER = ['problem', 'solution', 'argument', 'final_vote'];

function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

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
    problem: locale === 'en' ? 'Problems' : 'Problématiques',
    solution: locale === 'en' ? 'Solutions' : 'Solutions',
    argument: locale === 'en' ? 'Argumentation' : 'Argumentaire',
    final_vote: locale === 'en' ? 'Final vote' : 'Vote final'
  };
  return labels[phaseKey] || phaseKey;
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
    problem: locale === 'en'
      ? 'Collect the strongest shared problems before voting closes.'
      : 'Faites remonter les problématiques les plus structurantes avant la clôture du vote.',
    solution: locale === 'en'
      ? 'Turn the retained problems into concrete solution options.'
      : 'Transformez les problématiques retenues en pistes de solution concrètes.',
    argument: locale === 'en'
      ? 'Strengthen finalist solutions with clear, actionable arguments.'
      : 'Renforcez les solutions finalistes avec des arguments clairs et actionnables.',
    final_vote: locale === 'en'
      ? 'Vote anonymously for the solution that should win the lab.'
      : 'Votez anonymement pour la solution qui doit remporter le Lab.'
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
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const { state, error, isFacilitator, emitEvent, participantId } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const challenge = state?.labInnovation || state?.lab_innovation || state?.innovation || buildFallbackState(runtimePayload);
  const [problemText, setProblemText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [selectedSolutionId, setSelectedSolutionId] = useState('');
  const [contribution, setContribution] = useState({ advantage: '', improvement: '', impact: '' });
  const [finalVoteId, setFinalVoteId] = useState('');
  const [reactionMap, setReactionMap] = useState({});
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

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat } = useChallengeChat({
    socket,
    emitEvent,
    author: myName,
    enabled: true,
    maxMessages: 80,
    maxLength: 240
  });

  const timerStatus = currentPhase === 'final_vote' && Number(challenge?.phase_deadline_ms || 0) > 0 ? 'running' : currentPhaseIndex >= 0 ? 'running' : 'idle';
  const timerRemainingSeconds = useMemo(() => {
    const deadline = Number(challenge?.phase_deadline_ms || 0);
    if (!deadline) {
      const durations = challenge?.phases || [];
      const current = durations[currentPhaseIndex] || durations[0] || { duration_seconds: 0 };
      return Number(current.duration_seconds || 0);
    }
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }, [challenge?.phase_deadline_ms, currentPhaseIndex]);
  const timerDurationSeconds = useMemo(() => {
    const phases = Array.isArray(challenge?.phases) ? challenge.phases : [];
    return phases.reduce((sum, phase) => sum + Number(phase?.duration_seconds || 0), 0) || 2100;
  }, [challenge?.phases]);

  const participantRows = useMemo(() => {
    return rankings.length > 0
      ? buildRank(rankings.map((entry) => ({ ...entry, id: String(entry.participant_id || entry.id || '') })), 'score')
      : buildRank(Object.entries(scoreByParticipant).map(([id, score], index) => ({ id, participant_id: id, score, ts_index: index })), 'score');
  }, [rankings, scoreByParticipant]);

  const visibleProblems = useMemo(() => sortByVotesAndAge(problemList).slice(0, 4), [problemList]);
  const visibleSolutions = useMemo(() => sortByVotesAndAge(solutionList).slice(0, 3), [solutionList]);

  useEffect(() => {
    if (lastPhaseRef.current && lastPhaseRef.current !== currentPhase) {
      // Keep the automatic phase transition visible with a clean state change.
      setSelectedProblemId('');
      setSelectedSolutionId('');
    }
    lastPhaseRef.current = currentPhase;
  }, [currentPhase]);

  function emit(type, payload) {
    emitEvent(type, payload || {});
  }

  function submitProblem() {
    const text = clampText(problemText, 200);
    if (!text) return;
    emit('lab.problem.submit', { text });
    setProblemText('');
  }

  function submitSolution() {
    const text = clampText(solutionText, 200);
    if (!text || !selectedProblemId) return;
    emit('lab.solution.submit', { text, problem_id: selectedProblemId });
    setSolutionText('');
  }

  function submitContribution() {
    const payload = {
      solution_id: selectedSolutionId,
      advantage: clampText(contribution.advantage, 200),
      improvement: clampText(contribution.improvement, 200),
      impact: clampText(contribution.impact, 200)
    };
    if (!payload.solution_id || !payload.advantage || !payload.improvement || !payload.impact) return;
    emit('lab.contribution.submit', payload);
    setContribution({ advantage: '', improvement: '', impact: '' });
  }

  function castProblemVote(problemId) {
    emit('lab.problem.vote', { problem_id: problemId });
  }

  function castSolutionVote(solutionId) {
    emit('lab.solution.vote', { solution_id: solutionId });
  }

  function castFinalVote() {
    if (!finalVoteId) return;
    emit('lab.final.vote', { solution_id: finalVoteId });
  }

  const rulesPreset = useMemo(() => getDictionary(locale)?.challengeRules?.labInnovation || getDictionary('fr')?.challengeRules?.labInnovation || {}, [locale]);
  const rulesContent = useMemo(() => ({
    objective: String(rulesPreset?.objective || '').trim(),
    facilitator: Array.isArray(rulesPreset?.facilitator) ? rulesPreset.facilitator : [],
    participant: Array.isArray(rulesPreset?.participant) ? rulesPreset.participant : [],
    scoring: Array.isArray(rulesPreset?.scoring) ? rulesPreset.scoring : [],
    footnote: String(rulesPreset?.footnote || '').trim()
  }), [rulesPreset]);

  const rulesParticipantsMeta = useMemo(() => ({
    min: rulesPreset?.participants?.min || '3',
    recommended: rulesPreset?.participants?.recommended || '6',
    max: rulesPreset?.participants?.max || '12'
  }), [rulesPreset]);

  const facilitatorRules = useMemo(() => [...rulesContent.facilitator], [rulesContent.facilitator]);
  const participantRules = useMemo(() => [...rulesContent.participant, ...rulesContent.scoring], [rulesContent.participant, rulesContent.scoring]);

  const rankedParticipants = useMemo(() => {
    const list = participantRows.map((entry, index) => ({
      ...entry,
      participantName: participantMap.get(String(entry.participant_id || entry.id || '')) || `Participant ${index + 1}`
    }));
    return list.slice(0, 10);
  }, [participantRows, participantMap]);

  const phaseSummary = useMemo(() => ({
    problems: Number(stats.problems_total || problemList.length || 0),
    solutions: Number(stats.solutions_total || solutionList.length || 0),
    contributions: Number(stats.contributions_total || contributionList.length || 0),
    votes: Number(stats.votes_total || 0),
  }), [contributionList.length, problemList.length, solutionList.length, stats]);

  const topContributorNames = Array.isArray(stats.top_contributors) ? stats.top_contributors.map((item) => {
    const id = String(item?.participant_id || '').trim();
    return participantMap.get(id) || item?.participant_name || 'Participant';
  }).filter(Boolean) : [];

  return (
    <div className={styles.shell}>
      <ChallengeHeader title={rulesPreset?.challengeName || 'Lab d\'Innovation'} subtitle={rulesPreset?.subtitle || 'Innovation collaborative'} />

      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <div className={styles.layout}>
        <main className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.phaseHeader}>
              <div>
                <p className={styles.phaseKicker}>{getPhaseLabel(locale, currentPhase)}</p>
                <h2 className={styles.phaseTitle}>{isEn ? 'Live collaborative lab' : 'Lab collaboratif live'}</h2>
                <p className={styles.phaseBody}>{rulesContent.objective}</p>
                <p className={styles.phaseGuidance}>{getPhaseGuidance(locale, currentPhase)}</p>
              </div>
              <div className={styles.phaseClockWrap}>
                <span className={styles.phaseClock}>{formatClock(timerRemainingSeconds)}</span>
                <span className={styles.phaseClockLabel}>{currentPhaseIndex + 1}/{PHASE_ORDER.length}</span>
              </div>
            </div>

            <div className={styles.phaseStatsRow}>
              <article className={styles.statTile}><strong>{phaseSummary.problems}</strong><span>{isEn ? 'Problems' : 'Problématiques'}</span></article>
              <article className={styles.statTile}><strong>{phaseSummary.solutions}</strong><span>{isEn ? 'Solutions' : 'Solutions'}</span></article>
              <article className={styles.statTile}><strong>{phaseSummary.contributions}</strong><span>{isEn ? 'Contributions' : 'Contributions'}</span></article>
              <article className={styles.statTile}><strong>{phaseSummary.votes}</strong><span>{isEn ? 'Votes' : 'Votes'}</span></article>
            </div>

            <div className={styles.progressBar} aria-hidden="true">
              {phaseProgress.map((item) => (
                <span key={item.key} className={`${styles.progressStep}${item.active ? ` ${styles.progressStepActive}` : ''}${item.done ? ` ${styles.progressStepDone}` : ''}`}>
                  <span className={styles.progressStepDot}>{item.index + 1}</span>
                  <span className={styles.progressStepLabel}>{getPhaseLabel(locale, item.key)}</span>
                </span>
              ))}
            </div>
          </section>

          {currentPhase === 'problem' ? (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{isEn ? '1. Problem identification' : '1. Identification des problématiques'}</h2>
              <div className={styles.inputGrid}>
                <textarea className={styles.textArea} value={problemText} onChange={(event) => setProblemText(event.target.value)} maxLength={200} placeholder={isEn ? 'Describe a problem in 200 characters max' : 'Décrivez une problématique en 200 caractères max'} />
                <button type="button" className={styles.primaryBtn} onClick={submitProblem}>{isEn ? 'Submit problem' : 'Soumettre la problématique'}</button>
              </div>
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
                      <span className={styles.badge}>{Number(item.vote_count || 0)} {isEn ? 'votes' : 'votes'}</span>
                      <button type="button" className={styles.ghostBtn} onClick={() => castProblemVote(String(item.id))}>{isEn ? 'Vote' : 'Voter'}</button>
                    </div>
                  </article>
                ))}
              </div>
              <section className={styles.listCard}>
                <h3>{isEn ? 'Top 4 retained' : 'Top 4 retenu'}</h3>
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
              <h2 className={styles.sectionTitle}>{isEn ? '2. Solution generation' : '2. Génération des solutions'}</h2>
              <div className={styles.listCard}>
                <h3>{isEn ? 'Problems kept for this phase' : 'Problématiques retenues pour cette phase'}</h3>
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
              <div className={styles.inputGrid}>
                <select className={styles.select} value={selectedProblemId} onChange={(event) => setSelectedProblemId(event.target.value)}>
                  <option value="">{isEn ? 'Choose a problem' : 'Choisir une problématique'}</option>
                  {visibleProblems.map((item) => <option key={item.id} value={item.id}>{clampText(item.text, 100)}</option>)}
                </select>
                <textarea className={styles.textArea} value={solutionText} onChange={(event) => setSolutionText(event.target.value)} maxLength={200} placeholder={isEn ? 'Describe a solution in 200 characters max' : 'Décrivez une solution en 200 caractères max'} />
                <button type="button" className={styles.primaryBtn} onClick={submitSolution}>{isEn ? 'Submit solution' : 'Soumettre la solution'}</button>
              </div>
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
                      <span className={styles.badge}>{Number(item.vote_count || 0)} {isEn ? 'votes' : 'votes'}</span>
                      <button type="button" className={styles.ghostBtn} onClick={() => castSolutionVote(String(item.id))}>{isEn ? 'Vote' : 'Voter'}</button>
                    </div>
                  </article>
                ))}
              </div>
              <section className={styles.listCard}>
                <h3>{isEn ? 'Top 3 retained' : 'Top 3 retenu'}</h3>
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
              <h2 className={styles.sectionTitle}>{isEn ? '3. Argumentation building' : '3. Construction de l\'argumentaire'}</h2>
              <div className={styles.listCard}>
                <h3>{isEn ? 'Finalist solutions' : 'Solutions finalistes'}</h3>
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
              <div className={styles.inputGrid}>
                <select className={styles.select} value={selectedSolutionId} onChange={(event) => setSelectedSolutionId(event.target.value)}>
                  <option value="">{isEn ? 'Choose a finalist solution' : 'Choisir une solution finaliste'}</option>
                  {finalistSolutions.map((item) => <option key={item.id} value={item.id}>{clampText(item.text, 100)}</option>)}
                </select>
                <textarea className={styles.textArea} value={contribution.advantage} onChange={(event) => setContribution((prev) => ({ ...prev, advantage: event.target.value }))} maxLength={200} placeholder={isEn ? 'Advantage (200 max)' : 'Avantage (200 max)'} />
                <textarea className={styles.textArea} value={contribution.improvement} onChange={(event) => setContribution((prev) => ({ ...prev, improvement: event.target.value }))} maxLength={200} placeholder={isEn ? 'Proposed improvement (200 max)' : 'Amélioration proposée (200 max)'} />
                <textarea className={styles.textArea} value={contribution.impact} onChange={(event) => setContribution((prev) => ({ ...prev, impact: event.target.value }))} maxLength={200} placeholder={isEn ? 'Expected impact / justification (200 max)' : 'Impact attendu / justification (200 max)'} />
                <button type="button" className={styles.primaryBtn} onClick={submitContribution}>{isEn ? 'Submit contribution' : 'Soumettre la contribution'}</button>
              </div>
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
                      <span className={styles.badge}>{Number(item.reaction_count || 0)} {isEn ? 'reactions' : 'réactions'}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {currentPhase === 'final_vote' ? (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>{isEn ? '4. Final vote' : '4. Vote final'}</h2>
              <div className={styles.listCard}>
                <h3>{isEn ? 'Solutions to evaluate' : 'Solutions à évaluer'}</h3>
                <div className={styles.compactList}>
                  {finalistSolutions.map((item, index) => (
                    <article key={item.id} className={styles.compactRow}>
                      <span className={styles.rankBadge}>#{index + 1}</span>
                      <div>
                        <strong>{clampText(item.text, 120)}</strong>
                        <p>{participantMap.get(String(item.participant_id || '')) || 'Participant'}</p>
                      </div>
                      <button type="button" className={styles.ghostBtn} onClick={() => setFinalVoteId(String(item.id))}>{isEn ? 'Select' : 'Sélectionner'}</button>
                    </article>
                  ))}
                </div>
              </div>
              <div className={styles.voteHero}>
                <span className={styles.voteHeroLabel}>{isEn ? 'Anonymous vote' : 'Vote anonyme'}</span>
                <strong>{isEn ? 'Choose one solution only' : 'Choisissez une seule solution'}</strong>
                <p className={styles.phaseBody}>{isEn ? 'The solution with the most votes wins the lab.' : 'La solution ayant le plus de votes remporte le Lab.'}</p>
                <button type="button" className={styles.primaryBtn} onClick={castFinalVote}>{isEn ? 'Cast final vote' : 'Voter définitivement'}</button>
              </div>
            </section>
          ) : null}

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{isEn ? 'Live leaderboard' : 'Classement live'}</h2>
            <div className={styles.leaderboardGrid}>
              {rankedParticipants.map((entry, index) => (
                <article key={entry.participant_id || entry.id || index} className={styles.leaderboardCard}>
                  <div className={styles.leaderboardIdentity}>
                    <span className={styles.leaderAvatar}>{getInitials(entry.participantName)}</span>
                    <div>
                      <strong>{entry.participantName}</strong>
                      <p>{isEn ? 'Score total' : 'Score total'}: {Number(entry.score || 0)}</p>
                    </div>
                  </div>
                  <div className={styles.leaderboardMeta}>
                    <span className={styles.rankPill}>#{entry.rank || index + 1}</span>
                    <span className={styles.badge}>{Number(entry.qualifying_count || 0)} {isEn ? 'qualified proposals' : 'propositions qualifiées'}</span>
                    <span className={styles.badge}>{Number(entry.contribution_count || 0)} {isEn ? 'contributions' : 'contributions'}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className={styles.sideColumn}>
          <ChallengeRulesPanel
            isStarted={true}
            isFacilitator={isFacilitator}
            showPrestartCard={false}
            challengeName={rulesPreset?.challengeName || 'Lab d\'Innovation'}
            objective={rulesContent.objective}
            participantsMeta={rulesParticipantsMeta}
            facilitatorRules={facilitatorRules}
            participantRules={participantRules}
            footnote={rulesContent.footnote}
          />

          <ChallengeTimerCard
            title={isEn ? 'Timer' : 'Chrono'}
            remainingSeconds={timerRemainingSeconds}
            durationSeconds={timerDurationSeconds}
            status={timerStatus}
            isFacilitator={isFacilitator}
            waitingText=""
          />

          <section className={styles.card}>
            <h3 className={styles.sectionTitle}>{isEn ? 'Challenge stats' : 'Statistiques du challenge'}</h3>
            <div className={styles.statGrid}>
              <article className={styles.statTile}><strong>{Number(stats.problems_total || 0)}</strong><span>{isEn ? 'Problems' : 'Problématiques'}</span></article>
              <article className={styles.statTile}><strong>{Number(stats.solutions_total || 0)}</strong><span>{isEn ? 'Solutions' : 'Solutions'}</span></article>
              <article className={styles.statTile}><strong>{Number(stats.contributions_total || 0)}</strong><span>{isEn ? 'Contributions' : 'Contributions'}</span></article>
              <article className={styles.statTile}><strong>{Number(stats.votes_total || 0)}</strong><span>{isEn ? 'Votes' : 'Votes'}</span></article>
            </div>
            <p className={styles.metaLine}>{isEn ? 'Participation rate' : 'Taux de participation'}: {Number(stats.participation_rate || 0)}%</p>
            <p className={styles.metaLine}>{isEn ? 'Winning solution' : 'Solution gagnante'}: {clampText(stats.winner_solution_text || '-', 120)}</p>
            {topContributorNames.length > 0 ? <p className={styles.metaLine}>{isEn ? 'Top contributors' : 'Top contributeurs'}: {topContributorNames.slice(0, 3).join(' · ')}</p> : null}
          </section>

          <ChallengeChatCard
            title={isEn ? 'Chat' : 'Chat'}
            messages={chatMessages}
            currentAuthor={myName}
            inputValue={chatInput}
            onInputChange={setChatInput}
            onSubmit={submitChat}
            quickMessages={DEFAULT_CHALLENGE_QUICK_MESSAGES}
            onQuickMessage={sendQuickChat}
            placeholder={isEn ? 'Write a message' : 'Écrire un message'}
            maxLength={240}
          />
        </aside>
      </div>
    </div>
  );
}
