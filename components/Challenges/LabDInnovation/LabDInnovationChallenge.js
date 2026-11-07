'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useRealtimeChallenge, { refreshChallengeStateBeforeStart } from '@/lib/challenges/useRealtimeChallenge';
import useFacilitatorTimerControls from '@/lib/challenges/useFacilitatorTimerControls';
import useChallengeChat from '@/lib/challenges/useChallengeChat';
import { DEFAULT_CHALLENGE_QUICK_MESSAGES } from '@/lib/challenges/chat-presets';
import { getDictionary } from '@/lib/i18n';
import { formatNumber } from '@/lib/i18n/format';
import useI18n from '@/lib/i18n/useI18n';
import ChallengeHeader from '../ChallengeHeader';
import ChallengePresentation from '../ChallengePresentation';
import ChallengeDebriefHeading from '../ChallengeDebriefHeading';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeChatCard from '../ChallengeChatCard';
import { buildLabReportHtml, openLabReport } from './labReport';
import styles from './LabDInnovation.module.css';

const LEVELS = ['low', 'medium', 'high'];
const DELAYS = ['short', 'medium', 'long'];
const STAKEHOLDER_TYPES = ['internal', 'external'];
const RESOURCE_TYPES = ['human', 'material', 'tools', 'skills'];
const EMPTY_STEP = {
  text: '', risk: '', risk_level: '', budget_level: '', budget_amount: '', delay: '',
  stakeholder: '', stakeholder_type: 'internal', resources: [], resources_detail: ''
};

// Reading stages: every argument or rationale is shown at once.
function isReadingPhase(phase) {
  return /_defense$/.test(phase);
}

