'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, PlayCircle, RotateCcw, Users, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import useI18n from '@/lib/i18n/useI18n';
import { trackProductEvent } from '@/lib/analytics';
import { mockChallenges } from '@/lib/mockChallenges';
import { localizeBuilderChallenge } from '@/lib/challenges/catalogLocalization';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getAvailableEngines } from '@/lib/challenges/runtime';
import { getPublicSiteOrigin } from '@/lib/siteMetadata';
import { getChallengeDuration, proposeSessionProgram } from '@/lib/sessionProgram.mjs';
import {
  DEMO_DURATIONS,
  DEMO_MS_PER_MINUTE,
  DEMO_OBJECTIVES,
  DEMO_PARI_ROUNDS,
  DEMO_PARTICIPANTS,
  DEMO_STEPS,
  DEMO_TEAM_SIZES,
  buildActivityFeed,
  buildJoinSchedule,
  computeDemoResults,
  createRandom,
  getChallengeCompletion,
  getDebriefPrompts,
  getDemoParticipants,
  getRoundStatements,
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

function OptionGroup({ label, options, value, onChange }) {
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
  const [objective, setObjective] = useState('');
  const [teamSize, setTeamSize] = useState(10);
  const [targetMinutes, setTargetMinutes] = useState(45);
  const [proposal, setProposal] = useState(null);
  const [joinedCount, setJoinedCount] = useState(0);
  const [joinTotal, setJoinTotal] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [completions, setCompletions] = useState({});
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [votes, setVotes] = useState([]);
  const headingRef = useRef(null);
  const hasMountedRef = useRef(false);

  const step = DEMO_STEPS[stepIndex];
  const program = proposal?.challenges || [];
  const activeChallenge = program[activeIndex] || null;

  const catalog = useMemo(
    () => mockChallenges.map((challenge) => localizeBuilderChallenge(challenge, locale)),
    [locale]
  );
  const participants = useMemo(() => getDemoParticipants(teamSize, locale), [teamSize, locale]);
  const joinedParticipants = useMemo(() => participants.slice(0, joinedCount), [participants, joinedCount]);
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
  }, [step]); // Only a step change should move focus and log a view.

  const generateProgram = useCallback(() => {
    const next = proposeSessionProgram(catalog, {
      objective,
      expectedCount: teamSize,
      targetMinutes,
      resolveRange: resolveChallengePlayerRange,
      availableEngineKeys: getAvailableEngines().map((engine) => engine.key),
    });
    setProposal(next);
  }, [catalog, objective, teamSize, targetMinutes]);

  // Programme suggestions follow the selected criteria, as in the session builder.
  useEffect(() => {
    if (step === 'prepare') generateProgram();
  }, [generateProgram, step]);

  // Invite: participants arrive one by one.
  useEffect(() => {
    if (step !== 'invite') return undefined;
    const schedule = buildJoinSchedule(teamSize, createRandom(seed));
    setJoinedCount(0);
    setJoinTotal(schedule.length);
    const timers = schedule.map(({ index, delayMs }) => window.setTimeout(() => setJoinedCount(index + 1), delayMs));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [seed, step, teamSize]);

  const activeDuration = activeChallenge ? getChallengeDuration(activeChallenge) : 0;
  const activeTarget = useMemo(
    () => (activeChallenge ? getChallengeCompletion(createRandom(seed + activeIndex + 1)) : 0),
    [activeChallenge, activeIndex, seed]
  );
  const activeFeed = useMemo(
    () => (activeChallenge
      ? buildActivityFeed(activeChallenge.engine_key, joinedParticipants, activeDuration * 2, locale, createRandom(seed + activeIndex))
      : []),
    [activeChallenge, activeDuration, activeIndex, joinedParticipants, locale, seed]
  );
  const isActiveDone = activeDuration > 0 && elapsedMinutes >= activeDuration;
  const activeProgress = activeDuration
    ? Math.round(Math.min(1, elapsedMinutes / activeDuration) * activeTarget)
    : 0;
  const visibleFeed = activeFeed.slice(0, Math.floor(elapsedMinutes * 2)).slice(-FEED_LENGTH).reverse();

  // Facilitate: accelerated timer for the running challenge.
  useEffect(() => {
    if (step !== 'facilitate' || !activeChallenge || isActiveDone) return undefined;
    const timer = window.setInterval(() => {
      setElapsedMinutes((value) => Math.min(activeDuration, value + 0.5));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [activeChallenge, activeDuration, isActiveDone, step]);

  function goToStep(nextStep) {
    setStepIndex(DEMO_STEPS.indexOf(nextStep));
  }

  function advanceChallenge() {
    if (!activeChallenge) return;
    if (!isActiveDone) {
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

  const round = DEMO_PARI_ROUNDS[roundIndex];
  const roundAnswer = answers[roundIndex];
  const roundVotes = votes[roundIndex];
  const presenter = DEMO_PARTICIPANTS.find((participant) => participant.name === round?.presenter);

  function submitAnswer(choice) {
    if (roundAnswer !== undefined) return;
    const counts = simulateVotes({
      voterCount: Math.max(0, joinTotal - 1),
      lieIndex: round.lieIndex,
      accuracy: round.botAccuracy,
      random: createRandom(seed + 100 + roundIndex),
    });
    counts[choice] += 1;
    setAnswers([...answers, choice]);
    setVotes([...votes, counts]);
  }

  const results = useMemo(
    () => computeDemoResults({ teamSize, program, completions, answers, votes }),
    [answers, completions, program, teamSize, votes]
  );

  useEffect(() => {
    if (step === 'results') track('completed', { surface: 'results', challengeCount: program.length });
  }, [step]);

  function restart() {
    track('restarted', { surface: step });
    setSeed(Math.floor(Math.random() * 1e9));
    setProposal(null);
    setJoinedCount(0);
    setActiveIndex(0);
    setElapsedMinutes(0);
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
  const debriefObjective = objective || DEMO_OBJECTIVES.find((key) => program.some((challenge) => challenge.objective === key));

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

        {step === 'prepare' ? (
          <div className={styles.prepareGrid}>
            <div className={styles.prepareForm}>
              <OptionGroup label={t('demo.prepare.objective')} options={objectiveOptions} value={objective} onChange={setObjective} />
              <OptionGroup
                label={t('demo.prepare.teamSize')}
                options={DEMO_TEAM_SIZES.map((count) => ({ value: count, label: t('demo.prepare.teamSizeOption', { count }) }))}
                value={teamSize}
                onChange={setTeamSize}
              />
              <OptionGroup
                label={t('demo.prepare.duration')}
                options={DEMO_DURATIONS.map((minutes) => ({ value: minutes, label: t('demo.prepare.minutes', { minutes }) }))}
                value={targetMinutes}
                onChange={setTargetMinutes}
              />
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
                  {program.map((challenge) => (
                    <li key={challenge.id} className={styles.programItem}>
                      <div>
                        <p className={styles.programName}>{challenge.name}</p>
                        <p className={styles.programDescription}>{challenge.description}</p>
                      </div>
                      <div className={styles.programTags}>
                        <span>{t('demo.prepare.minutes', { minutes: getChallengeDuration(challenge) })}</span>
                        {resolveChallengePlayerRange(challenge).recommended ? (
                          <span>{t('demo.prepare.idealPlayers', { count: resolveChallengePlayerRange(challenge).recommended })}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.emptyText}>{t('demo.prepare.empty')}</p>
              )}
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
              <p className={styles.label}>{t('demo.invite.codeLabel')}</p>
              <p className={styles.code}>{sessionCode}</p>
              <p className={styles.label}>{t('demo.invite.linkLabel')}</p>
              <p className={styles.link}>{INVITE_HOST}/participant</p>
            </div>
            <div className={styles.lobbyCard}>
              <div className={styles.programHead}>
                <h3 className={styles.cardTitle}>
                  <Users size={18} aria-hidden="true" />
                  {t('demo.invite.joined', { joined: joinedCount, invited: teamSize })}
                </h3>
              </div>
              <div
                className={styles.meter}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={teamSize}
                aria-valuenow={joinedCount}
                aria-label={t('demo.invite.joined', { joined: joinedCount, invited: teamSize })}
              >
                <span style={{ width: `${(joinedCount / teamSize) * 100}%` }} />
              </div>
              <ul className={styles.participantList} aria-live="polite">
                {joinedParticipants.map((participant) => (
                  <li key={participant.id} className={styles.participant}>
                    <Avatar name={participant.name} />
                    <span className={styles.participantName}>{participant.name}</span>
                    <span className={styles.participantRole}>{participant.role}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.hint}>
                {joinedCount < joinTotal
                  ? t('demo.invite.waiting')
                  : teamSize > joinTotal ? t('demo.invite.absent', { count: teamSize - joinTotal }) : null}
              </p>
              <div className={styles.actions}>
                <Button disabled={joinedCount < joinTotal || !joinTotal} onClick={() => goToStep('facilitate')}>
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
                <h3 className={styles.cardTitle}>{activeChallenge.name}</h3>
                <span className={styles.liveBadge}>{t('demo.facilitate.statusLive')}</span>
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
              <p className={styles.label}>{t('demo.facilitate.feed')}</p>
              <ul className={styles.feed}>
                {visibleFeed.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
              <div className={styles.actions}>
                <Button onClick={advanceChallenge}>
                  {!isActiveDone
                    ? t('demo.facilitate.fastForward')
                    : activeIndex + 1 < program.length ? t('demo.facilitate.next') : t('demo.facilitate.finish')}
                </Button>
              </div>
            </div>
            <aside className={styles.timelineCard}>
              <h3 className={styles.cardTitle}>{t('demo.facilitate.program')}</h3>
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
            </aside>
          </div>
        ) : null}

        {step === 'play' && round ? (
          <div className={styles.playCard}>
            <p className={styles.label}>{t('demo.play.round', { current: roundIndex + 1, total: DEMO_PARI_ROUNDS.length })}</p>
            <p className={styles.presenter}>
              <Avatar name={round.presenter} />
              {t('demo.play.presenterSays', { name: round.presenter, role: presenter?.role[locale === 'en' ? 'en' : 'fr'] })}
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
