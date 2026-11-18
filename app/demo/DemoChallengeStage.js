'use client';

import { useEffect, useRef, useState } from 'react';
import { mountRuntimeChallenge } from '@/lib/challenges/runtime';
import { ChallengeConnectionContext, ChallengeDemoContext } from '@/lib/challenges/connection-context';
import { createDemoChallengeServer } from '@/lib/demo/demoChallengeServer.mjs';
import wrapperStyles from '@/components/Challenges/ChallengeWrapper.module.css';
import styles from './Demo.module.css';

// Mounts a real challenge engine component on its own socket of the in-browser demo server.
function DemoChallengeScreen({
  server,
  engineKey,
  locale,
  role,
  participantId,
  participantSlot = null,
  displayName,
  loadingLabel,
  onReady,
}) {
  const [engine, setEngine] = useState(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const socket = server.connect({ role, participantId, participantSlot });
    const challengeId = `demo-${engineKey}`;
    const runtimePayload = {
      engine_key: engineKey,
      challenge_id: challengeId,
      session_id: 'demo',
      config: server.getState().config,
      context: { role, locale, participantId, displayName, firstName: displayName },
    };
    const context = { role, locale, userId: participantId, participantId, sessionId: 'demo', challengeId, displayName, firstName: displayName };
    let cancelled = false;
    mountRuntimeChallenge(engineKey, runtimePayload, socket, context).then((definition) => {
      if (cancelled) return;
      setEngine(definition);
      onReadyRef.current?.();
    });
    return () => {
      cancelled = true;
      socket.disconnect();
      setEngine(null);
    };
  }, [server, engineKey, locale, role, participantId, participantSlot, displayName]);

  if (!engine) return <p role="status">{loadingLabel}</p>;
  const { component: EngineComponent, props } = engine;
  return (
    <div className={wrapperStyles.challengeContainer} data-demo-challenge={engineKey} data-demo-role={role}>
      <ChallengeConnectionContext.Provider value>
        <ChallengeDemoContext.Provider value>
          <EngineComponent {...props} />
        </ChallengeDemoContext.Provider>
      </ChallengeConnectionContext.Provider>
    </div>
  );
}

// One shared game seen from two screens: the facilitator's and the visitor's, as a participant.
// Both stay mounted so switching views never resets a screen; `view` only decides which one shows.
export default function DemoChallengeStage({
  scenario,
  view = 'facilitator',
  locale,
  facilitatorName,
  visitor,
  labels,
  autoStart = false,
  onComplete,
}) {
  const [server, setServer] = useState(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const created = createDemoChallengeServer({
      scenario,
      onSummary: (summary, state) => onCompleteRef.current?.(summary, state),
    });
    setServer(created);
    return () => {
      created.dispose();
      setServer(null);
    };
  }, [scenario]);

  // Auto flow: the challenge starts once the facilitator screen is up, like the live session.
  const startTimerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(startTimerRef.current), [server]);
  function handleFacilitatorReady() {
    if (!autoStart || !server) return;
    startTimerRef.current = window.setTimeout(() => server.dispatch('timer.start'), 100);
  }

  if (!server) return <p role="status">{labels.loading}</p>;
  const panes = [
    {
      key: 'facilitator',
      title: labels.facilitatorScreen,
      screen: (
        <DemoChallengeScreen
          server={server}
          engineKey={scenario.engineKey}
          locale={locale}
          role="manager"
          participantId="demo-facilitator"
          displayName={facilitatorName}
          loadingLabel={labels.loading}
          onReady={handleFacilitatorReady}
        />
      ),
    },
    {
      key: 'participant',
      title: labels.participantScreen,
      screen: (
        <DemoChallengeScreen
          server={server}
          engineKey={scenario.engineKey}
          locale={locale}
          role="participant"
          participantId={visitor.id}
          participantSlot={1}
          displayName={visitor.name}
          loadingLabel={labels.loading}
        />
      ),
    },
  ];
  return (
    <div className={styles.screens} data-view={view}>
      {panes.map((pane) => (
        <section
          key={pane.key}
          id={`demo-screen-${pane.key}`}
          className={styles.screen}
          data-screen={pane.key}
          aria-label={pane.title}
          hidden={view !== 'split' && view !== pane.key}
        >
          {view === 'split' ? (
            <p className={styles.screenTitle} aria-hidden="true">{pane.title}</p>
          ) : null}
          {pane.screen}
        </section>
      ))}
    </div>
  );
}
