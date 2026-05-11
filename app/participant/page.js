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
  {/* Assigned sessions card */}
  const [user, setUser] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [joining, setJoining] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedSessions, setAssignedSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const pollRef = useRef(null);
  const [ready, setReady] = useState(false);

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

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;

    function syncSessionFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = String(params.get('sessionId') || '').trim();
      const resolved = fromQuery || String(sessionStorage.getItem('targetSessionId') || '').trim();
      if (fromQuery) {
        sessionStorage.setItem('targetSessionId', fromQuery);
      }
      setSessionId(resolved);
    }

    syncSessionFromLocation();
    window.addEventListener('popstate', syncSessionFromLocation);
    return () => window.removeEventListener('popstate', syncSessionFromLocation);
  }, [ready]);

  const getSessionIdentifier = useCallback((session) => {
    const id = session?.id ?? session?.session_id ?? session?.sessionId;
    return id == null ? '' : String(id).trim();
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

// Load participant's assigned sessions
  useEffect(() => {
    if (!ready) return;

    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) return;

    async function fetchAssignedSessions() {
      setLoadingSessions(true);
      try {
        const res = await fetch(getApiUrl('/participants/me/sessions'), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const sessions = Array.isArray(data) ? data : (data?.data || data?.sessions || []);
          setAssignedSessions(Array.isArray(sessions) ? sessions : []);
        }
      } catch (err) {
        // Silently fail - assigned sessions are nice to have
      } finally {
        setLoadingSessions(false);
      }
    }

    fetchAssignedSessions();
  }, [ready]);
  // Load team members for the session
  useEffect(() => {
    if (!ready || !sessionId) return;

    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) return;

    async function fetchTeamMembers() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participants`), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const members = Array.isArray(data) ? data : (data?.data || data?.participants || []);
          setTeamMembers(members);
        }
      } catch (err) {
        // Silently fail - team members are nice to have but not critical
      }
    }

    fetchTeamMembers();
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
          <p>{assignedSessions.length > 0 && !sessionId ? 'Selectionnez une session pour commencer.' : 'Votre session est en cours. Le challenge actif s\'affichera ici automatiquement.'}</p>
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
            ) : assignedSessions.length === 0 ? (
              <Link className="btn-primary" href="/login">Revenir a la connexion</Link>
            ) : null}
            <Link className="btn-secondary" href={userId ? `/home?userId=${encodeURIComponent(userId)}` : '/home'}>Retour a l'accueil</Link>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Assigned sessions cards - displayed when no session is selected */}
          {assignedSessions.length > 0 && !sessionId && (
            <section className="feature-card" style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ marginBottom: '1rem' }}>Vos sessions assignées</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
              }}>
                {assignedSessions.map((session) => {
                  const sessionIdentifier = getSessionIdentifier(session);
                  if (!sessionIdentifier) return null;
                  const statusLabel = session.status === 'en_cours'
                    ? 'En cours'
                    : session.status === 'preparee'
                      ? 'En préparation'
                      : session.status === 'terminee'
                        ? 'Terminée'
                        : session.status || '';
                  const joinUrl = `/participant?sessionId=${encodeURIComponent(sessionIdentifier)}`;
                  return (
                    <article
                      key={sessionIdentifier}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '16px',
                        border: '1px solid var(--line, #e2e8f0)',
                        borderRadius: '12px',
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 700, margin: '0 0 6px', fontSize: '15px', color: 'var(--ink, #1e293b)' }}>
                          {session.name || `Session #${sessionIdentifier}`}
                        </p>
                        {statusLabel && (
                          <span className={`status-pill status-${session.status || 'preparee'}`}>
                            {statusLabel}
                          </span>
                        )}
                        {session.session_date && (
                          <p style={{ color: 'var(--ink-soft, #64748b)', margin: '8px 0 0', fontSize: '12px' }}>
                            {new Date(session.session_date).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem('targetSessionId', sessionIdentifier);
                            window.location.assign(joinUrl);
                          }
                        }}
                      >
                        Rejoindre
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Session info card - displayed when a session is selected */}
          {sessionId && (
          <section className="feature-card">
            <h2>Informations de session</h2>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--color-muted, #6b7280)' }}>
              ID de session: <strong style={{ color: 'var(--color-text, #111)' }}>{sessionId}</strong>
            </p>
            {runtime?.engine_key ? (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text, #111)' }}>
                Challenge actif: <strong>{runtime.challenge_name || runtime.engine_key}</strong>
              </p>
            ) : sessionId && !joining ? (
              <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>Aucun challenge en cours — le facilitateur n&apos;a pas encore lancé.</p>
            ) : null}
            {joining && !runtime ? <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>Chargement du challenge actif...</p> : null}
            {runtimeError ? <p style={{ color: 'var(--color-danger, #ef4444)', margin: 0, fontSize: '13px' }}>Erreur : {runtimeError}</p> : null}
          </section>
          )}

          {/* Team members card - shown when session is active */}
          {sessionId && teamMembers.length > 0 && (
            <section className="feature-card">
              <h2>Membres de l'équipe</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teamMembers.slice(0, 6).map((member) => (
                  <li
                    key={String(member.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--color-border, #e5e7eb)',
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '14px', color: 'var(--color-text, #111)' }}>
                        {String(member.first_name || member.firstname || '').trim() || 'Participant'} {String(member.last_name || member.lastname || '').trim()}
                      </p>
                      {member.email && (
                        <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '12px' }}>{member.email}</p>
                      )}
                    </div>
                    {member.disabled ? (
                      <span style={{ fontSize: '12px', padding: '4px 8px', background: '#f3f4f6', color: '#6b7280', borderRadius: '6px' }}>Inactif</span>
                    ) : (
                      <span style={{ fontSize: '12px', padding: '4px 8px', background: '#d1fae5', color: '#065f46', borderRadius: '6px' }}>Actif</span>
                    )}
                  </li>
                ))}
              </ul>
              {teamMembers.length > 6 && (
                <p style={{ fontSize: '12px', color: 'var(--color-muted, #6b7280)', margin: '12px 0 0', textAlign: 'center' }}>
                  +{teamMembers.length - 6} autre{teamMembers.length - 6 > 1 ? 's' : ''}
                </p>
              )}
            </section>
          )}

          {/* Empty state when no sessions and not loading */}
          {!sessionId && assignedSessions.length === 0 && !loadingSessions && (
            <section className="feature-card">
              <h2>Aucune session assignée</h2>
              <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                Vous n&apos;avez pas encore de session assignée. Contactez votre administrateur.
              </p>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
