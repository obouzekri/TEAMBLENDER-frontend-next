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
import styles from './LabDInnovation.module.css';

const LEVELS = ['low', 'medium', 'high'];
const DELAYS = ['short', 'medium', 'long'];
const STAKEHOLDER_TYPES = ['internal', 'external'];
const RESOURCE_TYPES = ['human', 'material', 'tools', 'skills'];
const EMPTY_STEP = {
  text: '', risk: '', risk_level: '', budget_level: '', budget_amount: '', delay: '',
  stakeholder: '', stakeholder_type: 'internal', resources: [], resources_detail: ''
};

function isTurnPhase(phase) {
  return /_defense$/.test(phase);
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
  const [stepDraft, setStepDraft] = useState(EMPTY_STEP);
  const [copied, setCopied] = useState(false);

  // A new stage (phase or turn) starts with a clean vote and decision draft.
  const stageSeq = lab?.stage_seq;
  useEffect(() => {
    setVoteDraft({});
    setDecisionIds([]);
  }, [stageSeq]);

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

  function renderReadyFooter() {
    const ready = lab?.ready || {};
    return (
      <div className={styles.readyRow}>
        <span className={styles.metaLine}>{t('challengeLab.readyCount', { count: ready.count || 0, total: ready.total || 0 })}</span>
        {!isHost ? (
          <button type="button" className={ready.me ? styles.ghostBtn : styles.primaryBtn} disabled={!canAct} onClick={() => send('lab.ready', { ready: !ready.me })}>
            {ready.me ? t('challengeLab.editAgain') : t('challengeLab.imDone')}
          </button>
        ) : null}
      </div>
    );
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
    const categories = [];
    (lab?.catalog || []).forEach((item) => {
      if (!categories.includes(item.category)) categories.push(item.category);
    });
    return (
      <section className={styles.card}>
        {!isHost ? <p className={styles.voteGuidance}>{t('challengeLab.pickCount', { count: picks.length, max })}</p> : null}
        {categories.map((category) => (
          <div key={category} className={styles.categoryBlock}>
            <div className={styles.categoryHeader}>
              <h3>{t(`challengeLab.categories.${category}`)}</h3>
              <span className={styles.categoryRef}>{t(`challengeLab.categoryReferences.${category}`)}</span>
            </div>
            <div className={styles.problemGrid}>
              {lab.catalog.filter((item) => item.category === category).map((item) => {
                const picked = picks.includes(item.id);
                return (
                  <article key={item.id} className={`${styles.problemCard}${picked ? ` ${styles.problemCardPicked}` : ''}`}>
                    <strong>{problemTitle(item.id)}</strong>
                    <p>{t(`challengeLab.catalog.${item.id}.description`)}</p>
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
          </div>
        ))}
        {renderReadyFooter()}
      </section>
    );
  }

  function renderTurnBanner() {
    const turn = lab?.turn;
    if (!turn) return null;
    const speaker = turn.speaker_id;
    const next = turn.order[turn.index + 1];
    const myTurn = speaker === me;
    return (
      <section className={`${styles.turnBanner}${myTurn ? ` ${styles.turnBannerMine}` : ''}`} role="status">
        <div>
          <span className={styles.voteHeroLabel}>{t('challengeLab.turnProgress', { index: turn.index + 1, total: turn.order.length })}</span>
          <strong>{myTurn ? t('challengeLab.yourTurn') : t('challengeLab.speakingNow', { name: nameOf(speaker) })}</strong>
          {next ? <span className={styles.metaLine}>{t('challengeLab.upNext', { name: nameOf(next) })}</span> : null}
          <span className={styles.metaLine}>{t('challengeLab.chatHint')}</span>
        </div>
        {myTurn ? <button type="button" className={styles.primaryBtn} disabled={!canAct} onClick={() => send('lab.turn.pass')}>{t('challengeLab.pass')}</button> : null}
      </section>
    );
  }

  function renderShortlist() {
    const counts = lab?.pick_counts || {};
    const candidates = lab?.problem_vote?.candidates?.length ? lab.problem_vote.candidates : lab?.shortlist || [];
    return (
      <section className={styles.listCard}>
        <h3>{t('challengeLab.shortlistTitle')}</h3>
        <div className={styles.compactList}>
          {candidates.map((id) => (
            <article key={id} className={styles.compactRow}>
              <span className={styles.rankBadge}>{t('challengeLab.picksBadge', { count: counts[id] || 0 })}</span>
              <div>
                <strong>{problemTitle(id)}</strong>
                <p>{t(`challengeLab.catalog.${id}.description`)}</p>
              </div>
            </article>
          ))}
        </div>
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
            <p>{item.text}</p>
            <span className={styles.badge}>
              {item.mine ? t('challengeLab.you') : item.author_id ? nameOf(item.author_id) : t('challengeLab.anonymous')}
            </span>
          </article>
        ))}
      </div>
    );
  }

  function renderDefense() {
    return (
      <section className={styles.card}>
        {renderTurnBanner()}
        {track === 'problem' ? renderShortlist() : renderSolutionList()}
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
      if (send('lab.solution.submit', { text: solutionText.trim() })) setSolutionText('');
    };
    return (
      <section className={styles.card}>
        {!isHost ? (
          <div className={styles.inputGrid}>
            <div className={styles.textAreaWrap}>
              <textarea className={styles.textArea} value={solutionText} maxLength={textMax} disabled={!canAct || mine.length >= max} onChange={(event) => setSolutionText(event.target.value)} placeholder={t('challengeLab.solutionPlaceholder', { max: textMax })} aria-label={t('challengeLab.solutionPlaceholder', { max: textMax })} />
              <span className={styles.charCount}>{solutionText.length}/{textMax}</span>
            </div>
            <button type="button" className={styles.primaryBtn} disabled={!canAct || !solutionText.trim() || mine.length >= max} onClick={submitSolution}>{t('challengeLab.add')}</button>
            <section className={styles.listCard}>
              <h3>{t('challengeLab.mySolutions', { count: mine.length, max })}</h3>
              {mine.map((item) => (
                <article key={item.id} className={styles.compactRow}>
                  <div><strong>{item.text}</strong></div>
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

  function buildFicheText(result) {
    const lines = [
      `${t('challengeLab.fiche.problem')} : ${result.problem_id ? problemTitle(result.problem_id) : '-'}`,
      `${t('challengeLab.fiche.solution')} : ${result.solutions.map((item) => item.text).join(' + ') || '-'}`,
      '',
      `${t('challengeLab.fiche.plan')} :`,
      ...result.steps.map((step, index) => `${index + 1}. ${step.text} — ${t(`challengeLab.delays.${step.delay}`)}, ${t('challengeLab.step.riskLevel')} ${t(`challengeLab.levels.${step.risk_level}`)}, ${t('challengeLab.step.budget')} ${t(`challengeLab.levels.${step.budget_level}`)}${Number.isFinite(step.budget_amount) ? ` (${formatNumber(step.budget_amount, locale)})` : ''}${step.stakeholder ? `, ${step.stakeholder}` : ''}${step.risk ? ` — ${t('challengeLab.step.risk')} : ${step.risk}` : ''}`),
      '',
      `${t('challengeLab.fiche.budget')} : ${t('challengeLab.fiche.budgetByLevel', result.budget.by_level)}`,
      result.budget.amount_count > 0 ? t('challengeLab.fiche.amountTotal', { amount: formatNumber(result.budget.amount_total, locale), count: result.budget.amount_count }) : '',
      result.stakeholders.length > 0 ? `${t('challengeLab.fiche.stakeholders')} : ${result.stakeholders.join(', ')}` : ''
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

  function renderFiche() {
    const result = lab?.result || state?.summary?.lab_result;
    if (!result) return null;
    return (
      <section className={styles.card} data-debrief-content>
        <h2 className={styles.sectionTitle}>{t('challengeLab.phaseTitle.done')}</h2>
        <div className={styles.ficheGrid}>
          <div className={styles.listCard}>
            <h3>{t('challengeLab.fiche.problem')}</h3>
            {result.problem_id ? (
              <>
                <strong>{problemTitle(result.problem_id)}</strong>
                <p className={styles.metaLine}>{t(`challengeLab.catalog.${result.problem_id}.description`)}</p>
                {catalogById.get(result.problem_id) ? <p className={styles.categoryRef}>{t(`challengeLab.categories.${catalogById.get(result.problem_id).category}`)}</p> : null}
              </>
            ) : <p className={styles.emptyHint}>-</p>}
          </div>
          <div className={styles.listCard}>
            <h3>{t('challengeLab.fiche.solution')}</h3>
            {result.solutions.length === 0 ? <p className={styles.emptyHint}>{t('challengeLab.fiche.noSolution')}</p> : null}
            {result.solutions.map((item) => (
              <div key={item.id}>
                <strong className={styles.blockText}>{item.text}</strong>
                <span className={styles.metaLine}>{t('challengeLab.proposedBy', { name: nameOf(item.author_id) })}</span>
              </div>
            ))}
            {result.solution_decided_by ? <span className={styles.metaLine}>{t(`challengeLab.decidedBy.${result.solution_decided_by}`)}</span> : null}
          </div>
        </div>
        <section className={styles.listCard}>
          <h3>{t('challengeLab.fiche.plan')}</h3>
          {result.steps.length === 0 ? <p className={styles.emptyHint}>{t('challengeLab.fiche.noSteps')}</p> : null}
          <div className={styles.compactList}>
            {result.steps.map((step, index) => renderStepCard(step, { index }))}
          </div>
        </section>
        <div className={styles.statGrid} data-debrief-metrics>
          <article className={styles.statTile}>
            <strong>{t('challengeLab.fiche.budgetByLevel', result.budget.by_level)}</strong>
            <span>{t('challengeLab.fiche.budget')}</span>
            {result.budget.amount_count > 0 ? <span>{t('challengeLab.fiche.amountTotal', { amount: formatNumber(result.budget.amount_total, locale), count: result.budget.amount_count })}</span> : null}
          </article>
          <article className={styles.statTile}>
            <strong>{result.high_risk_count}</strong>
            <span>{t('challengeLab.fiche.highRisks', { count: result.high_risk_count })}</span>
          </article>
          <article className={styles.statTile}>
            <strong>{result.stakeholders.length}</strong>
            <span>{t('challengeLab.fiche.stakeholders')}{result.stakeholders.length ? ` : ${result.stakeholders.join(', ')}` : ''}</span>
          </article>
        </div>
        {lab?.stats ? <p className={styles.metaLine}>{t('challengeLab.fiche.participation', { rate: lab.stats.participation_rate })}</p> : null}
        <button type="button" className={styles.ghostBtn} onClick={() => copyFiche(result)}>{t('challengeLab.fiche.copy')}</button>
        {copied ? <p className={styles.voteFeedback} role="status">{t('challengeLab.fiche.copied')}</p> : null}
      </section>
    );
  }

  function renderPhase() {
    if (!lab) return null;
    if (phase === 'problem_select') return renderProblemSelect();
    if (isTurnPhase(phase)) return renderDefense();
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
