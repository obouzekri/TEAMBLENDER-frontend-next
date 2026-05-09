'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const pollRef = useRef(null);

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

    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) return;

    let cancelled = false;

    async function fetchRuntime() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/runtime-challenge`), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Erreur ${res.status}`);
        }
        const payload = await res.json();
        if (!cancelled) {
          setRuntime(payload || null);
          setRuntimeError('');
        }
      } catch (err) {
        if (!cancelled) {
          setRuntime(null);
          setRuntimeError(err?.message || 'Impossible de charger le challenge actif.');
        }
      } finally {
        if (!cancelled) setJoining(false);
      }
    }

    setJoining(true);
    setRuntimeError('');
    fetchRuntime();

    // Poll every 5s so participant sees new challenge when manager advances
    pollRef.current = setInterval(fetchRuntime, 5000);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
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
          <p>Votre session est en cours. Le challenge actif s'affichera ici automatiquement.</p>
          <div className="hero-actions">
            {sessionId && challengeLink ? (
              <Link className="btn-primary" href={challengeLink}>Rejoindre le challenge actif</Link>
            ) : sessionId && !joining && !runtimeError ? (
              <button type="button" className="btn-primary" disabled>
                En attente d&apos;un challenge...
              </button>
            ) : sessionId ? (
              <button type="button" className="btn-primary" disabled>
                {joining ? 'Chargement...' : 'Challenge indisponible'}
              </button>
            ) : (
              <Link className="btn-primary" href="/login">Revenir a la connexion</Link>
            )}
            <Link className="btn-secondary" href={userId ? `/home?userId=${encodeURIComponent(userId)}` : '/home'}>Aller a l'accueil</Link>
          </div>
        </section>

        <section className="feature-card">
          <h2>Informations de session</h2>
          <p>Session cible : <strong>{sessionId || 'Aucune session détectée dans l URL'}</strong></p>
          {runtime?.engine_key ? (
            <p>Challenge actif : <strong>{runtime.challenge_name || runtime.engine_key}</strong></p>
          ) : sessionId && !joining ? (
            <p style={{ color: 'var(--muted)' }}>Aucun challenge en cours — le facilitateur n&apos;a pas encore lancé.</p>
          ) : null}
          {joining && !runtime ? <p style={{ color: 'var(--muted)' }}>Chargement du challenge actif...</p> : null}
          {runtimeError ? <p style={{ color: 'var(--danger, #ef4444)' }}>Erreur : {runtimeError}</p> : null}
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
