'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';
import { useSessionState } from '@/lib/useSessionState';

const ChallengeWrapper = dynamic(
  () => import('@/components/Challenges/ChallengeWrapper'),
  { ssr: false, loading: () => <p>Chargement du challenge...</p> }
);

function parseUser() {
  const raw = sessionStorage.getItem('currentUser');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

function authHeaders() {
  const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function isParticipantRole(role) {
  return String(role || '').trim().toLowerCase() === 'participant';
}

export default function SessionLiveClient() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params?.sessionId || '');

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(0);
  const autoAdvanceTimerRef = useRef(null);
  const completedChallengeKeyRef = useRef('');
  const { sessionState, refetch: refetchSessionState } = useSessionState(sessionId || null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const currentUser = parseUser();
    if (!token || !currentUser || isParticipantRole(currentUser.role)) {
      window.location.replace('/login');
      return;
    }
    setUser(currentUser);
  }, []);

  // Load session
  const loadSession = useCallback(() => {
    if (!sessionId) return;
    fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Impossible de charger la session.');
        setLoading(false);
      });
  }, [sessionId]);

  useEffect(() => {
    if (user) loadSession();
  }, [user, loadSession]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
  }

  const canManageFlow = user ? !isParticipantRole(user.role) : false;

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvanceCountdown(0);
  }, []);

  const advanceToNextChallenge = useCallback(async () => {
    if (!canManageFlow) {
      return;
    }

    setActionPending(true);
    setActionMsg('');
    try {
      const res = await fetch(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/flow/complete-active`),
        { method: 'PATCH', headers: authHeaders() }
      );
      if (!res.ok) {
        const body = await res.text();
        let payload = null;
        try {
          payload = body ? JSON.parse(body) : null;
        } catch {
          payload = null;
        }
        throw new Error(payload?.error || body || `Erreur ${res.status}`);
      }
      const updated = await res.json();
      setActionMsg(
        updated?.active_challenge_id
          ? 'Challenge suivant activé.'
          : 'Dernier challenge terminé.'
      );
      setSession((prev) => prev ? ({
        ...prev,
        active_challenge_id: updated?.active_challenge_id ?? prev.active_challenge_id,
        flow_mode: updated?.flow_mode || updated?.flowMode || prev.flow_mode,
      }) : prev);
      refetchSessionState();
    } catch (err) {
      setActionMsg(err.message || 'Erreur lors du passage au challenge suivant.');
    } finally {
      setActionPending(false);
    }
  }, [canManageFlow, refetchSessionState, sessionId]);

  const handleNextChallenge = useCallback(async () => {
    clearAutoAdvanceTimer();
    await advanceToNextChallenge();
  }, [advanceToNextChallenge, clearAutoAdvanceTimer]);

  async function handleEndSession() {
    if (!window.confirm('Terminer la session ?')) return;
    setActionPending(true);
    setActionMsg('');
    try {
      const res = await fetch(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`),
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ status: 'terminee' }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Erreur ${res.status}`);
      }
      router.push(`/session-results/${encodeURIComponent(sessionId)}`);
    } catch (err) {
      setActionMsg(err.message || 'Erreur lors de la fin de session.');
      setActionPending(false);
    }
  }

  const flowMode = String(
    sessionState?.flowMode
    || sessionState?.flow_mode
    || session?.flowMode
    || session?.flow_mode
    || 'manual'
  ).trim().toLowerCase() === 'auto' ? 'auto' : 'manual';

  const activeChallengeId = sessionState?.active_challenge_id ?? session?.active_challenge_id ?? null;

  const scheduleAutoAdvance = useCallback(() => {
    clearAutoAdvanceTimer();
    let remaining = 5;
    setAutoAdvanceCountdown(remaining);
    autoAdvanceTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearAutoAdvanceTimer();
        advanceToNextChallenge();
        return;
      }
      setAutoAdvanceCountdown(remaining);
    }, 1000);
  }, [advanceToNextChallenge, clearAutoAdvanceTimer]);

  const handleChallengeCompleted = useCallback((completion) => {
    const completedChallengeId = String(
      completion?.challengeId
      || sessionState?.current_challenge?.id
      || activeChallengeId
      || ''
    ).trim();

    if (!completedChallengeId) {
      return;
    }

    const completionKey = `${completedChallengeId}:${flowMode}`;
    if (completedChallengeKeyRef.current === completionKey) {
      return;
    }
    completedChallengeKeyRef.current = completionKey;

    if (flowMode === 'auto' && canManageFlow) {
      setActionMsg('Challenge terminé. Passage automatique en cours...');
      scheduleAutoAdvance();
      return;
    }

    if (canManageFlow) {
      setActionMsg('Challenge terminé. Passez au challenge suivant quand vous êtes prêt.');
    }
  }, [activeChallengeId, canManageFlow, flowMode, scheduleAutoAdvance, sessionState?.current_challenge?.id]);

  useEffect(() => {
    completedChallengeKeyRef.current = '';
    clearAutoAdvanceTimer();
  }, [activeChallengeId, clearAutoAdvanceTimer]);

  useEffect(() => {
    return () => {
      clearAutoAdvanceTimer();
    };
  }, [clearAutoAdvanceTimer]);

  // Derive active challenge info
  const challenges = Array.isArray(session?.challenges) ? session.challenges : [];
  const activeChallenge = sessionState?.current_challenge
    || (activeChallengeId ? challenges.find((c) => c.id === activeChallengeId) || null : challenges[0] || null);
  const activeEngineKey = activeChallenge?.engine_key || '';
  const assignedParticipantCount = Array.isArray(session?.assigned_participants) ? session.assigned_participants.length : 0;
  const participantCount = Array.isArray(session?.participants) ? session.participants.length : 0;
  const memberCount = assignedParticipantCount || participantCount || (Array.isArray(session?.members) ? session.members.length : 0);
  const userLabel = pickDisplayName(user);

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Chargement de la session...</h1>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Erreur</h1>
          <p className="error">{error}</p>
          <Link href="/home" className="btn-secondary">Retour a l&apos;accueil</Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role="participant-live" />
      <main className="shell app-home">
        <section className="session-live-header">
          <div className="session-live-header__row1">
            <strong className="session-live-header__name">{session?.name || `Session ${sessionId}`}</strong>
            <span className="eyebrow session-live-header__meta">{memberCount} participant{memberCount !== 1 ? 's' : ''}</span>
            {activeChallenge && (
              <span className="eyebrow session-live-header__meta">{activeChallenge.name || activeEngineKey}</span>
            )}
          </div>
          <div className="session-live-header__row2">
            {flowMode === 'manual' ? (
              <button
                type="button"
                className="btn-primary btn--sm"
                onClick={handleNextChallenge}
                disabled={actionPending || !canManageFlow}
              >
                {actionPending ? 'En cours...' : 'Passer au challenge suivant'}
              </button>
            ) : (
              <span className="session-live-header__msg">
                {autoAdvanceCountdown > 0
                  ? `Passage automatique dans ${autoAdvanceCountdown}s`
                  : 'Passage automatique activé'}
              </span>
            )}
            {flowMode === 'auto' && canManageFlow ? (
              <button
                type="button"
                className="btn-secondary btn--sm"
                onClick={handleNextChallenge}
                disabled={actionPending}
              >
                Forcer le passage
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary btn--sm"
              onClick={handleEndSession}
              disabled={actionPending}
            >
              Terminer
            </button>
            {actionMsg && <span className="session-live-header__msg">{actionMsg}</span>}
          </div>
        </section>

        {activeEngineKey ? (
          <section className="feature-card" style={{ padding: 0 }}>
            <ChallengeWrapper
              key={`${sessionId}:${activeChallengeId || 'none'}:${activeEngineKey}`}
              sessionId={sessionId}
              engineKey={activeEngineKey}
              noNav
              onChallengeCompleted={handleChallengeCompleted}
            />
          </section>
        ) : (
          <section className="feature-card">
            <h2>Aucun challenge actif</h2>
            <p>
              Activez un challenge depuis le{' '}
              <Link href={`/session-builder?sessionId=${encodeURIComponent(sessionId)}`}>
                session builder
              </Link>
              .
            </p>
          </section>
        )}

        {challenges.length > 1 && (
          <section className="feature-card">
            <h2>Challenges de la session</h2>
            <ul className="challenge-list">
              {challenges.map((ch) => (
                <li
                  key={ch.id}
                  className="challenge-list-item"
                >
                  <span
                    className={`challenge-dot ${ch.id === activeChallengeId ? 'challenge-dot--active' : 'challenge-dot--inactive'}`}
                  />
                  <span>{ch.name || ch.engine_key}</span>
                  {ch.id === activeChallengeId && (
                    <span className="eyebrow challenge-label-active">actif</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
