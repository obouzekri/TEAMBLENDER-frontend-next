'use client';

import { useEffect, useRef, useState } from 'react';
import { mountRuntimeChallenge } from '@/lib/challenges/runtime';
import { ChallengeConnectionContext } from '@/lib/challenges/connection-context';
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
  onComplete,
}) {
  const [engine, setEngine] = useState(null);
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
      server.dispose();
      setEngine(null);
    };
  }, [scenario, locale, role, participantId, participantSlot, displayName]);

  if (!engine) return <p role="status">{loadingLabel}</p>;
  const { component: EngineComponent, props } = engine;
  return (
    <div className={wrapperStyles.challengeContainer} data-demo-challenge={scenario.engineKey}>
      <ChallengeConnectionContext.Provider value>
        <EngineComponent {...props} />
      </ChallengeConnectionContext.Provider>
    </div>
  );
}
