'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';
import { useSessionState } from '@/lib/useSessionState';
import { clearStoredAuth, getAuthHeaders } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

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
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  {/* Assigned sessions card */}
  const [user, setUser] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [joining, setJoining] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignedSessions, setAssignedSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [joiningSessionId, setJoiningSessionId] = useState(null);
  const hasRedirected = useRef(false);
  const authInitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const { sessionState, connected, reconnecting, pollingActive } = useSessionState(sessionId || null);
  const flowMode = String(sessionState?.flowMode || sessionState?.flow_mode || 'manual').trim().toLowerCase() === 'auto'
    ? 'auto'
    : 'manual';

  useEffect(() => {
    if (authInitRef.current) {
      return;
    }

    const currentUser = parseUser();

    if (!currentUser) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    authInitRef.current = true;
    setUser(currentUser);
    setReady(true);
  }, [withLocalePath]);

  useEffect(() => {
    if (!ready || !user) return;

    const hasName = Boolean(
      String(user.name || '').trim()
      || String(user.first_name || user.firstname || '').trim()
    );
    if (hasName) return;

    let cancelled = false;

    async function hydrateParticipantIdentity() {
      try {
        const res = await fetch(getApiUrl('/participants/me'), {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (!res.ok) return;

        const payload = await res.json();
        if (!payload || cancelled) return;

        const firstName = String(payload.first_name || payload.firstname || '').trim();
        const lastName = String(payload.last_name || payload.lastname || '').trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

        const mergedUser = {
          ...user,
          first_name: firstName || user.first_name || user.firstname || '',
          firstname: firstName || user.firstname || user.first_name || '',
          last_name: lastName || user.last_name || user.lastname || '',
          lastname: lastName || user.lastname || user.last_name || '',
          name: fullName || String(user.name || '').trim(),
        };

        setUser(mergedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(mergedUser));
      } catch {
        // Keep existing label fallback if the enrichment endpoint is unavailable.
      }
    }

    hydrateParticipantIdentity();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const participantLabel = useMemo(() => {
    if (!user) return 'Participant';
    const name = String(user.name || '').trim();
    const firstName = String(user.first_name || user.firstname || '').trim();
    const lastName = String(user.last_name || user.lastname || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name || fullName || firstName || user.email || 'Participant';
  }, [user]);

  const connectionState = useMemo(() => {
    if (!sessionId) return '';
    if (connected) return 'connected';
    if (reconnecting || pollingActive) return 'reconnecting';
    return 'offline';
  }, [connected, pollingActive, reconnecting, sessionId]);

  const asyncStatusMessage = useMemo(() => {
    if (joiningSessionId) return isEn ? 'Connecting to session...' : 'Connexion a la session en cours...';
    if (joining) return isEn ? 'Loading active challenge...' : 'Chargement du challenge actif...';
    if (loadingSessions) return isEn ? 'Loading assigned sessions...' : 'Chargement des sessions assignées...';
    return '';
  }, [isEn, joiningSessionId, joining, loadingSessions]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;

    function syncSessionFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = String(params.get('sessionId') || '').trim();
      if (fromQuery) {
        // Explicit sessionId in URL: store it and use it
        sessionStorage.setItem('targetSessionId', fromQuery);
        setSessionId(fromQuery);
      } else {
        // No sessionId in URL: clear stored session so the list shows
        sessionStorage.removeItem('targetSessionId');
        hasRedirected.current = false;
        setSessionId('');
      }
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

    const hasActiveChallenge = Boolean(sessionState?.active_challenge_id);
    if (!hasActiveChallenge) {
      setRuntime(null);
      setRuntimeError('');
      setJoining(false);
      return;
    }

    let cancelled = false;

    async function fetchRuntime() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/runtime-challenge`), {
          headers: getAuthHeaders(),
          credentials: 'include',
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
          setRuntimeError(err?.message || (isEn ? 'Unable to load active challenge.' : 'Impossible de charger le challenge actif.'));
        }
      } finally {
        if (!cancelled) setJoining(false);
      }
    }

    setJoining(true);
    setRuntimeError('');
    fetchRuntime();

    return () => {
      cancelled = true;
    };
  }, [isEn, ready, sessionId, sessionState?.active_challenge_id]);

// Load participant's assigned sessions
  useEffect(() => {
    if (!ready) return;

    async function fetchAssignedSessions() {
      setLoadingSessions(true);
      try {
        const res = await fetch(getApiUrl('/participants/me/sessions'), {
          headers: getAuthHeaders(),
          credentials: 'include',
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

    async function fetchTeamMembers() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/participants`), {
          headers: getAuthHeaders(),
          credentials: 'include',
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
    return withLocalePath(`/challenges/${encodeURIComponent(engine)}?sessionId=${encodeURIComponent(sessionId)}`);
  }, [runtime, sessionId, withLocalePath]);

  // Auto-redirect to challenge as soon as it is available (removes the manual second click)
  useEffect(() => {
    if (!challengeLink || hasRedirected.current) return;
    hasRedirected.current = true;
    router.push(challengeLink);
  }, [challengeLink, router]);


  async function joinSession(sessionIdentifier) {
    if (!sessionIdentifier) return;
    const selectedSession = assignedSessions.find((session) => getSessionIdentifier(session) === String(sessionIdentifier));
    if (String(selectedSession?.status || '').trim().toLowerCase() !== 'en_cours') {
      return;
    }
    setJoiningSessionId(sessionIdentifier);
    try {
      const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionIdentifier)}/runtime-challenge`), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const payload = await res.json();
        const engine = String(payload?.engine_key || '').trim();
        if (engine) {
          // Challenge is active — go directly to it
          sessionStorage.setItem('targetSessionId', sessionIdentifier);
          router.push(withLocalePath(`/challenges/${encodeURIComponent(engine)}?sessionId=${encodeURIComponent(sessionIdentifier)}`));
          return;
        }
      }
    } catch {
      // fall through to waiting room
    }
    // No active challenge yet — go to participant waiting room for this session
    sessionStorage.setItem('targetSessionId', sessionIdentifier);
    router.push(withLocalePath(`/participant?sessionId=${encodeURIComponent(sessionIdentifier)}`));
  }

  function logout() {
    clearStoredAuth();
    sessionStorage.removeItem('targetSessionId');
    window.location.replace(withLocalePath('/login'));
  }



  if (!ready) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{isEn ? 'Checking session...' : 'Verification de la session...'}</h1>
          <p>{isEn ? 'Loading...' : 'Chargement en cours.'}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={participantLabel} onLogout={logout} role="participant" connectionState={connectionState} />
      <main className="shell app-home participant-home">
        <section className="hero participant-hero">
          <h1>{isEn ? `Welcome ${participantLabel}` : `Bienvenue ${participantLabel}`}</h1>
          <p>
            {assignedSessions.length > 0 && !sessionId
              ? (isEn ? 'Select a session to get started.' : 'Sélectionnez une session pour commencer.')
              : (isEn
                ? 'Your session is running. The active challenge will appear here automatically.'
                : 'Votre session est en cours. Le challenge actif s\'affichera ici automatiquement.')}
          </p>
          <div className="hero-actions">
            {sessionId && challengeLink ? (
              <button type="button" className="btn-primary" disabled>
                {isEn ? 'Connecting to challenge...' : 'Connexion au challenge...'}
              </button>
            ) : sessionId && !joining && !runtimeError ? (
              <button type="button" className="btn-primary" disabled>
                {flowMode === 'auto'
                  ? (isEn ? 'Automatic progression is being prepared...' : 'Passage automatique en préparation...')
                  : (isEn ? 'Waiting for facilitator...' : 'En attente du facilitateur...')}
              </button>
            ) : sessionId ? (
              <button type="button" className="btn-primary" disabled>
                {joining ? (isEn ? 'Loading...' : 'Chargement...') : (isEn ? 'Challenge unavailable' : 'Challenge indisponible')}
              </button>
            ) : assignedSessions.length === 0 ? (
              <Link className="btn-primary" href={withLocalePath('/login')}>
                {isEn ? 'Back to login' : 'Revenir à la connexion'}
              </Link>
            ) : null}
          </div>
          <div className="participant-hero-trust" aria-label={isEn ? 'Participant guideposts' : 'Repères participant'}>
            <span>{isEn ? 'Individual access' : 'Accès individuel'}</span>
            <span>{isEn ? 'Real-time session' : 'Session en temps réel'}</span>
            <span>{isEn ? 'Guided experience' : 'Expérience guidée'}</span>
          </div>
          {asyncStatusMessage ? (
            <p className="ui-async-status" role="status" aria-live="polite">{asyncStatusMessage}</p>
          ) : null}
        </section>

        <div className="participant-grid">
          {/* Loading skeleton while sessions are being fetched */}
          {loadingSessions && !sessionId && (
            <section className="feature-card participant-panel participant-panel--wide">
              <div className="participant-panel__head">
                <div>
                  <p className="eyebrow">{isEn ? 'ASSIGNED SESSIONS' : 'SESSIONS ASSIGNÉES'}</p>
                  <h2>{isEn ? 'Loading your sessions...' : 'Chargement de vos sessions...'}</h2>
                </div>
              </div>
              <p className="participant-help-text">{isEn ? 'Retrieving data...' : 'Récupération en cours...'}</p>
            </section>
          )}

          {/* Assigned sessions cards - displayed when no session is selected */}
          {assignedSessions.length > 0 && !sessionId && (
            <section className="feature-card participant-panel participant-panel--wide">
              <div className="participant-panel__head">
                <div>
                  <p className="eyebrow">{isEn ? 'ASSIGNED SESSIONS' : 'SESSIONS ASSIGNÉES'}</p>
                  <h2>{isEn ? 'Your assigned sessions' : 'Vos sessions assignées'}</h2>
                </div>
              </div>
              <div className="participant-sessions-grid">
                {assignedSessions.map((session) => {
                  const sessionIdentifier = getSessionIdentifier(session);
                  if (!sessionIdentifier) return null;
                  const isSessionLive = String(session.status || '').trim().toLowerCase() === 'en_cours';
                  const statusLabel = session.status === 'en_cours'
                    ? (isEn ? 'In progress' : 'En cours')
                    : session.status === 'preparee'
                      ? (isEn ? 'Prepared' : 'En préparation')
                      : session.status === 'terminee'
                        ? (isEn ? 'Completed' : 'Terminée')
                        : session.status || '';
                  return (
                    <article key={sessionIdentifier} className="participant-session-card">
                      <div className="participant-session-card__body">
                        <p className="participant-session-card__name">
                          {session.name || `Session #${sessionIdentifier}`}
                        </p>
                        {statusLabel && (
                          <span className={`status-pill status-${session.status || 'preparee'}`}>
                            {statusLabel}
                          </span>
                        )}
                        {session.session_date && (
                          <p className="participant-session-card__date">
                            📅 {new Date(session.session_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { dateStyle: 'medium' })}
                          </p>
                        )}
                      </div>
                      <div className="participant-session-card__footer">
                        <button
                          type="button"
                          className="btn-primary participant-session-card__cta"
                          disabled={joiningSessionId === sessionIdentifier || !isSessionLive}
                          onClick={() => joinSession(sessionIdentifier)}
                        >
                          {joiningSessionId === sessionIdentifier
                            ? (isEn ? 'Connecting...' : 'Connexion...')
                            : isSessionLive
                              ? (isEn ? 'Join' : 'Rejoindre')
                              : (isEn ? 'Waiting for launch' : 'En attente du lancement')}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Session info card - displayed when a session is selected */}
          {sessionId && (
          <section className="feature-card participant-panel">
            <div className="participant-panel__head">
              <div>
                <p className="eyebrow">{isEn ? 'ACTIVE SESSION' : 'SESSION ACTIVE'}</p>
                <h2>{isEn ? 'Session information' : 'Informations de session'}</h2>
              </div>
            </div>
            <p className="participant-meta-line">
              {isEn ? 'Session ID:' : 'ID de session:'} <strong>{sessionId}</strong>
            </p>
            {runtime?.engine_key ? (
              <p className="participant-meta-line participant-meta-line--strong">
                {isEn ? 'Active challenge:' : 'Challenge actif:'} <strong>{runtime.challenge_name || runtime.engine_key}</strong>
              </p>
            ) : sessionId && !joining ? (
              <p className="participant-help-text">
                {flowMode === 'auto'
                  ? (isEn
                    ? 'No active challenge yet. Progression will happen automatically as the session advances.'
                    : 'Aucun challenge actif pour le moment. Le passage se fera automatiquement dès que la session avancera.')
                  : (isEn
                    ? 'No challenge in progress yet. The facilitator has not started or moved to the next challenge.'
                    : 'Aucun challenge en cours — le facilitateur n&apos;a pas encore lancé ou n&apos;a pas encore passé au challenge suivant.')}
              </p>
            ) : null}
            {joining && !runtime ? <p className="participant-help-text">{isEn ? 'Loading active challenge...' : 'Chargement du challenge actif...'}</p> : null}
            {runtimeError ? <p className="participant-error-text">{isEn ? 'Error:' : 'Erreur :'} {runtimeError}</p> : null}
          </section>
          )}

          {/* Team members card - shown when session is active */}
          {sessionId && teamMembers.length > 0 && (
            <section className="feature-card participant-panel">
              <div className="participant-panel__head">
                <div>
                  <p className="eyebrow">{isEn ? 'TEAM' : 'ÉQUIPE'}</p>
                  <h2>{isEn ? 'Team members' : 'Membres de l\'équipe'}</h2>
                </div>
              </div>
              <ul className="participant-team-list">
                {teamMembers.slice(0, 6).map((member) => (
                  <li key={String(member.id)} className="participant-team-list__item">
                    <div className="participant-team-list__info">
                      <p className="participant-team-list__name">
                        {String(member.first_name || member.firstname || '').trim() || 'Participant'} {String(member.last_name || member.lastname || '').trim()}
                      </p>
                      {member.email && (
                        <p className="participant-team-list__email">{member.email}</p>
                      )}
                    </div>
                    {member.disabled ? (
                      <span className="participant-team-badge participant-team-badge--inactive">{isEn ? 'Inactive' : 'Inactif'}</span>
                    ) : (
                      <span className="participant-team-badge participant-team-badge--active">{isEn ? 'Active' : 'Actif'}</span>
                    )}
                  </li>
                ))}
              </ul>
              {teamMembers.length > 6 && (
                <p className="participant-team-more">
                  +{teamMembers.length - 6} {isEn ? 'other' : 'autre'}{teamMembers.length - 6 > 1 ? 's' : ''}
                </p>
              )}
            </section>
          )}

          {/* Empty state when no sessions and not loading */}
          {!sessionId && assignedSessions.length === 0 && !loadingSessions && (
            <section className="feature-card participant-panel participant-empty-panel">
              <h2>{isEn ? 'No assigned session' : 'Aucune session assignée'}</h2>
              <p className="participant-help-text">
                {isEn
                  ? 'You do not have any assigned session yet. Please contact your administrator.'
                  : 'Vous n&apos;avez pas encore de session assignée. Contactez votre administrateur.'}
              </p>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
