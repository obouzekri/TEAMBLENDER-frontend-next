'use client';

import { useCallback, useEffect, useState } from 'react';
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

function authHeaders() {
  const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
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

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const currentUser = parseUser();
    if (!token || !currentUser || currentUser.role === 'participant') {
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

  async function handleNextChallenge() {
    setActionPending(true);
    setActionMsg('');
    try {
      const res = await fetch(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/flow/complete-active`),
        { method: 'PATCH', headers: authHeaders() }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Erreur ${res.status}`);
      }
      const updated = await res.json();
      setActionMsg('Challenge suivant activé.');
      setSession((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setActionMsg(err.message || 'Erreur lors du passage au challenge suivant.');
    } finally {
      setActionPending(false);
    }
  }

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
  const userLabel = user ? (user.first_name || user.email || 'Manager') : 'Manager';

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
      <AppNav userLabel={userLabel} onLogout={logout} role={user?.role} />
      <main className="shell app-home">
        <section className="hero">
          <p className="eyebrow">SESSION EN COURS</p>
          <h1>{session?.name || `Session ${sessionId}`}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span className="eyebrow">{memberCount} participant{memberCount !== 1 ? 's' : ''}</span>
            {activeChallenge && (
              <span className="eyebrow">Challenge actif : {activeChallenge.name || activeEngineKey}</span>
            )}
            {session?.status && <span className="eyebrow">Statut : {{ en_cours: 'En cours', preparee: 'En préparation', terminee: 'Terminée' }[session.status] || session.status}</span>}
          </div>
          <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleNextChallenge}
              disabled={actionPending}
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
            <ChallengeWrapper sessionId={sessionId} engineKey={activeEngineKey} noNav />
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
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {challenges.map((ch) => (
                <li
                  key={ch.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: ch.id === session?.active_challenge_id ? 'var(--accent)' : 'var(--border)',
                      flexShrink: 0,
                    }}
                  />
                  <span>{ch.name || ch.engine_key}</span>
                  {ch.id === session?.active_challenge_id && (
                    <span className="eyebrow" style={{ marginLeft: 'auto' }}>actif</span>
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
