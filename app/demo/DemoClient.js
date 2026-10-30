'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, Pause, Play, PlayCircle, Plus, RotateCcw, Users, WifiOff, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { trackProductEvent } from '@/lib/analytics';
import { mockChallenges } from '@/lib/mockChallenges';
import { localizeBuilderChallenge } from '@/lib/challenges/catalogLocalization';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getAvailableEngines } from '@/lib/challenges/runtime';
import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { getChallengeDuration, proposeSessionProgram, replaceProgramChallenge } from '@/lib/sessionProgram.mjs';
import {
  DEMO_AUTO_ADVANCE_SECONDS,
  DEMO_DURATIONS,
  DEMO_FLOW_MODES,
  DEMO_MS_PER_MINUTE,
  DEMO_OBJECTIVES,
  DEMO_PARI_ROUNDS,
  DEMO_PARTICIPANTS,
  DEMO_PAST_SESSIONS,
  DEMO_STEPS,
  DEMO_TEAM_SIZE,
  buildActivityFeed,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getChallengeCompletion,
  getDebriefPrompts,
  getDemoParticipants,
  getRoundStatements,
  isParticipantOnline,
  simulateVotes,
} from '@/lib/demo/demoScenario.mjs';
import styles from './Demo.module.css';

const TICK_MS = DEMO_MS_PER_MINUTE / 2;
const FEED_LENGTH = 5;
const INVITE_HOST = getPublicSiteOrigin().replace(/^https?:\/\//, '');

function track(action, context = {}) {
  trackProductEvent('demo', action, context);
}

function formatClock(minutes) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
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
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [completions, setCompletions] = useState({});
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [votes, setVotes] = useState([]);
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
    availableEngineKeys: getAvailableEngines().map((engine) => engine.key),
  }), [objective, targetMinutes]);

  const generateProgram = useCallback(() => {
    setProposal(proposeSessionProgram(catalog, programOptions));
    setProgramNotice('');
  }, [catalog, programOptions]);

  // Programme suggestions follow the selected criteria, as in the session builder.
  useEffect(() => {
    if (step === 'prepare') generateProgram();
  }, [generateProgram, step]);

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

  const activeDuration = activeChallenge ? getChallengeDuration(activeChallenge) : 0;
  const activeTarget = useMemo(
    () => (activeChallenge ? getChallengeCompletion(createRandom(seed + activeIndex + 1)) : 0),
    [activeChallenge, activeIndex, seed]
  );
  const activeFeed = useMemo(
    () => (activeChallenge
      ? buildActivityFeed(
        activeChallenge.engine_key,
        participants,
        activeDuration * 2,
        locale,
        createRandom(seed + activeIndex),
        (position, entryIndex) => isParticipantOnline(position, activeIndex, (entryIndex + 1) / 2),
      )
      : []),
    [activeChallenge, activeDuration, activeIndex, locale, participants, seed]
  );
  const isActiveDone = activeDuration > 0 && elapsedMinutes >= activeDuration;
  const activeProgress = activeDuration
    ? Math.round(Math.min(1, elapsedMinutes / activeDuration) * activeTarget)
    : 0;
  const visibleFeed = activeFeed
    .filter((item) => item.at < Math.floor(elapsedMinutes * 2))
    .slice(-FEED_LENGTH)
    .reverse();
  const presence = participants.map((participant, index) => ({
    ...participant,
    online: isParticipantOnline(index, activeIndex, elapsedMinutes),
  }));
  const offlineParticipant = presence.find((participant) => !participant.online);

  // Facilitate: accelerated timer for the running challenge, stopped while paused.
  useEffect(() => {
    if (step !== 'facilitate' || !activeChallenge || isActiveDone || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setElapsedMinutes((value) => Math.min(activeDuration, value + 0.5));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [activeChallenge, activeDuration, isActiveDone, isPaused, step]);

  function goToStep(nextStep) {
    setStepIndex(DEMO_STEPS.indexOf(nextStep));
  }

  function advanceChallenge() {
    if (!activeChallenge) return;
    if (!isActiveDone) {
      setIsPaused(false);
      setElapsedMinutes(activeDuration);
      return;
    }
    setCompletions({ ...completions, [activeChallenge.id]: activeProgress });
    setElapsedMinutes(0);
    if (activeIndex + 1 < program.length) {
      setActiveIndex(activeIndex + 1);
    } else {
      goToStep('play');
    }
  }
  advanceRef.current = advanceChallenge;

  // Automatic sequencing: the next challenge starts after a short countdown.
  useEffect(() => {
    if (step !== 'facilitate' || flowMode !== 'auto' || !isActiveDone) {
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
  }, [activeIndex, flowMode, isActiveDone, step]);

  const round = DEMO_PARI_ROUNDS[roundIndex];
  const roundAnswer = answers[roundIndex];
  const roundVotes = votes[roundIndex];
  const presenter = DEMO_PARTICIPANTS.find((participant) => participant.name === round?.presenter);

  function submitAnswer(choice) {
    if (roundAnswer !== undefined) return;
    const counts = simulateVotes({
      voterCount: DEMO_TEAM_SIZE - 1,
      lieIndex: round.lieIndex,
      accuracy: round.botAccuracy,
      random: createRandom(seed + 100 + roundIndex),
    });
    counts[choice] += 1;
    setAnswers([...answers, choice]);
    setVotes([...votes, counts]);
  }

  const results = useMemo(
    () => computeDemoResults({ program, completions, answers, votes }),
    [answers, completions, program, votes]
  );

  function restart() {
    track('restarted', { surface: step });
    setSeed(Math.floor(Math.random() * 1e9));
    setProposal(null);
    setProgramNotice('');
    setJoinedCount(0);
    setActiveIndex(0);
    setElapsedMinutes(0);
    setIsPaused(false);
    setCompletions({});
    setRoundIndex(0);
    setAnswers([]);
    setVotes([]);
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

  let facilitateAction = t('demo.facilitate.fastForward');
  if (isActiveDone) {
    facilitateAction = activeIndex + 1 < program.length ? t('demo.facilitate.next') : t('demo.facilitate.finish');
  }

  return (
    <main className={`shell ${styles.page}`}>
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
                          <button type="button" className={styles.linkButton} onClick={() => replaceChallenge(challenge.id)}>
                            {t('demo.prepare.replace')}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className={styles.emptyText}>{t('demo.prepare.empty')}</p>
              )}
              {programNotice ? <p className={styles.hint}>{programNotice}</p> : null}
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

        {step === 'facilitate' && activeChallenge ? (
          <div className={styles.liveGrid}>
            <div className={styles.liveCard}>
              <div className={styles.programHead}>
                <div>
                  <p className={styles.sessionLabel}>{displayedSessionName}</p>
                  <h3 className={styles.cardTitle}>{activeChallenge.name}</h3>
                </div>
                <span className={styles.liveBadge} data-paused={isPaused}>
                  {isPaused ? t('demo.facilitate.paused') : t('demo.facilitate.statusLive')}
                </span>
              </div>
              <div className={styles.liveStats}>
                <div>
                  <p className={styles.label}>{t('demo.facilitate.timeLeft')}</p>
                  <p className={styles.clock}>{formatClock(activeDuration - elapsedMinutes)}</p>
                </div>
                <div>
                  <p className={styles.label}>{t('demo.facilitate.progress')}</p>
                  <p className={styles.clock}>{activeProgress} %</p>
                </div>
              </div>
              <div
                className={styles.meter}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={activeProgress}
                aria-label={t('demo.facilitate.progress')}
              >
                <span style={{ width: `${activeProgress}%` }} />
              </div>
              <div className={styles.controls}>
                <Button variant="secondary" disabled={isActiveDone} onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
                  {isPaused ? t('demo.facilitate.resume') : t('demo.facilitate.pause')}
                </Button>
                <Button onClick={advanceChallenge}>{facilitateAction}</Button>
              </div>
              {autoCountdown !== null ? (
                <p className={styles.autoBanner} role="status">
                  {activeIndex + 1 < program.length
                    ? t('demo.facilitate.autoNext', { seconds: autoCountdown })
                    : t('demo.facilitate.autoFinish', { seconds: autoCountdown })}
                </p>
              ) : null}
              <p className={styles.label}>{t('demo.facilitate.feed')}</p>
              <ul className={styles.feed}>
                {visibleFeed.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            </div>
            <aside className={styles.sideColumn}>
              <div className={styles.timelineCard}>
                <h3 className={styles.cardTitle}>{t('demo.facilitate.presence')}</h3>
                <ul className={styles.timeline} aria-live="polite">
                  {presence.map((participant) => (
                    <li key={participant.id} className={styles.personRow}>
                      <Avatar name={participant.name} />
                      <span className={styles.timelineName}>{participant.name}</span>
                      <span className={styles.statusPill} data-tone={participant.online ? 'success' : 'warning'}>
                        {participant.online ? null : <WifiOff size={12} aria-hidden="true" />}
                        {participant.online ? t('demo.facilitate.online') : t('demo.facilitate.offline')}
                      </span>
                    </li>
                  ))}
                </ul>
                {offlineParticipant ? (
                  <p className={styles.hint}>{t('demo.facilitate.offlineHint', { name: offlineParticipant.name })}</p>
                ) : null}
              </div>
              <div className={styles.timelineCard}>
                <div className={styles.programHead}>
                  <h3 className={styles.cardTitle}>{t('demo.facilitate.program')}</h3>
                  <span className={styles.itemMeta}>{t('demo.facilitate.modeLabel', { mode: flowLabel(flowMode) })}</span>
                </div>
                <ol className={styles.timeline}>
                  {program.map((challenge, index) => {
                    const state = index < activeIndex ? 'done' : index === activeIndex ? 'live' : 'next';
                    const label = state === 'done'
                      ? t('demo.facilitate.statusDone')
                      : state === 'live' ? t('demo.facilitate.statusLive') : t('demo.facilitate.statusNext');
                    return (
                      <li key={challenge.id} className={styles.timelineItem} data-state={state}>
                        <span className={styles.timelineName}>{challenge.name}</span>
                        <span className={styles.timelineStatus}>{label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </aside>
          </div>
        ) : null}

        {step === 'play' && round ? (
          <div className={styles.playCard}>
            <p className={styles.label}>{t('demo.play.round', { current: roundIndex + 1, total: DEMO_PARI_ROUNDS.length })}</p>
            <p className={styles.presenter}>
              <Avatar name={round.presenter} />
              {t('demo.play.presenterSays', { name: round.presenter, role: presenter?.role[lang] })}
            </p>
            <p className={styles.question}>{t('demo.play.vote')}</p>
            <ol className={styles.statements}>
              {getRoundStatements(round, locale).map((statement, index) => {
                const revealed = roundAnswer !== undefined;
                const isLie = index === round.lieIndex;
                const count = roundVotes?.[index] || 0;
                const total = roundVotes?.reduce((sum, value) => sum + value, 0) || 1;
                return (
                  <li key={statement}>
                    <button
                      type="button"
                      className={styles.statement}
                      data-revealed={revealed ? (isLie ? 'lie' : 'truth') : undefined}
                      aria-pressed={roundAnswer === index}
                      disabled={revealed}
                      onClick={() => submitAnswer(index)}
                    >
                      <span className={styles.statementNumber}>{index + 1}</span>
                      <span className={styles.statementText}>{statement}</span>
                      {revealed ? (
                        <span className={styles.statementResult}>
                          <strong>{isLie ? t('demo.play.lie') : t('demo.play.truth')}</strong>
                          {roundAnswer === index ? <em>{t('demo.play.yourVote')}</em> : null}
                          <span>{t('demo.play.votes', { count })}</span>
                          <span className={styles.voteBar} aria-hidden="true">
                            <span style={{ width: `${(count / total) * 100}%` }} />
                          </span>
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
            {roundAnswer !== undefined ? (
              <div className={styles.roundFooter} aria-live="polite">
                <p className={styles.roundOutcome} data-correct={roundAnswer === round.lieIndex}>
                  {roundAnswer === round.lieIndex
                    ? <><CheckCircle2 size={18} aria-hidden="true" />{t('demo.play.correct')}</>
                    : <><XCircle size={18} aria-hidden="true" />{t('demo.play.wrong', { number: round.lieIndex + 1 })}</>}
                </p>
                {roundIndex + 1 < DEMO_PARI_ROUNDS.length ? (
                  <Button onClick={() => setRoundIndex(roundIndex + 1)}>{t('demo.play.nextRound')}</Button>
                ) : (
                  <Button onClick={() => goToStep('results')}>{t('demo.play.seeResults')}</Button>
                )}
              </div>
            ) : null}
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
                <p className={styles.kpiValue}>{t('demo.results.yourScoreValue', { score: results.userScore, total: results.roundCount })}</p>
                <p className={styles.kpiDetail}>{t('demo.results.yourScoreDetail', { accuracy: results.teamAccuracy })}</p>
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
                      <span className={styles.timelineStatus}>{completions[challenge.id] || 0} %</span>
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
