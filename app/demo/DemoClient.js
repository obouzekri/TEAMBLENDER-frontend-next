'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, PlayCircle, RotateCcw, Users } from 'lucide-react';
import ChallengesCatalog from '@/components/SessionBuilder/ChallengesCatalog';
import SelectedChallengesList from '@/components/SessionBuilder/SelectedChallengesList';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { trackProductEvent } from '@/lib/analytics';
import { mockChallenges } from '@/lib/mockChallenges';
import { localizeBuilderChallenge } from '@/lib/challenges/catalogLocalization';
import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { getChallengeDuration } from '@/lib/sessionProgram.mjs';
import {
  DEMO_AUTO_ADVANCE_SECONDS,
  DEMO_FLOW_MODES,
  DEMO_PAST_SESSIONS,
  DEMO_STEPS,
  DEMO_TEAM_SIZE,
  DEMO_VISITOR_ID,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getDebriefPrompts,
  getDemoParticipants,
  getVisitorContribution,
} from '@/lib/demo/demoScenario.mjs';
import { DEMO_PLAY_ENGINE_KEY, DEMO_PROGRAM_ENGINE_KEYS, createDemoScenario } from '@/lib/demo/challenges/index.mjs';
import ManagerHome from '../home/ManagerHome';
import DemoChallengeStage from './DemoChallengeStage';
import DemoHint from './DemoHint';
import styles from './Demo.module.css';
import { pickLocalized } from '@/lib/i18n';

const INVITE_HOST = getPublicSiteOrigin().replace(/^https?:\/\//, '');
const HINTS_HIDDEN_KEY = 'demo-hints-hidden';
const NO_CATALOG_FILTERS = { categories: [], objectives: [], duration: '' };

function track(action, context = {}) {
  trackProductEvent('demo', action, context);
}

function OptionGroup({ label, options, value, onChange, hint }) {
  return (
    <fieldset className={styles.optionGroup}>
      <legend className={styles.optionLegend}>{label}</legend>
      <div className={styles.optionList}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.optionChip}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
    </fieldset>
  );
}

function Avatar({ name }) {
  return <span className={styles.avatar} aria-hidden="true">{name.charAt(0)}</span>;
}

