'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSessionState } from '@/lib/useSessionState';

const ChallengeWrapper = dynamic(
  () => import('@/components/Challenges/ChallengeWrapper'),
  { ssr: false, loading: () => <p>Chargement...</p> }
);

export default function ChallengeRouteClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const engineKey = useMemo(() => String(params?.engineKey || 'escape_room_v1'), [params]);
  const sessionId = useMemo(
    () => String(searchParams?.get('sessionId') || searchParams?.get('id') || ''),
    [searchParams]
  );
  const { sessionState } = useSessionState(sessionId || null);
  const [completionOverlay, setCompletionOverlay] = useState(null);
  const countdownTimerRef = useRef(null);
  const completedChallengeIdRef = useRef('');

  const flowMode = String(sessionState?.flowMode || sessionState?.flow_mode || 'manual').trim().toLowerCase() === 'auto'
    ? 'auto'
    : 'manual';
  const activeChallengeId = String(sessionState?.active_challenge?.id || sessionState?.current_challenge?.id || sessionState?.active_challenge_id || '').trim();
  const activeEngineKey = String(sessionState?.current_challenge?.engine_key || engineKey).trim();

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const handleChallengeCompleted = useCallback((completion) => {
    const completedChallengeId = String(completion?.challengeId || activeChallengeId || '').trim();
    if (!completedChallengeId) {
      return;
    }

    completedChallengeIdRef.current = completedChallengeId;
    clearCountdown();

    if (flowMode === 'auto') {
      let remaining = 5;
      setCompletionOverlay({ mode: 'auto', countdown: remaining });
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearCountdown();
          setCompletionOverlay({ mode: 'auto', countdown: 0 });
          return;
        }
        setCompletionOverlay({ mode: 'auto', countdown: remaining });
      }, 1000);
      return;
    }

    setCompletionOverlay({ mode: 'manual', countdown: 0 });
  }, [activeChallengeId, clearCountdown, flowMode]);

  useEffect(() => {
    if (!completedChallengeIdRef.current || !sessionId) {
      return;
    }

    if (activeChallengeId && activeChallengeId !== completedChallengeIdRef.current) {
      clearCountdown();
      completedChallengeIdRef.current = '';
      setCompletionOverlay(null);
      router.replace(`/challenges/${encodeURIComponent(activeEngineKey)}?sessionId=${encodeURIComponent(sessionId)}`);
      return;
    }

    if (!activeChallengeId) {
      clearCountdown();
      completedChallengeIdRef.current = '';
      setCompletionOverlay(null);
      router.replace(`/participant?sessionId=${encodeURIComponent(sessionId)}`);
    }
  }, [activeChallengeId, activeEngineKey, clearCountdown, router, sessionId]);

  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  return (
    <>
      {completionOverlay ? (
        <section className="feature-card" style={{ maxWidth: '960px', margin: '24px auto 0' }}>
          <p className="eyebrow">CHALLENGE TERMINE</p>
          <h1 style={{ marginTop: '0.35rem' }}>
            {completionOverlay.mode === 'auto' ? 'Passage automatique en cours' : 'En attente du facilitateur'}
          </h1>
          <p style={{ margin: '0.75rem 0 0', color: 'var(--color-muted, #64748b)' }}>
            {completionOverlay.mode === 'auto'
              ? `Prochain challenge dans ${completionOverlay.countdown}s.`
              : 'Le facilitateur déclenchera le prochain challenge après le débrief.'}
          </p>
        </section>
      ) : null}
      <ChallengeWrapper
        key={`${sessionId}:${activeChallengeId || 'none'}:${engineKey}`}
        sessionId={sessionId}
        engineKey={engineKey}
        onChallengeCompleted={handleChallengeCompleted}
      />
    </>
  );
}
