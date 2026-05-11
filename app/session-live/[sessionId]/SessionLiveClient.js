'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

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
  const completedChallengeGuardRef = useRef('');

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

  const handleNextChallenge = useCallback(async ({ auto = false } = {}) => {
    setActionPending(true);
    if (!auto) {
      setActionMsg('');
    }
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
      setSession((prev) => ({ ...prev, ...updated }));
      completedChallengeGuardRef.current = '';
    } catch (err) {
      setActionMsg(err.message || 'Erreur lors du passage au challenge suivant.');
    } finally {
      setActionPending(false);
    }
  }, [sessionId]);

  async function handleEndSession() {
    if (!window.confirm('Terminer la session ?')) return;
    setActionPending(true);
    setActionMsg('');
    try {
      const res = await fetch(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/phase`),
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ phase: 'terminee' }),
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

  // Derive active challenge info
  const challenges = Array.isArray(session?.challenges) ? session.challenges : [];
  const activeChallenge = session?.active_challenge_id
    ? challenges.find((c) => c.id === session.active_challenge_id) || null
    : challenges[0] || null;
  const activeEngineKey = activeChallenge?.engine_key || '';
  const assignedParticipantCount = Array.isArray(session?.assigned_participants) ? session.assigned_participants.length : 0;
  const participantCount = Array.isArray(session?.participants) ? session.participants.length : 0;
  const memberCount = assignedParticipantCount || participantCount || (Array.isArray(session?.members) ? session.members.length : 0);
  const userLabel = pickDisplayName(user);
  const canManageFlow = user ? !isParticipantRole(user.role) : false;

  const handleChallengeCompleted = useCallback(() => {
    if (!canManageFlow) {
      return;
    }

    const activeChallengeId = Number(session?.active_challenge_id || 0);
    if (!activeChallengeId || actionPending) {
      return;
    }

    const guardKey = `${sessionId}:${activeChallengeId}`;
    if (completedChallengeGuardRef.current === guardKey) {
      return;
    }

    completedChallengeGuardRef.current = guardKey;
    handleNextChallenge({ auto: true });
  }, [canManageFlow, session, sessionId, actionPending, handleNextChallenge]);

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
        <section className="hero">
          <p className="eyebrow">SESSION EN COURS</p>
          <h1>{session?.name || `Session ${sessionId}`}</h1>
          <div className="session-live-meta">
            <span className="eyebrow">{memberCount} participant{memberCount !== 1 ? 's' : ''}</span>
            {activeChallenge && (
              <span className="eyebrow">Challenge actif : {activeChallenge.name || activeEngineKey}</span>
            )}
            {session?.status && <span className="eyebrow">Statut : {{ en_cours: 'En cours', preparee: 'En préparation', terminee: 'Terminée' }[session.status] || session.status}</span>}
          </div>
          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleNextChallenge}
              disabled={actionPending || !canManageFlow}
            >
              {actionPending ? 'En cours...' : 'Challenge suivant'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleEndSession}
              disabled={actionPending}
            >
              Terminer la session
            </button>
            <Link href={`/session-builder?sessionId=${encodeURIComponent(sessionId)}`} className="btn-secondary">
              Retour au builder
            </Link>
          </div>
          {actionMsg && <p style={{ marginTop: '0.75rem' }}>{actionMsg}</p>}
        </section>

        {activeEngineKey ? (
          <section className="feature-card" style={{ padding: 0 }}>
            <ChallengeWrapper
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
                    className={`challenge-dot ${ch.id === session?.active_challenge_id ? 'challenge-dot--active' : 'challenge-dot--inactive'}`}
                  />
                  <span>{ch.name || ch.engine_key}</span>
                  {ch.id === session?.active_challenge_id && (
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
