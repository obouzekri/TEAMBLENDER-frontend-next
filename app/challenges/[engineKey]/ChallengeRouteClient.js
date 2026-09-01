'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSessionState } from '@/lib/useSessionState';
import { trackProductChallengeEvent } from '@/lib/analytics';
import { getApiUrl } from '@/lib/config';
import { getStoredAuthToken } from '@/lib/auth-storage';

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
    if (!sessionId || !engineKey) return;
    trackProductChallengeEvent('opened', {
      sessionId,
      challengeId: activeChallengeId || undefined,
      challengeEngineKey: engineKey,
      surface: 'challenge_route',
    });
  }, [activeChallengeId, engineKey, sessionId]);

  useEffect(() => {
    if (!sessionId || !activeChallengeId) {
      setAuthoritativeEngineKey('');
      return;
    }

    const token = getStoredAuthToken();
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
            width: 'min(100%, 980px)',
            margin: '8px auto 16px',
            borderRadius: '8px',
            border: '1px solid var(--accent-soft, #bae6fd)',
            background: 'var(--color-surface, #f0f9ff)',
            boxShadow: '0 2px 8px rgba(14, 116, 144, 0.08)',
            padding: '8px 12px',
            color: 'var(--text-strong, #0f172a)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>✅</span>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.4 }}>
            <strong>Challenge terminé</strong>
            {' · '}
            En attente du facilitateur pour lancer le prochain challenge après le débrief.
          </p>
        </section>
      ) : null}
    </>
  );
}
