'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, PlayCircle, Plus, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { trackProductEvent } from '@/lib/analytics';
import { mockChallenges } from '@/lib/mockChallenges';
import { localizeBuilderChallenge } from '@/lib/challenges/catalogLocalization';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { getChallengeDuration, proposeSessionProgram, replaceProgramChallenge } from '@/lib/sessionProgram.mjs';
import {
  DEMO_AUTO_ADVANCE_SECONDS,
  DEMO_DURATIONS,
  DEMO_FLOW_MODES,
  DEMO_OBJECTIVES,
  DEMO_PAST_SESSIONS,
  DEMO_STEPS,
  DEMO_TEAM_SIZE,
  DEMO_VISITOR_ID,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getDebriefPrompts,
  getDemoParticipants,
  getVisitorResult,
} from '@/lib/demo/demoScenario.mjs';
import { DEMO_PROGRAM_ENGINE_KEYS, VOM_ENGINE_KEY, createDemoScenario } from '@/lib/demo/challenges/index.mjs';
import DemoChallengeStage from './DemoChallengeStage';
import styles from './Demo.module.css';

const INVITE_HOST = getPublicSiteOrigin().replace(/^https?:\/\//, '');

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
  const lang = locale === 'en' ? 'en' : 'fr';
  const [stepIndex, setStepIndex] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [sessionName, setSessionName] = useState(() => t('demo.prepare.sessionNameDefault'));
  const [objective, setObjective] = useState('');
  const [targetMinutes, setTargetMinutes] = useState(45);
  const [flowMode, setFlowMode] = useState('manual');
  const [proposal, setProposal] = useState(null);
  const [programNotice, setProgramNotice] = useState('');
  const [joinedCount, setJoinedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeDone, setActiveDone] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [completions, setCompletions] = useState({});
  const [visitorResult, setVisitorResult] = useState(null);
  const [playDone, setPlayDone] = useState(false);
  const headingRef = useRef(null);
  const hasMountedRef = useRef(false);
  const advanceRef = useRef(() => {});

  const step = DEMO_STEPS[stepIndex];
  const program = proposal?.challenges || [];
  const activeChallenge = program[activeIndex] || null;
  const displayedSessionName = sessionName.trim() || t('demo.prepare.sessionNameDefault');

  const catalog = useMemo(
    () => mockChallenges.map((challenge) => localizeBuilderChallenge(challenge, locale)),
    [locale]
  );
  const participants = useMemo(() => getDemoParticipants(locale), [locale]);
  const pariName = getVraiOuMensongeRulesPreset(locale).challengeName;

  useEffect(() => {
    track('started', { surface: 'demo_page' });
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

  const programOptions = useMemo(() => ({
    objective,
    expectedCount: DEMO_TEAM_SIZE,
    targetMinutes,
    resolveRange: resolveChallengePlayerRange,
    availableEngineKeys: DEMO_PROGRAM_ENGINE_KEYS,
  }), [objective, targetMinutes]);

  const generateProgram = useCallback(() => {
    setProposal(proposeSessionProgram(catalog, programOptions));
    setProgramNotice('');
  }, [catalog, programOptions]);

  // Programme suggestions follow the selected criteria, as in the session builder.
  useEffect(() => {
    if (step === 'prepare') generateProgram();
  }, [generateProgram, step]);

  // Only offer a replacement when another challenge fits the remaining time.
  const replaceableIds = useMemo(() => new Set(
    (proposal?.challenges || [])
      .filter((challenge) => replaceProgramChallenge(proposal, challenge.id, catalog, programOptions))
      .map((challenge) => challenge.id)
  ), [catalog, programOptions, proposal]);

  function replaceChallenge(challengeId) {
    const replacement = replaceProgramChallenge(proposal, challengeId, catalog, programOptions);
    if (replacement) {
      setProposal(replacement);
      setProgramNotice('');
    } else {
      setProgramNotice(t('demo.prepare.noReplacement'));
    }
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
      ? createDemoScenario(activeChallenge.engine_key, { seed: seed + activeIndex, locale, players: participants })
      : null),
    [activeChallenge, activeIndex, locale, participants, seed]
  );

  const handleChallengeComplete = useCallback((summary) => {
    if (!activeChallenge) return;
    setCompletions((previous) => ({ ...previous, [activeChallenge.id]: Number(summary?.completion_percent) || 0 }));
    setActiveDone(true);
  }, [activeChallenge]);

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

  // Participant preview: the visitor plays Pari sur moi with three fictional colleagues.
  const visitorName = t('demo.play.you');
  const playScenario = useMemo(
    () => (step === 'play'
      ? createDemoScenario(VOM_ENGINE_KEY, {
        seed: seed + 100,
        locale,
        players: [{ id: DEMO_VISITOR_ID, name: visitorName, bot: false }, ...participants.slice(0, 3)],
        autoStartMs: 1500,
      })
      : null),
    [locale, participants, seed, step, visitorName]
  );

  const handlePlayComplete = useCallback((summary, state) => {
    setVisitorResult(getVisitorResult(state?.vom, DEMO_VISITOR_ID));
    setPlayDone(true);
  }, []);

  const results = useMemo(
    () => computeDemoResults({ program, completions, visitor: visitorResult }),
    [completions, program, visitorResult]
  );

  function restart() {
    track('restarted', { surface: step });
    setSeed(Math.floor(Math.random() * 1e9));
    setProposal(null);
    setProgramNotice('');
    setJoinedCount(0);
    setActiveIndex(0);
    setActiveDone(false);
    setCompletions({});
    setVisitorResult(null);
    setPlayDone(false);
    setStepIndex(0);
  }

  const sessionCode = useMemo(() => {
    const random = createRandom(seed);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
  }, [seed]);

  const objectiveOptions = [
    { value: '', label: t('demo.prepare.noPreference') },
    ...DEMO_OBJECTIVES.map((key) => ({ value: key, label: t(`sessionBuilder.objectiveLabels.${key}`) })),
  ];
  const flowLabel = (mode) => (mode === 'auto' ? t('demo.prepare.flowAuto') : t('demo.prepare.flowManual'));
  const debriefObjective = objective || DEMO_OBJECTIVES.find((key) => program.some((challenge) => challenge.objective === key));

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
              {step === 'play' ? t('demo.play.intro', { challenge: pariName }) : t(`demo.${step}.intro`)}
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
          <div className={styles.dashboard}>
            <div className={styles.dashboardHead}>
              <p className={styles.greeting}>{t('demo.dashboard.greeting')}</p>
              <Button onClick={() => goToStep('prepare')}>
                <Plus size={18} aria-hidden="true" />
                {t('demo.dashboard.create')}
              </Button>
            </div>
            <dl className={styles.statGrid} aria-label={t('demo.dashboard.statsLabel')}>
              <div className={styles.stat}>
                <dt>{t('demo.dashboard.statInProgress')}</dt>
                <dd>0</dd>
              </div>
              <div className={styles.stat}>
                <dt>{t('demo.dashboard.statUpcoming')}</dt>
                <dd>0</dd>
              </div>
              <div className={styles.stat}>
                <dt>{t('demo.dashboard.statDone')}</dt>
                <dd>{DEMO_PAST_SESSIONS.length}</dd>
              </div>
            </dl>
            <div className={styles.resultsColumns}>
              <div className={styles.timelineCard}>
                <h3 className={styles.cardTitle}>{t('demo.dashboard.sessionsTitle')}</h3>
                <ul className={styles.timeline}>
                  {DEMO_PAST_SESSIONS.map((session) => (
                    <li key={session.id} className={styles.timelineItem} data-state="done">
                      <span>
                        <span className={styles.timelineName}>{session.name[lang]}</span>
                        <span className={styles.itemMeta}>
                          {t('demo.dashboard.sessionMeta', { count: session.challengeCount, rate: session.participationRate })}
                        </span>
                      </span>
                      <span className={styles.timelineStatus}>{t('demo.dashboard.statusDone')}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.timelineCard}>
                <h3 className={styles.cardTitle}>
                  <Users size={18} aria-hidden="true" />
                  {t('demo.dashboard.teamTitle')}
                </h3>
                <ul className={styles.timeline}>
                  {participants.map((participant) => (
                    <li key={participant.id} className={styles.personRow}>
                      <Avatar name={participant.name} />
                      <span>
                        <span className={styles.timelineName}>{participant.name}</span>
                        <span className={styles.itemMeta}>{participant.role} · {participant.email}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.hint}>{t('demo.dashboard.teamHint', { count: DEMO_TEAM_SIZE })}</p>
              </div>
            </div>
          </div>
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
              <OptionGroup label={t('demo.prepare.objective')} options={objectiveOptions} value={objective} onChange={setObjective} />
              <OptionGroup
                label={t('demo.prepare.duration')}
                options={DEMO_DURATIONS.map((minutes) => ({ value: minutes, label: t('demo.prepare.minutes', { minutes }) }))}
                value={targetMinutes}
                onChange={setTargetMinutes}
              />
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
            </div>

            <div className={styles.programCard} aria-live="polite">
              <div className={styles.programHead}>
                <h3 className={styles.cardTitle}>{t('demo.prepare.programTitle')}</h3>
                {program.length ? (
                  <span className={styles.programMeta}>
                    {t('demo.prepare.programSummary', { count: program.length, minutes: proposal.duration })}
                  </span>
                ) : null}
              </div>
              {program.length ? (
                <ol className={styles.programList}>
                  {program.map((challenge) => {
                    const recommended = resolveChallengePlayerRange(challenge).recommended;
                    return (
                      <li key={challenge.id} className={styles.programItem}>
                        <div>
                          <p className={styles.programName}>{challenge.name}</p>
                          <p className={styles.programDescription}>{challenge.description}</p>
                        </div>
                        <div className={styles.programTags}>
                          <span>{t('demo.prepare.minutes', { minutes: getChallengeDuration(challenge) })}</span>
                          {recommended ? <span>{t('demo.prepare.idealPlayers', { count: recommended })}</span> : null}
                          {replaceableIds.has(challenge.id) ? (
                            <button type="button" className={styles.linkButton} onClick={() => replaceChallenge(challenge.id)}>
                              {t('demo.prepare.replace')}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={styles.emptyText}>{t('demo.prepare.empty')}</p>
              )}
              {programNotice ? <p className={styles.hint}>{programNotice}</p> : null}
              <p className={styles.hint}>{t('demo.prepare.playNote', { challenge: pariName })}</p>
              <div className={styles.actions}>
                <Button variant="secondary" onClick={generateProgram}>{t('demo.prepare.regenerate')}</Button>
                <Button disabled={!program.length} onClick={() => goToStep('invite')}>{t('demo.prepare.continue')}</Button>
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
                <p className={styles.sessionLabel}>{displayedSessionName}</p>
                <p className={styles.liveBarTitle}>
                  {t('demo.facilitate.challengeCounter', { current: activeIndex + 1, total: program.length })}
                  {' · '}
                  {activeChallenge.name}
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
                <Button variant={activeDone ? 'primary' : 'ghost'} onClick={advanceChallenge}>{facilitateAction}</Button>
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
                <p className={styles.sessionLabel}>{displayedSessionName}</p>
                <p className={styles.liveBarTitle}>{t('demo.play.barTitle', { challenge: pariName, name: visitorName })}</p>
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
                <p className={styles.label}>{t('demo.results.completion')}</p>
                <p className={styles.kpiValue}>{results.averageCompletion} %</p>
                <p className={styles.kpiDetail}>{t('demo.results.completionDetail')}</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.label}>{t('demo.results.yourScore')}</p>
                <p className={styles.kpiValue}>
                  {results.visitor ? t('demo.results.yourScoreValue', { score: results.visitor.score }) : '–'}
                </p>
                <p className={styles.kpiDetail}>
                  {results.visitor
                    ? t('demo.results.yourScoreDetail', { rank: results.visitor.rank, total: results.visitor.total, challenge: pariName })
                    : t('demo.results.yourScoreMissing', { challenge: pariName })}
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
