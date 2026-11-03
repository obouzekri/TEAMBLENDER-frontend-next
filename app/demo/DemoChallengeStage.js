'use client';

import { useEffect, useRef, useState } from 'react';
import { mountRuntimeChallenge } from '@/lib/challenges/runtime';
import { ChallengeConnectionContext, ChallengeDemoContext } from '@/lib/challenges/connection-context';
import { createDemoChallengeServer } from '@/lib/demo/demoChallengeServer.mjs';
import wrapperStyles from '@/components/Challenges/ChallengeWrapper.module.css';

// Mounts a real challenge engine component against the in-browser demo server.
export default function DemoChallengeStage({
  scenario,
  locale,
  role = 'manager',
  participantId = 'demo-facilitator',
  participantSlot = null,
  displayName,
  loadingLabel,
  autoStart = false,
  onComplete,
}) {
  const [engine, setEngine] = useState(null);
  const serverRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const server = createDemoChallengeServer({
      scenario,
      role,
      participantId,
      participantSlot,
      onSummary: (summary, state) => onCompleteRef.current?.(summary, state),
    });
    serverRef.current = server;
    const challengeId = `demo-${scenario.engineKey}`;
    const runtimePayload = {
      engine_key: scenario.engineKey,
      challenge_id: challengeId,
      session_id: 'demo',
      config: server.getState().config,
      context: { role, locale, participantId, displayName, firstName: displayName },
    };
    const context = { role, locale, userId: participantId, participantId, sessionId: 'demo', challengeId, displayName, firstName: displayName };
    let cancelled = false;
    mountRuntimeChallenge(scenario.engineKey, runtimePayload, server.socket, context).then((definition) => {
      if (!cancelled) setEngine(definition);
    });
    return () => {
      cancelled = true;
      serverRef.current = null;
      server.dispose();
      setEngine(null);
    };
  }, [scenario, locale, role, participantId, participantSlot, displayName]);

  useEffect(() => {
    if (!autoStart || !engine) return undefined;
    const timer = window.setTimeout(() => serverRef.current?.dispatch('timer.start'), 100);
    return () => window.clearTimeout(timer);
  }, [autoStart, engine]);

  if (!engine) return <p role="status">{loadingLabel}</p>;
  const { component: EngineComponent, props } = engine;
  return (
    <div className={wrapperStyles.challengeContainer} data-demo-challenge={scenario.engineKey}>
      <ChallengeConnectionContext.Provider value>
        <ChallengeDemoContext.Provider value>
          <EngineComponent {...props} />
        </ChallengeDemoContext.Provider>
      </ChallengeConnectionContext.Provider>
    </div>
  );
}