export default function DemoClient() {
  const { locale, t, withLocalePath } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [sessionName, setSessionName] = useState(() => t('demo.prepare.sessionNameDefault'));
  const [flowMode, setFlowMode] = useState('manual');
  const [program, setProgram] = useState([]);
  const [joinedCount, setJoinedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeDone, setActiveDone] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [completions, setCompletions] = useState({});
  const [challengeActions, setChallengeActions] = useState({});
  const [visitorResult, setVisitorResult] = useState(null);
  const [playDone, setPlayDone] = useState(false);
  const [hintsHidden, setHintsHidden] = useState(false);
  const headingRef = useRef(null);
  const hasMountedRef = useRef(false);
  const advanceRef = useRef(() => {});

  const step = DEMO_STEPS[stepIndex];
  const activeChallenge = program[activeIndex] || null;
  const displayedSessionName = sessionName.trim() || t('demo.prepare.sessionNameDefault');

  const catalog = useMemo(
    () => mockChallenges.map((challenge) => localizeBuilderChallenge(challenge, locale)),
    [locale]
  );
  // Only the challenges the demo can play, in a fixed order: the visitor adds all of them.
  const demoCatalog = useMemo(
    () => DEMO_PROGRAM_ENGINE_KEYS.map((key) => catalog.find((challenge) => challenge.engine_key === key)).filter(Boolean),
    [catalog]
  );
  const programReady = program.length === demoCatalog.length;
  const programMinutes = program.reduce((total, challenge) => total + getChallengeDuration(challenge), 0);
  const participants = useMemo(() => getDemoParticipants(locale), [locale]);
  const demoSessions = useMemo(() => DEMO_PAST_SESSIONS.map((session) => ({
    id: session.id,
    name: pickLocalized(session.name, locale),
    status: 'terminee',
    challengeCount: session.challengeCount,
    participationRate: session.participationRate,
  })), [locale]);
  const demoMembers = useMemo(() => participants.map((participant) => ({
    id: participant.id,
    first_name: participant.name,
    last_name: '',
    email: participant.email,
    job_title: participant.role,
    department: '',
  })), [participants]);
  const playName = demoCatalog.find((challenge) => challenge.engine_key === DEMO_PLAY_ENGINE_KEY)?.name || '';

  useEffect(() => {
    track('started', { surface: 'demo_page' });
    try {
      if (window.sessionStorage.getItem(HINTS_HIDDEN_KEY) === '1') setHintsHidden(true);
    } catch {
      // Storage can be blocked (private mode): hints then stay on for this visit.
    }
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    headingRef.current?.focus();
    track('step_viewed', { surface: step, challengeCount: program.length || undefined });
    if (step === 'results') track('completed', { surface: 'results', challengeCount: program.length });
  }, [step]); // Only a step change should move focus and log a view.

  // The catalogue reports the selected challenge by id.
  function addProgramChallenge(challengeId) {
    const challenge = demoCatalog.find((item) => String(item.id) === String(challengeId));
    if (!challenge) return;
    setProgram((current) => (current.some((item) => item.id === challenge.id) ? current : [...current, challenge]));
  }

  function removeProgramChallenge(challengeId) {
    setProgram((current) => current.filter((item) => String(item.id) !== String(challengeId)));
  }

  function moveProgramChallenge(challengeId, offset) {
    const from = program.findIndex((item) => String(item.id) === String(challengeId));
    const to = from + offset;
    if (from < 0 || to < 0 || to >= program.length) return;
    const reordered = [...program];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setProgram(reordered);
  }

  function reorderProgramChallenges(sourceId, targetId) {
    const from = program.findIndex((item) => String(item.id) === String(sourceId));
    const to = program.findIndex((item) => String(item.id) === String(targetId));
    if (from < 0 || to < 0 || from === to) return;
    const reordered = [...program];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setProgram(reordered);
  }

  // Invite: the participants added in advance connect one by one.
  useEffect(() => {
    if (step !== 'invite') return undefined;
    setJoinedCount(0);
    const timers = buildJoinSchedule(DEMO_TEAM_SIZE, createRandom(seed))
      .map(({ index, delayMs }) => window.setTimeout(() => setJoinedCount(index + 1), delayMs));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [seed, step]);

  const activeScenario = useMemo(
    () => (activeChallenge
      ? createDemoScenario(activeChallenge.engine_key, {
        seed: seed + activeIndex,
        locale,
        players: participants,
      })
      : null),
    [activeChallenge, activeIndex, locale, participants, seed]
  );

  const handleChallengeComplete = useCallback((summary) => {
    if (!activeChallenge) return;
    setCompletions((previous) => ({ ...previous, [activeChallenge.id]: Number(summary?.completion_percent) || 0 }));
    setChallengeActions((previous) => ({ ...previous, [activeChallenge.id]: Number(summary?.action_count) || 0 }));
    setActiveDone(true);
  }, [activeChallenge]);

  // The add hint points at the first challenge not yet in the programme.
  const nextChallengeToAdd = demoCatalog.find((challenge) => !program.some((item) => item.id === challenge.id));
  let addHintKey = program.length ? 'addNext' : 'add';
  if (nextChallengeToAdd?.engine_key === DEMO_PLAY_ENGINE_KEY) addHintKey = 'addSelf';

  // One coach mark at a time, on the action that moves the demo forward.
  let activeHint = null;
  if (!hintsHidden) {
    if (step === 'dashboard') activeHint = 'dashboard';
    else if (step === 'prepare') activeHint = programReady ? 'prepare' : addHintKey;
    else if (step === 'facilitate' && flowMode === 'manual' && activeDone) activeHint = 'facilitate';
  }

  useEffect(() => {
    if (activeHint) track('hint_shown', { surface: activeHint });
  }, [activeHint, activeIndex]);

  function hideHints() {
    track('hints_dismissed', { surface: activeHint || step });
    setHintsHidden(true);
    try {
      window.sessionStorage.setItem(HINTS_HIDDEN_KEY, '1');
    } catch {
      // Hints stay hidden until the page reloads.
    }
  }

  function renderHint(key, action, options = {}) {
    let text = t(`demo.hints.${key}`, { challenge: playName });
    if (key === 'facilitate' && activeIndex + 1 >= program.length) text = t('demo.hints.facilitateLast');
    return (
      <DemoHint show={activeHint === key} text={text} dismissLabel={t('demo.hints.dismiss')} onDismiss={hideHints} {...options}>
        {action}
      </DemoHint>
    );
  }

  function goToStep(nextStep) {
    setStepIndex(DEMO_STEPS.indexOf(nextStep));
  }

  // Moves on to the next challenge; a challenge left before its debrief stays without result.
  function advanceChallenge() {
    if (!activeChallenge) return;
    setActiveDone(false);
    if (activeIndex + 1 < program.length) {
      setActiveIndex(activeIndex + 1);
    } else {
      goToStep('play');
    }
  }
  advanceRef.current = advanceChallenge;

  // Automatic sequencing: the next challenge starts after a short countdown.
  useEffect(() => {
    if (step !== 'facilitate' || flowMode !== 'auto' || !activeDone) {
      setAutoCountdown(null);
      return undefined;
    }
    let remaining = DEMO_AUTO_ADVANCE_SECONDS;
    setAutoCountdown(remaining);
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        advanceRef.current();
        return;
      }
      setAutoCountdown(remaining);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeDone, activeIndex, flowMode, step]);

  // Participant preview: the visitor builds the Pixel Architect model with three fictional colleagues.
  const visitorName = t('demo.play.you');
  const playScenario = useMemo(
    () => (step === 'play'
      ? createDemoScenario(DEMO_PLAY_ENGINE_KEY, {
        seed: seed + 100,
        locale,
        players: [{ id: DEMO_VISITOR_ID, name: visitorName, bot: false }, ...participants.slice(0, 3)],
      })
      : null),
    [locale, participants, seed, step, visitorName]
  );

  const handlePlayComplete = useCallback((summary, state) => {
    setVisitorResult(getVisitorContribution(state?.pixel, DEMO_VISITOR_ID));
    setPlayDone(true);
  }, []);

  const results = useMemo(
    () => computeDemoResults({ program, completions, actions: challengeActions, visitor: visitorResult }),
    [challengeActions, completions, program, visitorResult]
  );

  function restart() {
    track('restarted', { surface: step });
    setSeed(Math.floor(Math.random() * 1e9));
    setProgram([]);
    setJoinedCount(0);
    setActiveIndex(0);
    setActiveDone(false);
    setCompletions({});
    setChallengeActions({});
    setVisitorResult(null);
    setPlayDone(false);
    setStepIndex(0);
  }

  const sessionCode = useMemo(() => {
    const random = createRandom(seed);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
  }, [seed]);

  const flowLabel = (mode) => (mode === 'auto' ? t('demo.prepare.flowAuto') : t('demo.prepare.flowManual'));
  const debriefObjective = program[0]?.objective;

  let facilitateAction = t('demo.facilitate.skip');
  if (activeDone) {
    facilitateAction = activeIndex + 1 < program.length ? t('demo.facilitate.next') : t('demo.facilitate.finish');
  }

  return (
    <main className={`shell ${styles.page}`} data-wide={step === 'facilitate' || step === 'play' ? 'true' : undefined}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{t('demo.eyebrow')}</p>
        <h1 className={styles.title}>{t('demo.title')}</h1>
        <p className={styles.subtitle}>{t('demo.subtitle')}</p>
        <p className={styles.notice} role="note">
          <Info className={styles.noticeIcon} aria-hidden="true" />
          <strong>{t('demo.simulationBadge')}</strong>
          <span>{t('demo.simulationNotice')}</span>
        </p>
      </header>

      <nav aria-label={t('demo.stepsLabel')}>
        <ol className={styles.stepper}>
          {DEMO_STEPS.map((key, index) => (
            <li
              key={key}
              className={styles.stepperItem}
              data-state={index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'next'}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <span className={styles.stepperDot} aria-hidden="true">
                {index < stepIndex ? <CheckCircle2 size={16} /> : index + 1}
              </span>
              <span>{t(`demo.steps.${key}`)}</span>
            </li>
          ))}
        </ol>
      </nav>

      <section className={styles.panel} aria-labelledby="demo-step-title">
        <div className={styles.panelHead}>
          <div>
            <h2 id="demo-step-title" ref={headingRef} tabIndex={-1} className={styles.panelTitle}>
              {t(`demo.${step}.title`)}
            </h2>
            <p className={styles.panelIntro}>
              {step === 'play' ? t('demo.play.intro', { challenge: playName }) : t(`demo.${step}.intro`)}
            </p>
          </div>
          {stepIndex > 0 ? (
            <Button variant="ghost" size="sm" onClick={restart}>
              <RotateCcw size={16} aria-hidden="true" />
              {t('demo.restart')}
            </Button>
          ) : null}
        </div>

        {step === 'dashboard' ? (
          <ManagerHome
            demoMode
            demoSessions={demoSessions}
            demoMembers={demoMembers}
            onDemoCreateSession={() => goToStep('prepare')}
            renderDemoCreateAction={(action) => renderHint('dashboard', action)}
          />
        ) : null}

        {step === 'prepare' ? (
          <div className={styles.prepareGrid}>
            <div className={styles.prepareForm}>
              <label className={styles.textField}>
                <span className={styles.optionLegend}>{t('demo.prepare.sessionName')}</span>
                <input
                  type="text"
                  value={sessionName}
                  maxLength={80}
                  onChange={(event) => setSessionName(event.target.value)}
                />
              </label>
              <OptionGroup
                label={t('demo.prepare.flowMode')}
                options={DEMO_FLOW_MODES.map((mode) => ({ value: mode, label: flowLabel(mode) }))}
                value={flowMode}
                onChange={setFlowMode}
                hint={t('demo.prepare.flowHint')}
              />
              <p className={styles.teamNote}>
                <Users size={16} aria-hidden="true" />
                {t('demo.prepare.teamNote', { count: DEMO_TEAM_SIZE })}
              </p>
              <div className={styles.programSection} aria-live="polite">
                <div className={styles.programHead}>
                  <h3 className={styles.cardTitle}>{t('demo.prepare.programTitle')}</h3>
                  {program.length ? (
                    <span className={styles.programMeta}>
                      {t('demo.prepare.programSummary', { count: program.length, minutes: programMinutes })}
                    </span>
                  ) : null}
                </div>
                <SelectedChallengesList
                  challenges={program}
                  onRemove={removeProgramChallenge}
                  onMoveUp={(challengeId) => moveProgramChallenge(challengeId, -1)}
                  onMoveDown={(challengeId) => moveProgramChallenge(challengeId, 1)}
                  onReorder={reorderProgramChallenges}
                  onClearAll={() => setProgram([])}
                />
              </div>
            </div>

            <div className={styles.programCard}>
              <h3 className={styles.cardTitle}>{t('demo.prepare.catalogTitle')}</h3>
              <ChallengesCatalog
                challenges={demoCatalog}
                allChallenges={demoCatalog}
                selectedIds={program.map((challenge) => challenge.id)}
                filters={NO_CATALOG_FILTERS}
                isLoading={false}
                showFilters={false}
                onSelect={addProgramChallenge}
                onDeselect={removeProgramChallenge}
                renderToggleAction={(challenge, action) => (
                  challenge.id === nextChallengeToAdd?.id ? renderHint(addHintKey, action, { align: 'start' }) : action
                )}
              />
              <p className={styles.hint}>{t('demo.prepare.playNote', { challenge: playName })}</p>
              <div className={styles.actions}>
                {renderHint('prepare', (
                  <Button disabled={!programReady} onClick={() => goToStep('invite')}>{t('demo.prepare.continue')}</Button>
                ), { placement: 'start' })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 'invite' ? (
          <div className={styles.inviteGrid}>
            <div className={styles.codeCard}>
              <p className={styles.sessionLabel}>{displayedSessionName}</p>
              <p className={styles.label}>{t('demo.invite.codeLabel')}</p>
              <p className={styles.code}>{sessionCode}</p>
              <p className={styles.label}>{t('demo.invite.linkLabel')}</p>
              <p className={styles.link}>{INVITE_HOST}/participant</p>
            </div>
            <div className={styles.lobbyCard}>
              <h3 className={styles.cardTitle}>
                <Users size={18} aria-hidden="true" />
                {t('demo.invite.joined', { joined: joinedCount, invited: DEMO_TEAM_SIZE })}
              </h3>
              <div
                className={styles.meter}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={DEMO_TEAM_SIZE}
                aria-valuenow={joinedCount}
                aria-label={t('demo.invite.joined', { joined: joinedCount, invited: DEMO_TEAM_SIZE })}
              >
                <span style={{ width: `${(joinedCount / DEMO_TEAM_SIZE) * 100}%` }} />
              </div>
              <ul className={styles.timeline} aria-live="polite">
                {participants.map((participant, index) => {
                  const connected = index < joinedCount;
                  return (
                    <li key={participant.id} className={styles.personRow} data-connected={connected}>
                      <Avatar name={participant.name} />
                      <span>
                        <span className={styles.timelineName}>{participant.name}</span>
                        <span className={styles.itemMeta}>{participant.role}</span>
                      </span>
                      <span className={styles.statusPill} data-tone={connected ? 'success' : 'muted'}>
                        {connected ? t('demo.invite.statusConnected') : t('demo.invite.statusInvited')}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.hint}>
                {joinedCount < DEMO_TEAM_SIZE ? t('demo.invite.waiting') : t('demo.invite.ready')}
              </p>
              <div className={styles.actions}>
                <Button disabled={joinedCount < DEMO_TEAM_SIZE} onClick={() => goToStep('facilitate')}>
                  <PlayCircle size={18} aria-hidden="true" />
                  {t('demo.invite.launch')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'facilitate' && activeChallenge && activeScenario ? (
          <div className={styles.liveLayout}>
            <div className={styles.liveBar}>
              <div className={styles.liveBarInfo}>
                <p className={styles.sessionLabel}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  {displayedSessionName}
                </p>
                <p className={styles.liveBarTitle}>
                  {t('demo.facilitate.challengeCounter', { current: activeIndex + 1, total: program.length })}
                </p>
                <ol className={styles.programChips} aria-label={t('demo.facilitate.program')}>
                  {program.map((challenge, index) => {
                    const state = index < activeIndex ? 'done' : index === activeIndex ? 'live' : 'next';
                    const label = state === 'done'
                      ? t('demo.facilitate.statusDone')
                      : state === 'live' ? t('demo.facilitate.statusLive') : t('demo.facilitate.statusNext');
                    return (
                      <li key={challenge.id} className={styles.programChip} data-state={state}>
                        <span>{challenge.name}</span>
                        <span className={styles.visuallyHidden}>{label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <div className={styles.liveBarActions}>
                <span className={styles.itemMeta}>{t('demo.facilitate.modeLabel', { mode: flowLabel(flowMode) })}</span>
                {renderHint('facilitate', (
                  <Button variant={activeDone ? 'primary' : 'ghost'} onClick={advanceChallenge}>{facilitateAction}</Button>
                ))}
              </div>
            </div>
            {autoCountdown !== null ? (
              <p className={styles.autoBanner} role="status">
                {activeIndex + 1 < program.length
                  ? t('demo.facilitate.autoNext', { seconds: autoCountdown })
                  : t('demo.facilitate.autoFinish', { seconds: autoCountdown })}
              </p>
            ) : null}
            <div className={styles.challengeStage}>
              <DemoChallengeStage
                key={`${seed}-${activeIndex}`}
                scenario={activeScenario}
                autoStart={flowMode === 'auto'}
                locale={locale}
                displayName="Alex"
                loadingLabel={t('demo.facilitate.loading')}
                onComplete={handleChallengeComplete}
              />
            </div>
          </div>
        ) : null}

        {step === 'play' && playScenario ? (
          <div className={styles.liveLayout}>
            <div className={styles.liveBar}>
              <div className={styles.liveBarInfo}>
                <p className={styles.sessionLabel}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  {displayedSessionName}
                </p>
                <p className={styles.liveBarTitle}>{t('demo.play.barTitle', { challenge: playName, name: visitorName })}</p>
              </div>
              <div className={styles.liveBarActions}>
                <Button variant={playDone ? 'primary' : 'ghost'} onClick={() => goToStep('results')}>
                  {playDone ? t('demo.play.seeResults') : t('demo.play.skip')}
                </Button>
              </div>
            </div>
            <div className={styles.challengeStage}>
              <DemoChallengeStage
                key={`play-${seed}`}
                scenario={playScenario}
                autoStart
                locale={locale}
                role="participant"
                participantId={DEMO_VISITOR_ID}
                participantSlot={1}
                displayName={visitorName}
                loadingLabel={t('demo.facilitate.loading')}
                onComplete={handlePlayComplete}
              />
            </div>
          </div>
        ) : null}

        {step === 'results' ? (
          <div className={styles.resultsLayout}>
            <p className={styles.sessionLabel}>{displayedSessionName}</p>
            <div className={styles.kpiGrid}>
              <div className={styles.kpi}>
                <p className={styles.label}>{t('demo.results.participation')}</p>
                <p className={styles.kpiValue}>{results.participationRate} %</p>
                <p className={styles.kpiDetail}>{t('demo.results.participationDetail', { joined: results.joined, invited: results.invited })}</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.label}>{t('demo.results.challenges')}</p>
                <p className={styles.kpiValue}>{results.challengesCompleted}</p>
                <p className={styles.kpiDetail}>{t('demo.results.challengesDetail', { minutes: results.totalMinutes })}</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.label}>{t('demo.results.actions')}</p>
                <p className={styles.kpiValue}>{results.totalActions}</p>
                <p className={styles.kpiDetail}>{t('demo.results.actionsDetail')}</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.label}>{t('demo.results.yourScore')}</p>
                <p className={styles.kpiValue}>
                  {results.visitor ? t('demo.results.yourScoreValue', { count: results.visitor.cubes }) : '–'}
                </p>
                <p className={styles.kpiDetail}>
                  {results.visitor
                    ? t('demo.results.yourScoreDetail', { share: results.visitor.share, challenge: playName })
                    : t('demo.results.yourScoreMissing', { challenge: playName })}
                </p>
              </div>
            </div>

            <div className={styles.resultsColumns}>
              <div className={styles.timelineCard}>
                <h3 className={styles.cardTitle}>{t('demo.results.perChallenge')}</h3>
                <ul className={styles.timeline}>
                  {program.map((challenge) => (
                    <li key={challenge.id} className={styles.resultRow}>
                      <span className={styles.timelineName}>{challenge.name}</span>
                      <span className={styles.meter} aria-hidden="true">
                        <span style={{ width: `${completions[challenge.id] || 0}%` }} />
                      </span>
                      <span className={styles.timelineStatus}>
                        {Number.isFinite(completions[challenge.id]) ? `${completions[challenge.id]} %` : t('demo.results.skipped')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.timelineCard}>
                <h3 className={styles.cardTitle}>{t('demo.results.debriefTitle')}</h3>
                <ol className={styles.debriefList}>
                  {getDebriefPrompts(debriefObjective, locale).map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className={styles.cta}>
              <div>
                <h3 className={styles.ctaTitle}>{t('demo.results.ctaTitle')}</h3>
                <p className={styles.ctaText}>{t('demo.results.ctaText')}</p>
              </div>
              <div className={styles.actions}>
                <Link
                  href={withLocalePath('/signup')}
                  className={styles.ctaPrimary}
                  onClick={() => track('cta_clicked', { surface: 'signup' })}
                >
                  {t('demo.results.signup')}
                </Link>
                <Link
                  href={withLocalePath('/contact')}
                  className={styles.ctaSecondary}
                  onClick={() => track('cta_clicked', { surface: 'contact' })}
                >
                  {t('demo.results.contact')}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
