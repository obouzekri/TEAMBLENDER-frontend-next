'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSessionState } from '@/lib/useSessionState';
import { getApiUrl } from '@/lib/config';

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
  const [authoritativeEngineKey, setAuthoritativeEngineKey] = useState('');
  const countdownTimerRef = useRef(null);
  const completedChallengeIdRef = useRef('');

  const flowMode = String(sessionState?.flowMode || sessionState?.flow_mode || 'manual').trim().toLowerCase() === 'auto'
    ? 'auto'
    : 'manual';
  const activeChallengeId = String(sessionState?.active_challenge?.id || sessionState?.current_challenge?.id || sessionState?.active_challenge_id || '').trim();
  const activeEngineKey = String(
    authoritativeEngineKey
    || sessionState?.current_challenge?.engine_key
    || sessionState?.active_challenge?.engine_key
    || engineKey
  ).trim();
  const hasAuthoritativeState = Boolean(sessionState && typeof sessionState === 'object');

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
    if (!sessionId || !activeChallengeId) {
      setAuthoritativeEngineKey('');
      return;
    }

    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) {
      setAuthoritativeEngineKey('');
      return;
    }

    let cancelled = false;

    async function fetchAuthoritativeRuntime() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/runtime-challenge`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Erreur ${res.status}`);
        }

        const payload = await res.json();
        if (cancelled) {
          return;
        }

        const nextEngineKey = String(payload?.engine_key || '').trim();
        setAuthoritativeEngineKey(nextEngineKey);
      } catch {
        if (!cancelled) {
          setAuthoritativeEngineKey('');
        }
      }
    }

    fetchAuthoritativeRuntime();

    return () => {
      cancelled = true;
    };
  }, [activeChallengeId, sessionId]);

  useEffect(() => {
    if (!sessionId || !hasAuthoritativeState) {
      return;
    }

    if (!activeChallengeId) {
      clearCountdown();
      completedChallengeIdRef.current = '';
      setCompletionOverlay(null);
      router.replace(`/participant?sessionId=${encodeURIComponent(sessionId)}`);
      return;
    }

    if (activeEngineKey && activeEngineKey !== engineKey) {
      clearCountdown();
      completedChallengeIdRef.current = '';
      setCompletionOverlay(null);
      router.replace(`/challenges/${encodeURIComponent(activeEngineKey)}?sessionId=${encodeURIComponent(sessionId)}`);
    }
  }, [activeChallengeId, activeEngineKey, clearCountdown, engineKey, hasAuthoritativeState, router, sessionId]);

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
      <ChallengeWrapper
        key={`${sessionId}:${activeChallengeId || 'none'}:${engineKey}`}
        sessionId={sessionId}
        engineKey={engineKey}
        onChallengeCompleted={handleChallengeCompleted}
      />
      {completionOverlay ? (
        <section
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '18px',
            transform: 'translateX(-50%)',
            width: 'min(92vw, 820px)',
            borderRadius: '14px',
            border: '1px solid rgba(125, 211, 252, 0.35)',
            background: 'linear-gradient(140deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.96) 100%)',
            boxShadow: '0 14px 38px rgba(2, 6, 23, 0.45)',
            backdropFilter: 'blur(4px)',
            padding: '12px 16px',
            zIndex: 1200,
            color: '#e2e8f0',
            display: 'grid',
            gap: '4px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#7dd3fc',
            }}
          >
            Challenge terminé
          </p>
          <p style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700 }}>
            {completionOverlay.mode === 'auto' ? 'Passage automatique en cours' : 'En attente du facilitateur'}
          </p>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1' }}>
            {completionOverlay.mode === 'auto'
              ? `Prochain challenge dans ${completionOverlay.countdown}s.`
              : 'Le facilitateur déclenchera le prochain challenge après le débrief.'}
          </p>
        </section>
      ) : null}
    </>
  );
}
