'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

function parseUser() {
  const raw = sessionStorage.getItem('currentUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function ParticipantPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [joining, setJoining] = useState(false);
  const [sessionInput, setSessionInput] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const currentUser = parseUser();

    if (!token || !currentUser) {
      window.location.replace('/login');
      return;
    }

    setUser(currentUser);
    setReady(true);
  }, []);

  const participantLabel = useMemo(() => {
    if (!user) return 'Participant';
    return user.first_name || user.firstname || user.email || 'Participant';
  }, [user]);

  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('sessionId') || sessionStorage.getItem('targetSessionId') || '';
  }, []);

  useEffect(() => {
    if (!ready || !sessionId) return;

    let cancelled = false;
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) return;

    setJoining(true);
    setRuntimeError('');

    fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/runtime-challenge`), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Erreur ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (!cancelled) {
          setRuntime(payload || null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRuntime(null);
          setRuntimeError(err?.message || 'Impossible de charger le challenge actif.');
        }
      })
      .finally(() => {
        if (!cancelled) setJoining(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, sessionId]);

  const challengeLink = useMemo(() => {
    const engine = String(runtime?.engine_key || '').trim();
    if (!engine || !sessionId) return '';
    return `/challenges/${encodeURIComponent(engine)}?sessionId=${encodeURIComponent(sessionId)}`;
  }, [runtime, sessionId]);

  const userId = useMemo(() => {
    if (!user) return '';
    return String(user.id || user.userId || user.participantId || '').trim();
  }, [user]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('targetSessionId');
    window.location.replace('/login');
  }

  function openSessionById(event) {
    event.preventDefault();
    const normalized = String(sessionInput || '').trim();
    if (!normalized) return;
    sessionStorage.setItem('targetSessionId', normalized);
    window.location.replace(`/participant?sessionId=${encodeURIComponent(normalized)}`);
  }

  if (!ready) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Verification de la session...</h1>
          <p>Chargement en cours.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={participantLabel} onLogout={logout} role="participant" />
      <main className="shell app-home">
        <section className="hero">
          <p className="eyebrow">ESPACE PARTICIPANT</p>
          <h1>Bienvenue {participantLabel}</h1>
          <p>Rejoignez la session et ouvrez le challenge actif depuis cette page.</p>
          <div className="hero-actions">
            {sessionId && challengeLink ? (
              <Link className="btn-primary" href={challengeLink}>Rejoindre le challenge actif</Link>
            ) : sessionId ? (
              <button type="button" className="btn-primary" disabled>
                {joining ? 'Chargement du challenge...' : 'Challenge indisponible'}
              </button>
            ) : (
              <Link className="btn-primary" href="/login">Revenir a la connexion</Link>
            )}
            <Link className="btn-secondary" href={userId ? `/home?userId=${encodeURIComponent(userId)}` : '/home'}>Aller a l'accueil</Link>
          </div>
        </section>

        <section className="feature-card">
          <h2>Informations de session</h2>
          <p>Session cible: {sessionId || 'Aucune session detectee dans l URL'}</p>
          {runtime?.engine_key ? <p>Challenge actif: {runtime.engine_key}</p> : null}
          {runtimeError ? <p>Erreur runtime: {runtimeError}</p> : null}
          <form onSubmit={openSessionById} className="auth-form" style={{ marginTop: '1rem' }}>
            <label>
              Ouvrir une session par ID
              <input
                type="text"
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                placeholder="Ex: 188"
              />
            </label>
            <button type="submit" className="btn-secondary">Charger session</button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