// Same cleanup as the server, to know whether a draft still differs from what was saved.
function cleanDraft(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isVotePhase(phase) {
  return /_(vote|tiebreak_vote)$/.test(phase);
}

function trackOf(phase) {
  if (phase.startsWith('problem_')) return 'problem';
  if (phase.startsWith('solution_')) return 'solution';
  return null;
}

function sumPoints(allocation) {
  return Object.values(allocation || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export default function LabDInnovationChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale, t } = useI18n();
  const { state, error, isFacilitator, emitEvent, connected } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const timerControls = useFacilitatorTimerControls({ socket, emitEvent, state, isFacilitator });
  const timer = state?.timer || {};
  const lab = state?.labInnovation?.version === 2 ? state.labInnovation : null;
  const phase = String(lab?.phase || 'idle');
  const track = trackOf(phase);
  const limits = lab?.limits || {};
  const me = String(lab?.me || '');
  const isHost = Boolean(isFacilitator || lab?.is_host);

  const [voteDraft, setVoteDraft] = useState({});
  const [decisionIds, setDecisionIds] = useState([]);
  const [solutionText, setSolutionText] = useState('');
  const [solutionRationale, setSolutionRationale] = useState('');
  const [argueDrafts, setArgueDrafts] = useState({});
  const [stepDraft, setStepDraft] = useState(EMPTY_STEP);
  const [copied, setCopied] = useState(false);
  const [exportBlocked, setExportBlocked] = useState(false);

  // A new stage starts with a clean vote, decision and argument draft.
  const stageSeq = lab?.stage_seq;
  useEffect(() => {
    setVoteDraft({});
    setDecisionIds([]);
    setArgueDrafts({});
  }, [stageSeq]);

  // Arguments are saved shortly after typing stops, so nothing is lost when the time runs out.
  const savedArguments = lab?.my_arguments;
  const unsavedArguments = useMemo(() => Object.entries(argueDrafts)
    .filter(([id, text]) => cleanDraft(text) !== (savedArguments?.[id] || '')), [argueDrafts, savedArguments]);
  useEffect(() => {
    if (phase !== 'problem_argue' || unsavedArguments.length === 0) return undefined;
    const timer = setTimeout(() => {
      unsavedArguments.forEach(([id, text]) => emitEvent('lab.problem.argue', { problem_id: id, text }));
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, unsavedArguments, emitEvent]);

  const names = useMemo(() => {
    const map = new Map();
    (lab?.roster || []).forEach((id, index) => {
      map.set(id, String(lab?.names?.[id] || '').trim() || t('challengeLab.participantFallback', { index: index + 1 }));
    });
    return map;
  }, [lab?.roster, lab?.names, t]);
  const nameOf = (id) => (id === me ? t('challengeLab.you') : names.get(id) || 'Participant');
  const myName = names.get(me) || context?.displayName || 'Participant';

  const { chatInput, setChatInput, chatMessages, submitChat, sendQuickChat, chatDelivery } = useChallengeChat({
    socket, emitEvent, author: myName, enabled: true, maxMessages: 80, maxLength: 240
  });

  const timerStatus = String(timer?.status || 'idle').trim().toLowerCase();
  const hasStarted = ['running', 'paused', 'completed', 'stopped', 'timeout'].includes(timerStatus);
  const isDebrief = Boolean(state?.summary) || phase === 'done' || ['completed', 'timeout'].includes(timerStatus);
  const isRunning = timer.enabled === false || timerStatus === 'running';
  const canAct = !isHost && connected && isRunning && !isDebrief;
  const remainingSeconds = Math.max(0, Number(timer?.remaining_seconds || 0));
  const durationSeconds = Math.max(1, Number(timer?.duration_seconds || lab?.stage_duration_seconds || 1));

  const catalogById = useMemo(() => new Map((lab?.catalog || []).map((item) => [item.id, item])), [lab?.catalog]);
  const problemTitle = (id) => t(`challengeLab.catalog.${id}.title`);
  const solutionsById = useMemo(() => new Map((lab?.solutions || []).map((item) => [item.id, item])), [lab?.solutions]);
  const stepsById = useMemo(() => new Map((lab?.steps || []).map((item) => [item.id, item])), [lab?.steps]);

  const errorText = useMemo(() => {
    if (!error) return '';
    const key = `challengeLab.errors.${error}`;
    const translated = t(key);
    return translated === key ? error : translated;
  }, [error, t]);

  const rulesPreset = useMemo(() => getDictionary(locale)?.challengeRules?.labInnovation || getDictionary('fr')?.challengeRules?.labInnovation || {}, [locale]);
  const rulesProps = {
    challengeName: rulesPreset?.challengeName || t('challengeLab.title'),
    objective: String(rulesPreset?.objective || ''),
    participantsMeta: {
      min: rulesPreset?.participants?.min || '2',
      recommended: rulesPreset?.participants?.recommended || '4',
      max: rulesPreset?.participants?.max || '5'
    },
    facilitatorRules: Array.isArray(rulesPreset?.facilitator) ? rulesPreset.facilitator : [],
    participantRules: Array.isArray(rulesPreset?.participant) ? rulesPreset.participant : [],
    footnote: String(rulesPreset?.footnote || '')
  };

  function send(type, payload = {}) {
    return emitEvent(type, payload);
  }

  function startChallenge() {
    refreshChallengeStateBeforeStart(emitEvent);
    emitEvent('timer.start');
  }

  // ----- shared pieces -----

  function renderProgress() {
    const steps = lab?.progress_steps || [];
    const activeIndex = phase === 'done' ? steps.length : steps.indexOf(lab?.progress_step);
    return (
      <ol className={styles.progressBar}>
        {steps.map((key, index) => {
          const active = index === activeIndex;
          const done = index < activeIndex;
          return (
            <li key={key} className={`${styles.progressStep}${active ? ` ${styles.progressStepActive}` : ''}${done ? ` ${styles.progressStepDone}` : ''}`} aria-current={active ? 'step' : undefined}>
              <span className={styles.progressStepDot} aria-hidden="true">{done ? '✓' : index + 1}</span>
              <span className={styles.progressStepLabel}>{t(`challengeLab.steps.${key}`)}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  function renderReadyFooter({ doneLabel = t('challengeLab.imDone') } = {}) {
    const ready = lab?.ready || {};
    const toggleReady = () => {
      unsavedArguments.forEach(([id, text]) => send('lab.problem.argue', { problem_id: id, text }));
      send('lab.ready', { ready: !ready.me });
    };
    return (
      <div className={styles.readyRow}>
        <span className={styles.metaLine}>{t('challengeLab.readyCount', { count: ready.count || 0, total: ready.total || 0 })}</span>
        {!isHost ? (
          <button type="button" className={ready.me ? styles.ghostBtn : styles.primaryBtn} disabled={!canAct} onClick={toggleReady}>
            {ready.me ? t('challengeLab.editAgain') : doneLabel}
          </button>
        ) : null}
      </div>
    );
  }

  function renderArgumentList(items) {
    if (!items || items.length === 0) return <p className={styles.emptyHint}>{t('challengeLab.reading.noArguments')}</p>;
    return (
      <ul className={styles.argumentList}>
        {items.map((item) => (
          <li key={`${item.author_id}-${item.text}`} className={styles.argumentItem}>
            <p>{item.text}</p>
            <span className={styles.argumentAuthor}>{nameOf(item.author_id)}</span>
          </li>
        ))}
      </ul>
    );
  }

  function renderCategoryChip(problemId) {
    const category = catalogById.get(problemId)?.category;
    return category ? <span className={styles.categoryChip}>{t(`challengeLab.categories.${category}`)}</span> : null;
  }

  function renderRetained() {
    const problemId = lab?.retained_problem_id;
    const solutionIds = lab?.retained_solution_ids || [];
    if (!problemId) return null;
    const problemDecided = lab?.problem_vote?.decided_by;
    const solutionDecided = lab?.solution_vote?.decided_by;
    return (
      <section className={styles.retainedBanner}>
        <div>
          <span className={styles.voteHeroLabel}>{t('challengeLab.retainedProblem')}</span>
          <strong>{problemTitle(problemId)}</strong>
          {problemDecided ? <span className={styles.metaLine}> · {t(`challengeLab.decidedBy.${problemDecided}`)}</span> : null}
        </div>
        {solutionIds.length > 0 ? (
          <div>
            <span className={styles.voteHeroLabel}>{t('challengeLab.retainedSolution')}</span>
            {solutionIds.map((id) => <strong key={id} className={styles.blockText}>{solutionsById.get(id)?.text}</strong>)}
            {solutionDecided ? <span className={styles.metaLine}>{t(`challengeLab.decidedBy.${solutionDecided}`)}</span> : null}
          </div>
        ) : null}
      </section>
    );
  }

  function candidateLabel(id, kind) {
    return kind === 'problem' ? problemTitle(id) : solutionsById.get(id)?.text || '';
  }

  function renderLastResult(kind) {
    const results = lab?.[`${kind}_vote`]?.results || [];
    const last = results[results.length - 1];
    if (!last) return null;
    const ordered = [...last.candidates].sort((a, b) => (last.tally[b] || 0) - (last.tally[a] || 0));
    return (
      <section className={styles.listCard}>
        <h3>{t('challengeLab.voteResults', { round: last.round })}</h3>
        <div className={styles.compactList}>
          {ordered.map((id) => (
            <article key={id} className={styles.compactRow}>
              <span className={styles.rankBadge}>{t('challengeLab.points', { count: last.tally[id] || 0 })}</span>
              <div><strong>{candidateLabel(id, kind)}</strong></div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderStepCard(step, { index, removed = false, controls = null } = {}) {
    return (
      <article key={step.id} className={`${styles.stepCard}${removed ? ` ${styles.stepRemoved}` : ''}`}>
        <div className={styles.cardTopline}>
          {index != null ? <span className={styles.rankBadge}>{index + 1}</span> : null}
          <div>
            <strong>{step.text}</strong>
            {step.risk ? <p>{t('challengeLab.step.risk')} : {step.risk}</p> : null}
          </div>
        </div>
        <div className={styles.chipRow}>
          <span className={`${styles.chip}${step.risk_level === 'high' ? ` ${styles.chipHigh}` : ''}`}>{t('challengeLab.step.riskLevel')} : {t(`challengeLab.levels.${step.risk_level}`)}</span>
          <span className={styles.chip}>
            {t('challengeLab.step.budget')} : {t(`challengeLab.levels.${step.budget_level}`)}
            {Number.isFinite(step.budget_amount) ? ` (${formatNumber(step.budget_amount, locale)})` : ''}
          </span>
          <span className={styles.chip}>{t(`challengeLab.delays.${step.delay}`)}</span>
          {step.stakeholder ? <span className={styles.chip}>{step.stakeholder} · {t(`challengeLab.stakeholderTypes.${step.stakeholder_type}`)}</span> : null}
          {(step.resources || []).map((item) => <span key={item} className={styles.chip}>{t(`challengeLab.resourceTypes.${item}`)}</span>)}
        </div>
        {step.resources_detail ? <p className={styles.metaLine}>{step.resources_detail}</p> : null}
        {removed ? <span className={styles.badge}>{t('challengeLab.merge.removed')}</span> : null}
        {controls}
      </article>
    );
  }

  // ----- phases -----

  function renderProblemSelect() {
    const picks = lab?.my_picks || [];
    const max = limits.max_problem_picks || 3;
    const catalog = lab?.catalog || [];
    const categories = [];
    catalog.forEach((item) => {
      if (!categories.includes(item.category)) categories.push(item.category);
    });
    // One flat grid, still ordered by theme: each card carries its theme and reference.
    const items = categories.flatMap((category) => catalog.filter((item) => item.category === category));
    return (
      <section className={styles.card}>
        {!isHost ? <p className={styles.voteGuidance}>{t('challengeLab.pickCount', { count: picks.length, max })}</p> : null}
        <div className={styles.problemGrid}>
          {items.map((item) => {
            const picked = picks.includes(item.id);
            return (
              <article key={item.id} className={`${styles.problemCard}${picked ? ` ${styles.problemCardPicked}` : ''}`} data-category={item.category}>
                <span className={styles.categoryChip}>{t(`challengeLab.categories.${item.category}`)}</span>
                <strong>{problemTitle(item.id)}</strong>
                <p>{t(`challengeLab.catalog.${item.id}.description`)}</p>
                <span className={styles.problemCardRef}>{t(`challengeLab.categoryReferences.${item.category}`)}</span>
                {!isHost ? (
                  <button
                    type="button"
                    className={`${styles.ghostBtn}${picked ? ` ${styles.voteRecorded}` : ''}`}
                    aria-pressed={picked}
                    disabled={!canAct || (!picked && picks.length >= max)}
                    onClick={() => send('lab.problem.toggle', { problem_id: item.id })}
                  >
                    {picked ? t('challengeLab.picked') : t('challengeLab.pick')}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
        {renderReadyFooter()}
      </section>
    );
  }

  function renderArgue() {
    const picks = lab?.my_picks || [];
    const textMax = limits.text_max_length || 200;
    const saved = lab?.my_arguments || {};
    const written = picks.filter((id) => cleanDraft(argueDrafts[id] ?? saved[id])).length;
    if (isHost) {
      return (
        <section className={styles.card}>
          <p className={styles.voteGuidance}>{t('challengeLab.argue.hostHint')}</p>
          {renderReadyFooter()}
        </section>
      );
    }
    return (
      <section className={styles.card}>
        {picks.length === 0 ? <p className={styles.emptyHint}>{t('challengeLab.argue.noPicks')}</p> : (
          <>
            <p className={styles.voteGuidance}>
              {t('challengeLab.argue.progress', { count: written, total: picks.length })}
              <span className={styles.saveState} role="status">
                {unsavedArguments.length > 0 ? t('challengeLab.argue.saving') : written > 0 ? t('challengeLab.argue.saved') : ''}
              </span>
            </p>
            <div className={styles.argueGrid}>
              {picks.map((id) => {
                const value = argueDrafts[id] ?? saved[id] ?? '';
                return (
                  <article key={id} className={styles.argueCard} data-category={catalogById.get(id)?.category}>
                    {renderCategoryChip(id)}
                    <strong>{problemTitle(id)}</strong>
                    <label className={styles.textAreaWrap}>
                      <span className={styles.fieldLabel}>{t('challengeLab.argue.why')}</span>
                      <textarea
                        className={styles.textArea}
                        value={value}
                        maxLength={textMax}
                        disabled={!canAct}
                        placeholder={t('challengeLab.argue.placeholder', { max: textMax })}
                        onChange={(event) => setArgueDrafts((prev) => ({ ...prev, [id]: event.target.value }))}
                      />
                      <span className={styles.charCount}>{value.length}/{textMax}</span>
                    </label>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {renderReadyFooter()}
      </section>
    );
  }

  function renderProblemReading() {
    const counts = lab?.pick_counts || {};
    const byProblem = lab?.arguments_by_problem || {};
    const candidates = lab?.problem_vote?.candidates?.length ? lab.problem_vote.candidates : lab?.shortlist || [];
    const others = (lab?.catalog || []).map((item) => item.id)
      .filter((id) => !candidates.includes(id) && (byProblem[id] || []).length > 0);
    const renderProblem = (id) => (
      <article key={id} className={styles.readingCard} data-category={catalogById.get(id)?.category}>
        <div className={styles.readingHead}>
          {renderCategoryChip(id)}
          <span className={styles.badge}>{t('challengeLab.picksBadge', { count: counts[id] || 0 })}</span>
        </div>
        <strong>{problemTitle(id)}</strong>
        <p className={styles.metaLine}>{t(`challengeLab.catalog.${id}.description`)}</p>
        {renderArgumentList(byProblem[id])}
      </article>
    );
    return (
      <section className={styles.card}>
        <section className={styles.listCard}>
          <h3>{t('challengeLab.reading.inDebate')}</h3>
          <div className={styles.readingGrid}>{candidates.map(renderProblem)}</div>
        </section>
        {others.length > 0 ? (
          <section className={styles.listCard}>
            <h3>{t('challengeLab.reading.others')}</h3>
            <p className={styles.metaLine}>{t('challengeLab.reading.othersHint')}</p>
            <div className={styles.readingGrid}>{others.map(renderProblem)}</div>
          </section>
        ) : null}
        {renderReadyFooter({ doneLabel: t('challengeLab.reading.doneReading') })}
      </section>
    );
  }

  function renderSolutionList({ candidates = null } = {}) {
    const list = (lab?.solutions || []).filter((item) => !candidates || candidates.includes(item.id));
    if (list.length === 0) return <p className={styles.emptyHint}>{t('challengeLab.noSolutionsYet')}</p>;
    return (
      <div className={styles.listGrid}>
        {list.map((item) => (
          <article key={item.id} className={styles.voteCard}>
            <p className={styles.solutionText}>{item.text}</p>
            {item.rationale ? (
              <p className={styles.rationale}>
                <span className={styles.fieldLabel}>{t('challengeLab.rationaleLabel')}</span>
                {item.rationale}
              </p>
            ) : null}
            <span className={styles.badge}>
              {item.mine ? t('challengeLab.you') : item.author_id ? nameOf(item.author_id) : t('challengeLab.anonymous')}
            </span>
          </article>
        ))}
      </div>
    );
  }

  function renderSolutionReading() {
    return (
      <section className={styles.card}>
        {renderSolutionList()}
        {renderReadyFooter({ doneLabel: t('challengeLab.reading.doneReading') })}
      </section>
    );
  }

  function renderTiebreakDebate() {
    const candidates = lab?.[`${track}_vote`]?.candidates || [];
    return (
      <section className={styles.card}>
        <p className={styles.metaLine}>{t('challengeLab.chatHint')}</p>
        {renderLastResult(track)}
        {track === 'solution' ? renderSolutionList({ candidates }) : null}
      </section>
    );
  }

  function renderVote() {
    const vote = lab?.[`${track}_vote`] || {};
    const total = limits.vote_points || 3;
    const submitted = Boolean(vote.my_allocation);
    const allocation = submitted ? vote.my_allocation : voteDraft;
    const used = sumPoints(allocation);
    const eligible = new Set(vote.eligible || []);
    const rosterSize = (lab?.roster || []).length;
    const change = (id, delta) => setVoteDraft((prev) => {
      const next = Math.max(0, (Number(prev[id]) || 0) + delta);
      if (delta > 0 && sumPoints(prev) >= total) return prev;
      return { ...prev, [id]: next };
    });
    return (
      <section className={styles.card}>
        {!isHost && !submitted ? <p className={styles.voteGuidance}>{t('challengeLab.votePointsLeft', { left: total - used, total })}</p> : null}
        {!isHost && eligible.size === 0 ? <p className={styles.emptyHint}>{t('challengeLab.noEligible')}</p> : null}
        <div className={styles.listGrid}>
          {(vote.candidates || []).map((id) => {
            const points = Number(allocation?.[id]) || 0;
            const own = !eligible.has(id);
            const label = candidateLabel(id, track);
            return (
              <article key={id} className={styles.voteCard}>
                <div>
                  <strong>{label}</strong>
                  {track === 'problem' ? <p>{t(`challengeLab.catalog.${id}.description`)}</p> : null}
                  {track === 'solution' && solutionsById.get(id)?.rationale ? <p className={styles.rationale}>{solutionsById.get(id).rationale}</p> : null}
                  {track === 'problem' && (lab?.arguments_by_problem?.[id] || []).length > 0 ? (
                    <details className={styles.argumentDetails}>
                      <summary>{t('challengeLab.reading.argumentsCount', { count: lab.arguments_by_problem[id].length })}</summary>
                      {renderArgumentList(lab.arguments_by_problem[id])}
                    </details>
                  ) : null}
                </div>
                {!isHost ? (
                  own ? <span className={styles.badge}>{t('challengeLab.ownProposal')}</span> : (
                    <div className={styles.pointsControl}>
                      <button type="button" className={styles.ghostBtn} aria-label={`${t('challengeLab.removePoint')} : ${label}`} disabled={!canAct || submitted || points === 0} onClick={() => change(id, -1)}>−</button>
                      <span className={styles.pointsValue} aria-live="polite">{t('challengeLab.points', { count: points })}</span>
                      <button type="button" className={styles.ghostBtn} aria-label={`${t('challengeLab.addPoint')} : ${label}`} disabled={!canAct || submitted || used >= total} onClick={() => change(id, 1)}>+</button>
                    </div>
                  )
                ) : null}
              </article>
            );
          })}
        </div>
        {submitted || isHost ? (
          <p className={styles.voteFeedback} role="status">{t('challengeLab.voteSubmitted', { count: vote.submitted_count || 0, total: rosterSize })}</p>
        ) : (
          <button type="button" className={styles.primaryBtn} disabled={!canAct || used === 0} onClick={() => send('lab.vote.submit', { allocation: voteDraft })}>
            {t('challengeLab.submitVote')}
          </button>
        )}
      </section>
    );
  }

  function renderDecision() {
    const candidates = lab?.[`${track}_vote`]?.candidates || [];
    const multiple = track === 'solution';
    const toggle = (id) => setDecisionIds((prev) => {
      if (!multiple) return [id];
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
    return (
      <section className={styles.card}>
        {renderLastResult(track)}
        {isHost ? (
          <>
            <p className={styles.voteGuidance}>{multiple ? t('challengeLab.decisionHostMerge') : t('challengeLab.decisionHost')}</p>
            <div className={styles.compactList}>
              {candidates.map((id) => (
                <label key={id} className={styles.checkboxRow}>
                  <input type={multiple ? 'checkbox' : 'radio'} name="lab-decision" checked={decisionIds.includes(id)} onChange={() => toggle(id)} />
                  <span>{candidateLabel(id, track)}</span>
                </label>
              ))}
            </div>
            <button type="button" className={styles.primaryBtn} disabled={decisionIds.length === 0 || !isRunning} onClick={() => send('lab.host.decide', { ids: decisionIds })}>
              {t('challengeLab.confirmDecision')}
            </button>
          </>
        ) : <p className={styles.voteGuidance}>{t('challengeLab.decisionWait')}</p>}
      </section>
    );
  }

  function renderSolutionSubmit() {
    const max = limits.max_solutions || 2;
    const textMax = limits.text_max_length || 200;
    const mine = (lab?.solutions || []).filter((item) => item.mine);
    const submitSolution = () => {
      if (send('lab.solution.submit', { text: solutionText.trim(), rationale: solutionRationale.trim() })) {
        setSolutionText('');
        setSolutionRationale('');
      }
    };
    return (
      <section className={styles.card}>
        {!isHost ? (
          <div className={styles.inputGrid}>
            <div className={styles.textAreaWrap}>
              <textarea className={styles.textArea} value={solutionText} maxLength={textMax} disabled={!canAct || mine.length >= max} onChange={(event) => setSolutionText(event.target.value)} placeholder={t('challengeLab.solutionPlaceholder', { max: textMax })} aria-label={t('challengeLab.solutionPlaceholder', { max: textMax })} />
              <span className={styles.charCount}>{solutionText.length}/{textMax}</span>
            </div>
            <label className={styles.textAreaWrap}>
              <span className={styles.fieldLabel}>{t('challengeLab.solutionRationale')}</span>
              <textarea className={styles.textArea} value={solutionRationale} maxLength={textMax} disabled={!canAct || mine.length >= max} onChange={(event) => setSolutionRationale(event.target.value)} placeholder={t('challengeLab.solutionRationalePlaceholder', { max: textMax })} />
              <span className={styles.charCount}>{solutionRationale.length}/{textMax}</span>
            </label>
            <button type="button" className={styles.primaryBtn} disabled={!canAct || !solutionText.trim() || mine.length >= max} onClick={submitSolution}>{t('challengeLab.add')}</button>
            <section className={styles.listCard}>
              <h3>{t('challengeLab.mySolutions', { count: mine.length, max })}</h3>
              {mine.map((item) => (
                <article key={item.id} className={styles.compactRow}>
                  <div>
                    <strong>{item.text}</strong>
                    {item.rationale ? <p>{item.rationale}</p> : null}
                  </div>
                  <button type="button" className={styles.ghostBtn} disabled={!canAct} onClick={() => send('lab.solution.delete', { solution_id: item.id })}>{t('challengeLab.delete')}</button>
                </article>
              ))}
            </section>
          </div>
        ) : null}
        <section className={styles.listCard}>
          <h3>{t('challengeLab.allSolutions')}</h3>
          {renderSolutionList()}
        </section>
        {renderReadyFooter()}
      </section>
    );
  }

  function renderDeployment() {
    const max = limits.max_steps || 5;
    const textMax = limits.text_max_length || 200;
    const steps = lab?.steps || [];
    const mine = steps.filter((item) => item.mine);
    const valid = stepDraft.text.trim() && stepDraft.risk_level && stepDraft.budget_level && stepDraft.delay;
    const update = (field) => (event) => setStepDraft((prev) => ({ ...prev, [field]: event.target.value }));
    const toggleResource = (item) => setStepDraft((prev) => ({
      ...prev,
      resources: prev.resources.includes(item) ? prev.resources.filter((value) => value !== item) : [...prev.resources, item]
    }));
    const submitStep = () => {
      if (send('lab.step.submit', stepDraft)) setStepDraft(EMPTY_STEP);
    };
    const select = (field, values, prefix, label) => (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{label}</span>
        <select className={styles.select} value={stepDraft[field]} onChange={update(field)} disabled={!canAct}>
          {field !== 'stakeholder_type' ? <option value="">{t('challengeLab.choose')}</option> : null}
          {values.map((value) => <option key={value} value={value}>{t(`${prefix}.${value}`)}</option>)}
        </select>
      </label>
    );
    return (
      <section className={styles.card}>
        {!isHost ? (
          <div className={styles.stepForm}>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.fieldLabel}>{t('challengeLab.step.text')} *</span>
              <input className={styles.select} value={stepDraft.text} maxLength={textMax} onChange={update('text')} disabled={!canAct} placeholder={t('challengeLab.step.textPlaceholder')} />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.fieldLabel}>{t('challengeLab.step.risk')}</span>
              <input className={styles.select} value={stepDraft.risk} maxLength={textMax} onChange={update('risk')} disabled={!canAct} placeholder={t('challengeLab.step.riskPlaceholder')} />
            </label>
            {select('risk_level', LEVELS, 'challengeLab.levels', `${t('challengeLab.step.riskLevel')} *`)}
            {select('budget_level', LEVELS, 'challengeLab.levels', `${t('challengeLab.step.budget')} *`)}
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('challengeLab.step.budgetAmount')}</span>
              <input className={styles.select} type="number" min="0" inputMode="numeric" value={stepDraft.budget_amount} onChange={update('budget_amount')} disabled={!canAct} />
            </label>
            {select('delay', DELAYS, 'challengeLab.delays', `${t('challengeLab.step.delay')} *`)}
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t('challengeLab.step.stakeholder')}</span>
              <input className={styles.select} value={stepDraft.stakeholder} maxLength={120} onChange={update('stakeholder')} disabled={!canAct} placeholder={t('challengeLab.step.stakeholderPlaceholder')} />
            </label>
            {select('stakeholder_type', STAKEHOLDER_TYPES, 'challengeLab.stakeholderTypes', t('challengeLab.step.stakeholderType'))}
            <fieldset className={`${styles.field} ${styles.fieldWide} ${styles.fieldset}`}>
              <legend className={styles.fieldLabel}>{t('challengeLab.step.resources')}</legend>
              <div className={styles.chipRow}>
                {RESOURCE_TYPES.map((item) => (
                  <label key={item} className={styles.checkboxRow}>
                    <input type="checkbox" checked={stepDraft.resources.includes(item)} onChange={() => toggleResource(item)} disabled={!canAct} />
                    <span>{t(`challengeLab.resourceTypes.${item}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.fieldLabel}>{t('challengeLab.step.resourcesDetail')}</span>
              <input className={styles.select} value={stepDraft.resources_detail} maxLength={textMax} onChange={update('resources_detail')} disabled={!canAct} />
            </label>
            {!valid ? <p className={`${styles.fieldHint} ${styles.fieldWide}`}>{t('challengeLab.step.required')}</p> : null}
            <button type="button" className={`${styles.primaryBtn} ${styles.fieldWide}`} disabled={!canAct || !valid || mine.length >= max} onClick={submitStep}>
              {t('challengeLab.step.addStep')} ({t('challengeLab.step.mySteps', { count: mine.length, max })})
            </button>
          </div>
        ) : null}
        <section className={styles.listCard}>
          <h3>{t('challengeLab.step.allSteps')}</h3>
          {steps.length === 0 ? <p className={styles.emptyHint}>{t('challengeLab.step.noStepsYet')}</p> : null}
          <div className={styles.compactList}>
            {steps.map((step) => renderStepCard(step, {
              controls: step.mine && !isHost
                ? <button type="button" className={styles.ghostBtn} disabled={!canAct} onClick={() => send('lab.step.delete', { step_id: step.id })}>{t('challengeLab.delete')}</button>
                : <span className={styles.metaLine}>{nameOf(step.author_id)}</span>
            }))}
          </div>
        </section>
        {renderReadyFooter()}
      </section>
    );
  }

  function renderMerge() {
    const order = lab?.merged_step_ids || [];
    const removed = new Set(lab?.removed_step_ids || []);
    return (
      <section className={styles.card}>
        <p className={styles.voteGuidance}>{isHost ? t('challengeLab.merge.hostHint') : t('challengeLab.merge.participantHint')}</p>
        <div className={styles.compactList}>
          {order.map((id, index) => {
            const step = stepsById.get(id);
            if (!step) return null;
            const isRemoved = removed.has(id);
            return renderStepCard(step, {
              index,
              removed: isRemoved,
              controls: isHost ? (
                <div className={styles.cardActions}>
                  <button type="button" className={styles.ghostBtn} disabled={!isRunning || index === 0} onClick={() => send('lab.host.merge.move', { step_id: id, direction: 'up' })}>{t('challengeLab.merge.up')}</button>
                  <button type="button" className={styles.ghostBtn} disabled={!isRunning || index === order.length - 1} onClick={() => send('lab.host.merge.move', { step_id: id, direction: 'down' })}>{t('challengeLab.merge.down')}</button>
                  <button type="button" className={styles.ghostBtn} disabled={!isRunning} onClick={() => send('lab.host.merge.toggle', { step_id: id })}>{isRemoved ? t('challengeLab.merge.restore') : t('challengeLab.merge.remove')}</button>
                </div>
              ) : null
            });
          })}
        </div>
        {isHost ? <button type="button" className={styles.primaryBtn} disabled={!isRunning} onClick={() => send('lab.host.merge.validate')}>{t('challengeLab.merge.validate')}</button> : null}
      </section>
    );
  }

  // The weakest measured component drives the advice shown under an indicator.
  function weakestComponent(indicator) {
    const measured = Object.entries(indicator?.components || {}).filter(([, value]) => Number.isFinite(value));
    if (measured.length === 0) return null;
    const [key, value] = measured.reduce((low, item) => (item[1] < low[1] ? item : low));
    return value < 70 ? key : null;
  }

  function buildFicheText(result) {
    const insight = result.problem_id ? `challengeLab.insights.${result.problem_id}` : null;
    const indicators = Object.entries(result.indicators || {});
    const lines = [
      `${t('challengeLab.fiche.problem')} : ${result.problem_id ? problemTitle(result.problem_id) : '-'}`,
      `${t('challengeLab.fiche.solution')} : ${result.solutions.map((item) => item.text).join(' + ') || '-'}`,
      ...result.solutions.filter((item) => item.rationale).map((item) => `${t('challengeLab.rationaleLabel')} : ${item.rationale}`),
      '',
      `${t('challengeLab.fiche.plan')} :`,
      ...result.steps.map((step, index) => `${index + 1}. ${step.text} — ${t(`challengeLab.delays.${step.delay}`)}, ${t('challengeLab.step.riskLevel')} ${t(`challengeLab.levels.${step.risk_level}`)}, ${t('challengeLab.step.budget')} ${t(`challengeLab.levels.${step.budget_level}`)}${Number.isFinite(step.budget_amount) ? ` (${formatNumber(step.budget_amount, locale)})` : ''}${step.stakeholder ? `, ${step.stakeholder}` : ''}${step.risk ? ` — ${t('challengeLab.step.risk')} : ${step.risk}` : ''}`),
      '',
      `${t('challengeLab.fiche.budget')} : ${t('challengeLab.fiche.budgetByLevel', result.budget.by_level)}`,
      result.budget.amount_count > 0 ? t('challengeLab.fiche.amountTotal', { amount: formatNumber(result.budget.amount_total, locale), count: result.budget.amount_count }) : '',
      result.stakeholders.length > 0 ? `${t('challengeLab.fiche.stakeholders')} : ${result.stakeholders.join(', ')}` : '',
      '',
      ...(insight ? [
        `${t('challengeLab.debrief.approachTitle')} : ${t(`${insight}.approach`)}`,
        ...[1, 2, 3].map((index) => `- ${t(`${insight}.practice${index}`)}`),
        t('challengeLab.debrief.inspiredBy', { reference: t(`${insight}.reference`) })
      ] : []),
      '',
      ...(result.plan_checks || []).map((check) => `! ${t(`challengeLab.planChecks.${check.key}`, { count: check.count })}`),
      '',
      ...indicators.map(([key, value]) => `${t(`challengeLab.indicators.${key}.title`)} : ${Number.isFinite(value.score) ? t('challengeLab.debrief.scoreOutOf', { score: value.score }) : t('challengeLab.debrief.notMeasured')}`)
    ];
    return lines.filter((line, index, all) => line !== '' || (all[index - 1] !== '' && index > 0)).join('\n');
  }

  async function copyFiche(result) {
    try {
      await navigator.clipboard.writeText(buildFicheText(result));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function exportReport(result) {
    const html = buildLabReportHtml({
      result,
      t,
      locale,
      title: rulesProps.challengeName,
      fullName: (id) => names.get(id) || t('challengeLab.anonymous'),
      stats: lab?.stats
    });
    setExportBlocked(!openLabReport(html));
  }

  // One horizontal bar per option, scaled on the best score of the list.
  function renderVoteBars(items, { labelOf, renderDetails, retainedLabel }) {
    const max = Math.max(1, ...items.map((item) => item.points || 0));
    return (
      <ol className={styles.voteBars}>
        {items.map((item) => {
          const voted = Number.isFinite(item.points);
          return (
            <li key={item.key} className={`${styles.voteBarRow}${item.retained ? ` ${styles.voteBarRetained}` : ''}`}>
              <div className={styles.voteBarHead}>
                <strong>{labelOf(item)}</strong>
                {item.retained ? <span className={styles.badge}>{retainedLabel}</span> : null}
                <span className={styles.voteBarValue}>{voted ? t('challengeLab.points', { count: item.points }) : t('challengeLab.debrief.notVoted')}</span>
              </div>
              {voted ? (
                <span className={styles.voteBarTrack} aria-hidden="true">
                  <span className={styles.voteBarFill} style={{ width: `${(item.points / max) * 100}%` }} />
                </span>
              ) : null}
              {renderDetails(item)}
            </li>
          );
        })}
      </ol>
    );
  }

  function renderFiche() {
    const result = lab?.result || state?.summary?.lab_result;
    if (!result) return null;
    const problems = result.problem_choices || [];
    const solutions = result.solutions_proposed || [];
    const insight = result.problem_id ? `challengeLab.insights.${result.problem_id}` : null;
    return (
      <section className={`${styles.card} ${styles.debrief}`} data-debrief-content>
        <div className={styles.debriefTop}>
          <h2 className={styles.sectionTitle}>{t('challengeLab.debrief.resultTitle')}</h2>
          <div className={styles.cardActions}>
            {isHost ? <button type="button" className={styles.primaryBtn} onClick={() => exportReport(result)} title={t('challengeLab.debrief.exportHint')}>{t('challengeLab.debrief.export')}</button> : null}
            <button type="button" className={styles.ghostBtn} onClick={() => copyFiche(result)}>{t('challengeLab.fiche.copy')}</button>
          </div>
        </div>
        {copied ? <p className={styles.voteFeedback} role="status">{t('challengeLab.fiche.copied')}</p> : null}
        {exportBlocked ? <p className={styles.errorBanner} role="alert">{t('challengeLab.debrief.exportBlocked')}</p> : null}

        <div className={styles.decisionFlow}>
          <article className={styles.decisionCard} data-category={catalogById.get(result.problem_id)?.category}>
            <span className={styles.voteHeroLabel}>{t('challengeLab.retainedProblem')}</span>
            {result.problem_id ? (
              <>
                {renderCategoryChip(result.problem_id)}
                <strong>{problemTitle(result.problem_id)}</strong>
                <p className={styles.metaLine}>{t(`challengeLab.catalog.${result.problem_id}.description`)}</p>
                {result.problem_decided_by ? <span className={styles.decidedBy}>{t(`challengeLab.decidedBy.${result.problem_decided_by}`)}</span> : null}
              </>
            ) : <p className={styles.emptyHint}>-</p>}
          </article>
          <article className={styles.decisionCard}>
            <span className={styles.voteHeroLabel}>{t('challengeLab.retainedSolution')}</span>
            {result.solutions.length === 0 ? <p className={styles.emptyHint}>{t('challengeLab.fiche.noSolution')}</p> : null}
            {result.solutions.map((item) => (
              <div key={item.id} className={styles.decisionSolution}>
                <strong>{item.text}</strong>
                {item.rationale ? <p className={styles.rationale}>{item.rationale}</p> : null}
                <span className={styles.metaLine}>{t('challengeLab.proposedBy', { name: nameOf(item.author_id) })}</span>
              </div>
            ))}
            {result.solution_decided_by ? <span className={styles.decidedBy}>{t(`challengeLab.decidedBy.${result.solution_decided_by}`)}</span> : null}
          </article>
        </div>

        <div className={styles.keyFigures} data-debrief-metrics>
          <article className={styles.statTile}>
            <strong>{result.steps.length}</strong>
            <span>{t('challengeLab.debrief.stepsCount')}</span>
          </article>
          <article className={styles.statTile}>
            <strong>{t('challengeLab.fiche.budgetByLevel', result.budget.by_level)}</strong>
            <span>{t('challengeLab.fiche.budget')}</span>
            {result.budget.amount_count > 0 ? <span>{t('challengeLab.fiche.amountTotal', { amount: formatNumber(result.budget.amount_total, locale), count: result.budget.amount_count })}</span> : null}
          </article>
          <article className={styles.statTile}>
            <strong>{result.high_risk_count}</strong>
            <span>{t('challengeLab.debrief.highRiskLabel')}</span>
          </article>
          <article className={styles.statTile}>
            <strong>{result.stakeholders.length}</strong>
            <span>{t('challengeLab.fiche.stakeholders')}{result.stakeholders.length ? ` : ${result.stakeholders.join(', ')}` : ''}</span>
          </article>
          {lab?.stats ? (
            <article className={styles.statTile}>
              <strong>{formatNumber(lab.stats.participation_rate / 100, locale, { style: 'percent' })}</strong>
              <span>{t('challengeLab.debrief.participationLabel')}</span>
            </article>
          ) : null}
        </div>

        {insight || result.steps.length > 0 ? (
          <section className={`${styles.listCard} ${styles.insightCard}`}>
            <h3>{t('challengeLab.debrief.recommendationsTitle')}</h3>
            <div className={styles.recommendGrid}>
              {insight ? (
                <div>
                  <span className={styles.fieldLabel}>{t('challengeLab.debrief.approachTitle')}</span>
                  <p><strong>{t(`${insight}.approach`)}</strong></p>
                  <span className={styles.fieldLabel}>{t('challengeLab.debrief.practicesTitle')}</span>
                  <ul className={styles.practiceList}>
                    {[1, 2, 3].map((index) => <li key={index}>{t(`${insight}.practice${index}`)}</li>)}
                  </ul>
                  <p className={styles.categoryRef}>{t('challengeLab.debrief.inspiredBy', { reference: t(`${insight}.reference`) })}</p>
                  <p className={styles.categoryRef}>{t('challengeLab.debrief.approachDisclaimer')}</p>
                </div>
              ) : null}
              {result.steps.length > 0 && Array.isArray(result.plan_checks) ? (
                <div>
                  <span className={styles.fieldLabel}>{t('challengeLab.debrief.planChecksTitle')}</span>
                  {result.plan_checks.length === 0 ? <p className={styles.metaLine}>{t('challengeLab.debrief.planChecksNone')}</p> : (
                    <ul className={styles.checkList}>
                      {result.plan_checks.map((check) => <li key={check.key}>{t(`challengeLab.planChecks.${check.key}`, { count: check.count })}</li>)}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {problems.length > 0 || solutions.length > 0 ? (
          <section className={styles.listCard}>
            <h3>{t('challengeLab.debrief.journeyTitle')}</h3>
            <p className={styles.metaLine}>{t('challengeLab.debrief.votePointsHint')}</p>
            <div className={styles.journeyGrid}>
              {problems.length > 0 ? (
                <div>
                  <span className={styles.fieldLabel}>{t('challengeLab.debrief.problemsTitle')}</span>
                  {renderVoteBars(problems.map((item) => ({ ...item, key: item.problem_id })), {
                    labelOf: (item) => problemTitle(item.problem_id),
                    retainedLabel: t('challengeLab.debrief.retainedProblemBadge'),
                    renderDetails: (item) => (
                      <details className={styles.argumentDetails}>
                        <summary>{t('challengeLab.picksBadge', { count: item.picks })} · {t('challengeLab.reading.argumentsCount', { count: item.arguments.length })}</summary>
                        {renderArgumentList(item.arguments)}
                      </details>
                    )
                  })}
                </div>
              ) : null}
              {solutions.length > 0 ? (
                <div>
                  <span className={styles.fieldLabel}>{t('challengeLab.debrief.solutionsTitle')}</span>
                  {renderVoteBars(solutions.map((item) => ({ ...item, key: item.id })), {
                    labelOf: (item) => item.text,
                    retainedLabel: t('challengeLab.debrief.retainedSolutionBadge'),
                    renderDetails: (item) => (
                      <p className={styles.rationale}>
                        {item.rationale || t('challengeLab.debrief.noRationale')}
                        <span className={styles.argumentAuthor}>{nameOf(item.author_id)}</span>
                      </p>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className={styles.listCard}>
          <h3>{t('challengeLab.fiche.plan')}</h3>
          {result.steps.length === 0 ? <p className={styles.emptyHint}>{t('challengeLab.fiche.noSteps')}</p> : null}
          <div className={styles.compactList}>
            {result.steps.map((step, index) => renderStepCard(step, { index }))}
          </div>
        </section>

        {result.indicators ? (
          <section className={styles.listCard}>
            <h3>{t('challengeLab.debrief.indicatorsTitle')}</h3>
            <p className={styles.metaLine}>{t('challengeLab.debrief.indicatorsNote')}</p>
            <div className={styles.indicatorGrid}>
              {Object.entries(result.indicators).map(([key, indicator]) => {
                const weakest = weakestComponent(indicator);
                const measured = Number.isFinite(indicator.score);
                return (
                  <article key={key} className={styles.indicatorCard}>
                    <span className={styles.voteHeroLabel}>{t(`challengeLab.indicators.${key}.title`)}</span>
                    <strong className={styles.indicatorScore}>{measured ? t('challengeLab.debrief.scoreOutOf', { score: indicator.score }) : t('challengeLab.debrief.notMeasured')}</strong>
                    {measured ? <span className={styles.indicatorBar} aria-hidden="true"><span style={{ width: `${indicator.score}%` }} /></span> : null}
                    <p className={styles.metaLine}>{t(`challengeLab.indicators.${key}.what`)}</p>
                    {weakest ? <p className={styles.fieldHint}>{t('challengeLab.debrief.tip', { tip: t(`challengeLab.indicators.${key}.tips.${weakest}`) })}</p> : null}
                    <details className={styles.indicatorDetails}>
                      <summary>{t('challengeLab.debrief.howComputed')}</summary>
                      <ul>
                        {Object.entries(indicator.components || {}).map(([part, value]) => (
                          <li key={part}>
                            <span>{t(`challengeLab.indicators.${key}.components.${part}`)}</span>
                            <strong>{Number.isFinite(value) ? t('challengeLab.debrief.scoreOutOf', { score: value }) : t('challengeLab.debrief.notMeasured')}</strong>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  function renderPhase() {
    if (!lab) return null;
    if (phase === 'problem_select') return renderProblemSelect();
    if (phase === 'problem_argue') return renderArgue();
    if (phase === 'problem_defense') return renderProblemReading();
    if (isReadingPhase(phase)) return renderSolutionReading();
    if (phase.endsWith('_tiebreak_debate')) return renderTiebreakDebate();
    if (isVotePhase(phase)) return renderVote();
    if (phase.endsWith('_decision')) return renderDecision();
    if (phase === 'solution_submit') return renderSolutionSubmit();
    if (phase === 'deployment') return renderDeployment();
    if (phase === 'merge') return renderMerge();
    return null;
  }

  const hostControls = isHost && hasStarted && !isDebrief && lab ? (
    <section className={styles.card}>
      <h3 className={styles.sectionTitle}>{t('challengeLab.host.controls')}</h3>
      <p className={styles.facilitatorNote}>{t('challengeLab.host.observer')}</p>
      <div className={styles.cardActions}>
        <button type="button" className={styles.ghostBtn} disabled={!isRunning} onClick={() => send('lab.host.extend')}>{t('challengeLab.host.extend')}</button>
        <button type="button" className={styles.primaryBtn} disabled={!isRunning} onClick={() => send('lab.host.next')}>{t('challengeLab.host.next')}</button>
      </div>
    </section>
  ) : null;

  const timerCard = (
    <ChallengeTimerCard
      isStarted={hasStarted}
      title={t('challengeLab.timer')}
      remainingSeconds={remainingSeconds}
      durationSeconds={durationSeconds}
      status={hasStarted ? timerStatus : 'idle'}
      isFacilitator={isFacilitator}
      onPause={timerControls.pause}
      onResume={timerControls.resume}
      controlPending={timerControls.busy}
      controlFeedback={timerControls.feedback}
      waitingText={t('challengeLab.waitingForFacilitatorToStart')}
    />
  );

  return (
    <ChallengePresentation className={styles.shell} isDebrief={isDebrief}>
      <ChallengeHeader
        title={rulesProps.challengeName}
        subtitle={rulesPreset?.subtitle || ''}
        timer={hasStarted && !isDebrief ? { remainingSeconds } : null}
        headerAction={hasStarted ? (
          <ChallengeRulesPanel inHeader isStarted={hasStarted} isFacilitator={isFacilitator} showPrestartCard={false} {...rulesProps} />
        ) : null}
      />

      <div className="challenge-mobile-timer">{!isDebrief ? timerCard : null}</div>

      {errorText ? <p className={styles.errorBanner} role="alert">{errorText}</p> : null}

      <div className={styles.layout} data-challenge-layout>
        <main className={styles.mainColumn}>
          {!hasStarted ? (
            <section className={styles.card}>
              <ChallengeRulesPanel
                isStarted={false}
                isFacilitator={isFacilitator}
                {...rulesProps}
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
                    {isDebrief ? <ChallengeDebriefHeading /> : <h2 className={styles.phaseTitle}>{t(`challengeLab.phaseTitle.${phase}`)}</h2>}
                    {!isDebrief ? (
                      <p className={styles.phaseGuidance}>
                        {t(`challengeLab.phaseHint.${phase}`, {
                          max: phase === 'deployment' ? limits.max_steps : phase === 'solution_submit' ? limits.max_solutions : limits.max_problem_picks,
                          points: limits.vote_points
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
                {!isDebrief && lab ? renderProgress() : null}
                {!connected ? <p role="alert">{t('challengeLab.connectionInterrupted')}</p> : null}
                {!isDebrief && timerStatus === 'paused' ? <p role="status">{t('challengeLab.pausedNotice')}</p> : null}
              </section>

              {!isDebrief ? renderRetained() : null}
              {isDebrief ? renderFiche() : renderPhase()}
            </>
          )}
        </main>

        <aside className={styles.sideColumn}>
          <div className="challenge-desktop-timer">{!isDebrief ? timerCard : null}</div>
          {hostControls}
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
