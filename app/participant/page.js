'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import SessionLiveHeader from '@/components/SessionLiveHeader';
import Modal from '@/components/ui/Modal';
import { getApiUrl } from '@/lib/config';
import { useSessionState } from '@/lib/useSessionState';
import { clearStoredAuth, getAuthHeaders, getStoredCurrentUser, joinParticipantAuthenticated } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function ParticipantPage() {
  const searchParams = useSearchParams();
  const requestedSessionId = String(searchParams.get('sessionId') || '').trim();
  return <ParticipantHome key={requestedSessionId} requestedSessionId={requestedSessionId} />;
}

function ParticipantHome({ requestedSessionId }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [user, setUser] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [sessionDetails, setSessionDetails] = useState(null);
  const [sessionDetailsError, setSessionDetailsError] = useState('');
  const [joining, setJoining] = useState(false);
  const [assignedSessions, setAssignedSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [joiningSessionId, setJoiningSessionId] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeMessage, setJoinCodeMessage] = useState('');
  const [joinCodeInvalid, setJoinCodeInvalid] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [showAccountCreatedNotice, setShowAccountCreatedNotice] = useState(false);
  const authInitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const { sessionState, error: sessionError, connected, reconnecting, pollingActive } = useSessionState(sessionId || null);
  const flowMode = String(sessionState?.flowMode || sessionState?.flow_mode || 'manual').trim().toLowerCase() === 'auto'
    ? 'auto'
    : 'manual';
  const stateEngineKey = useMemo(
    () => String(sessionState?.current_challenge?.engine_key || '').trim(),
    [sessionState?.current_challenge?.engine_key]
  );
  const sessionChallenges = useMemo(() => {
    const currentChallenge = sessionState?.current_challenge || null;
    if (Array.isArray(sessionState?.challenges) && sessionState.challenges.length > 0) {
      return sessionState.challenges;
    }
    return currentChallenge ? [currentChallenge] : [];
  }, [sessionState?.challenges, sessionState?.current_challenge]);

  useEffect(() => {
    if (authInitRef.current) {
      return;
    }

    const currentUser = getStoredCurrentUser();

    if (!currentUser) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    authInitRef.current = true;
    setUser(currentUser);
    setReady(true);
  }, [withLocalePath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const accountCreated = sessionStorage.getItem('participantAccountCreated') === '1';
    sessionStorage.removeItem('participantAccountCreated');
    sessionStorage.removeItem('participantTemporaryCredentials');
    setShowAccountCreatedNotice(accountCreated);
  }, []);

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

    if (requestedSessionId) {
      sessionStorage.setItem('targetSessionId', requestedSessionId);
    } else {
      sessionStorage.removeItem('targetSessionId');
    }
    setSessionId(requestedSessionId);
  }, [ready, requestedSessionId]);

  const getSessionIdentifier = useCallback((session) => {
    const id = session?.id ?? session?.session_id ?? session?.sessionId;
    return id == null ? '' : String(id).trim();
  }, []);

  useEffect(() => {
    if (!ready || !sessionId) return;

    let cancelled = false;

    async function loadSessionDetails() {
      try {
        const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!cancelled) {
          setSessionDetails(payload || null);
          setSessionDetailsError('');
        }
      } catch (err) {
        if (!cancelled) {
          setSessionDetails(null);
          setSessionDetailsError(`${isEn ? 'Unable to load session information.' : 'Impossible de charger les informations de session.'} ${err.message}`);
        }
      }
    }

    loadSessionDetails();
    return () => {
      cancelled = true;
    };
  }, [isEn, ready, sessionId]);

  useEffect(() => {
    if (!ready || !sessionId) return;
    let cancelled = false;
    if (stateEngineKey) {
      setJoining(false);
      setRuntimeError('');
      return () => {
        cancelled = true;
      };
    }

    const hasActiveChallenge = Boolean(sessionState?.active_challenge_id);
    if (!hasActiveChallenge) {
      setRuntime(null);
      setRuntimeError('');
      setJoining(false);
      return;
    }

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
  }, [isEn, ready, sessionId, sessionState?.active_challenge_id, stateEngineKey]);

  // Keep assigned sessions accessible even when returning through a recovery link.
  useEffect(() => {
    if (!ready) return;

    const controller = new AbortController();
    let fetching = false;

    async function fetchAssignedSessions() {
      if (fetching || controller.signal.aborted) return;
      fetching = true;
      try {
        const res = await fetch(getApiUrl('/participants/me/sessions'), {
          headers: getAuthHeaders(),
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const sessions = Array.isArray(data) ? data : (data?.data || data?.sessions);
        if (!Array.isArray(sessions)) throw new Error(isEn ? 'Invalid session list.' : 'Liste de sessions invalide.');
        if (!controller.signal.aborted) {
          setAssignedSessions(sessions);
          setSessionsError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSessionsError(`${isEn ? 'Unable to load your sessions. Retrying automatically.' : 'Impossible de charger vos sessions. Nouvelle tentative automatique.'} ${err.message}`);
        }
      } finally {
        fetching = false;
        if (!controller.signal.aborted) setLoadingSessions(false);
      }
    }

    function refreshAssignedSessions() {
      if (document.visibilityState === 'visible') fetchAssignedSessions();
    }

    setLoadingSessions(true);
    fetchAssignedSessions();
    const intervalId = window.setInterval(refreshAssignedSessions, 5000);
    window.addEventListener('focus', refreshAssignedSessions);
    document.addEventListener('visibilitychange', refreshAssignedSessions);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshAssignedSessions);
      document.removeEventListener('visibilitychange', refreshAssignedSessions);
    };
  }, [ready, isEn]);

  const challengeLink = useMemo(() => {
    const engine = String(stateEngineKey || runtime?.engine_key || '').trim();
    if (!engine || !sessionId) return '';
    return withLocalePath(`/challenges/${encodeURIComponent(engine)}?sessionId=${encodeURIComponent(sessionId)}`);
  }, [stateEngineKey, runtime, sessionId, withLocalePath]);

  useEffect(() => {
    if (challengeLink) router.replace(challengeLink);
  }, [challengeLink, router]);

  const participantSessionName = String(sessionDetails?.name || '').trim() || sessionId;
  const participantExpectedCount = Array.isArray(sessionDetails?.assigned_participants)
    ? sessionDetails.assigned_participants.length
    : Array.isArray(sessionDetails?.participants)
      ? sessionDetails.participants.length
      : undefined;

  function joinSession(sessionIdentifier) {
    if (!sessionIdentifier) return;
    const selectedSession = assignedSessions.find((session) => getSessionIdentifier(session) === String(sessionIdentifier));
    if (String(selectedSession?.status || '').trim().toLowerCase() !== 'en_cours') {
      return;
    }
    if (sessionIdentifier !== sessionId) setJoiningSessionId(sessionIdentifier);
    sessionStorage.setItem('targetSessionId', sessionIdentifier);
    router.push(withLocalePath(`/participant?sessionId=${encodeURIComponent(sessionIdentifier)}`));
  }

  async function joinNewSession(event) {
    event.preventDefault();
    setJoinCodeMessage('');
    setJoinCodeInvalid(false);
    const normalizedCode = String(joinCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      setJoinCodeMessage(isEn ? 'Enter a session code.' : 'Saisissez un code de session.');
      return;
    }

    setJoiningSessionId('new');
    try {
      const { res, data } = await joinParticipantAuthenticated(normalizedCode);
      if (!res.ok) {
        const invalid = res.status === 404 || data?.code === 'SESSION_NOT_FOUND';
        setJoinCodeInvalid(invalid);
        setJoinCodeMessage(invalid
          ? (isEn ? 'Invalid or unknown session code.' : 'Code de session invalide ou introuvable.')
          : (data?.error || (isEn ? 'Unable to join this session.' : 'Impossible de rejoindre cette session.')));
        return;
      }
      const resolvedSessionId = String(data?.sessionId || '').trim();
      if (!resolvedSessionId) {
        setJoinCodeMessage(isEn ? 'The server did not return a session. Please retry.' : 'Le serveur n’a pas renvoyé de session. Réessayez.');
        return;
      }
      setJoinCode('');
      setJoinModalOpen(false);
      sessionStorage.setItem('targetSessionId', resolvedSessionId);
      router.push(withLocalePath(`/participant?sessionId=${encodeURIComponent(resolvedSessionId)}`));
    } catch {
      setJoinCodeMessage(isEn ? 'Unable to reach the server. Check your connection.' : 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setJoiningSessionId(null);
    }
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
          <div className="participant-hero__top">
            <div className="participant-hero__copy">
              <h1>{isEn ? `Welcome ${participantLabel}` : `Bienvenue ${participantLabel}`}</h1>
              <p>
                {!sessionId
                  ? (isEn ? 'Find your sessions and join your ongoing experiences.' : 'Retrouvez vos sessions et rejoignez vos expériences en cours.')
                  : (isEn
                    ? 'Your session is running. The active challenge will appear here automatically.'
                    : 'Votre session est en cours. Le challenge actif s\'affichera ici automatiquement.')}
              </p>
            </div>
            <div className="participant-hero__actions">
              {!user.recovery_session_id ? <button
                type="button"
                className="btn-secondary participant-join-trigger"
                onClick={() => {
                  setJoinCodeMessage('');
                  setJoinCodeInvalid(false);
                  setJoinModalOpen(true);
                }}
              >
                {isEn ? '+ Join a session' : '+ Rejoindre une session'}
              </button> : null}
              {sessionId && challengeLink ? (
                <Link className="btn-primary" href={challengeLink}>
                  {isEn ? 'Join challenge' : 'Rejoindre le challenge'}
                </Link>
              ) : sessionId && !joining && !runtimeError && !sessionError ? (
                <button type="button" className="btn-primary" disabled>
                  {flowMode === 'auto'
                    ? (isEn ? 'Automatic progression is being prepared...' : 'Passage automatique en préparation...')
                    : (isEn ? 'Waiting for facilitator...' : 'En attente du facilitateur...')}
                </button>
              ) : sessionId ? (
                <button type="button" className="btn-primary" disabled>
                  {joining ? (isEn ? 'Loading...' : 'Chargement...') : (isEn ? 'Challenge unavailable' : 'Challenge indisponible')}
                </button>
              ) : assignedSessions.length === 0 && !loadingSessions && !sessionsError ? (
                <Link className="btn-primary" href={withLocalePath('/login')}>
                  {isEn ? 'Back to login' : 'Revenir à la connexion'}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="participant-hero-trust" aria-label={isEn ? 'Participant guideposts' : 'Repères participant'}>
            <span>{isEn ? 'Individual access' : 'Accès individuel'}</span>
            <span>{isEn ? 'Real-time session' : 'Session en temps réel'}</span>
            <span>{isEn ? 'Guided experience' : 'Expérience guidée'}</span>
          </div>
          {asyncStatusMessage ? (
            <p className="ui-async-status" role="status" aria-live="polite">{asyncStatusMessage}</p>
          ) : null}
          {showAccountCreatedNotice ? (
            <div className="participant-credentials-notice" role="status">
              <strong>{isEn ? "You're all set!" : 'Tout est prêt !'}</strong>
              <p className="participant-credentials-hint">
                {isEn
                  ? 'Your participant account has been created automatically.'
                  : 'Votre compte participant a été créé automatiquement.'}
              </p>
              <p className="participant-credentials-hint">
                {isEn
                  ? 'You can set up your account later from My account.'
                  : 'Vous pourrez configurer votre compte plus tard depuis Mon compte.'}
              </p>
              <div className="participant-credentials-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAccountCreatedNotice(false)}>
                  {isEn ? 'Continue' : 'Continuer'}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="participant-grid">
          {/* Loading skeleton while sessions are being fetched */}
          {loadingSessions && (
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

          {sessionsError ? <p className="participant-error-text" role="alert">{sessionsError}</p> : null}
          {assignedSessions.length > 0 && (
            <section className="feature-card participant-panel participant-panel--wide participant-sessions-panel">
              <div className="participant-panel__head">
                <div>
                  <p className="eyebrow">{isEn ? 'ASSIGNED SESSIONS' : 'SESSIONS ASSIGNÉES'}</p>
                </div>
              </div>
              <div className="session-cards-grid participant-sessions-grid">
                {assignedSessions.map((session) => {
                  const sessionIdentifier = getSessionIdentifier(session);
                  if (!sessionIdentifier) return null;
                  const isSessionLive = String(session.status || '').trim().toLowerCase() === 'en_cours';
                  const statusVariant = isSessionLive ? 'en-cours' : session.status === 'terminee' ? 'terminee' : 'a-venir';
                  const statusLabel = session.status === 'en_cours'
                    ? (isEn ? 'In progress' : 'En cours')
                    : session.status === 'preparee'
                      ? (isEn ? 'Prepared' : 'En préparation')
                      : session.status === 'terminee'
                        ? (isEn ? 'Completed' : 'Terminée')
                        : session.status || '';
                  return (
                    <article key={sessionIdentifier} className={`session-card session-card--${statusVariant} participant-session-card`}>
                      <div className="session-card-body participant-session-card__body">
                        <p className="session-title participant-session-card__name">
                          {session.name || `Session #${sessionIdentifier}`}
                        </p>
                        <p className="session-meta">
                          {statusLabel && (
                            <span className={`status-pill status-pill--${statusVariant}`}>
                              {statusLabel}
                            </span>
                          )}
                          {session.session_date && (
                            <span className="session-date">
                              {new Date(session.session_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { dateStyle: 'medium' })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="session-card-actions participant-session-card__footer">
                        {isSessionLive ? (
                          <button
                            type="button"
                            className="btn-primary participant-session-card__cta"
                            disabled={joiningSessionId === sessionIdentifier}
                            onClick={() => joinSession(sessionIdentifier)}
                          >
                            {joiningSessionId === sessionIdentifier
                              ? (isEn ? 'Connecting...' : 'Connexion...')
                              : (isEn ? 'Join' : 'Rejoindre')}
                          </button>
                        ) : (
                          <span className="participant-session-card__waiting-status">
                            {isEn ? 'Waiting for launch' : 'En attente du lancement'}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state when no sessions and not loading */}
          {!sessionId && assignedSessions.length === 0 && !loadingSessions && !sessionsError && (
            <section className="feature-card participant-panel participant-empty-panel">
              <h2>{isEn ? 'No assigned session' : 'Aucune session assignée'}</h2>
              <p className="participant-help-text">
                {isEn
                  ? 'You do not have any assigned session yet. Please contact your administrator.'
                  : "Vous n'avez pas encore de session assignée. Contactez votre administrateur."}
              </p>
            </section>
          )}
        </div>

        {sessionId ? (
          <section className="participant-live-header-shell">
            <SessionLiveHeader
              sessionId={sessionId}
              sessionName={participantSessionName}
              sessionCode={sessionDetails?.code || sessionDetails?.session_code || sessionDetails?.sessionCode || sessionId}
              participantCount={participantExpectedCount}
              expectedParticipantCount={sessionDetails?.expected_participant_count}
              sessionObjective={sessionDetails?.objective}
              challenges={sessionChallenges}
              activeChallengeId={sessionState?.active_challenge_id || sessionState?.current_challenge?.id || null}
              activeChallengeName={runtime?.challenge_name || sessionState?.current_challenge?.name || sessionState?.current_challenge?.engine_key || ''}
              showAdvanceButton={false}
            />
          </section>
        ) : null}

        {sessionId ? (
          <div className="participant-grid">
            {/* Session info card - displayed when a session is selected */}
          <section className="feature-card participant-panel participant-panel--wide">
            <div className="participant-panel__head">
              <div>
                <p className="eyebrow">{isEn ? 'ACTIVE SESSION' : 'SESSION ACTIVE'}</p>
                <h2>{isEn ? 'Session information' : 'Informations de session'}</h2>
              </div>
            </div>
            <p className="participant-meta-line">
              {isEn ? 'Session ID:' : 'ID de session:'} <strong>{sessionId}</strong>
            </p>
            {stateEngineKey || runtime?.engine_key ? (
              <p className="participant-meta-line participant-meta-line--strong">
                {isEn ? 'Active challenge:' : 'Challenge actif:'} <strong>{sessionState?.current_challenge?.name || stateEngineKey || runtime?.challenge_name || runtime?.engine_key}</strong>
              </p>
            ) : sessionId && !joining && !sessionError && !runtimeError ? (
              <p className="participant-help-text">
                {flowMode === 'auto'
                  ? (isEn
                    ? 'No active challenge yet. Progression will happen automatically as the session advances.'
                    : 'Aucun challenge actif pour le moment. Le passage se fera automatiquement dès que la session avancera.')
                  : (isEn
                    ? 'No challenge in progress yet. The facilitator has not started or moved to the next challenge.'
                    : "Aucun challenge en cours — le facilitateur n'a pas encore lancé ou n'a pas encore passé au challenge suivant.")}
              </p>
            ) : null}
            {joining && !runtime ? <p className="participant-help-text">{isEn ? 'Loading active challenge...' : 'Chargement du challenge actif...'}</p> : null}
            {runtimeError ? <p className="participant-error-text">{isEn ? 'Error:' : 'Erreur :'} {runtimeError}</p> : null}
            {sessionError ? <p className="participant-error-text" role="alert">{sessionError}</p> : null}
            {sessionDetailsError ? <p className="participant-error-text" role="alert">{sessionDetailsError}</p> : null}
          </section>
          </div>
        ) : null}
      </main>
      <Modal
        open={joinModalOpen}
        title={isEn ? 'Join a session' : 'Rejoindre une session'}
        onClose={() => setJoinModalOpen(false)}
        dialogClassName="participant-join-modal"
        titleClassName="participant-join-modal__title"
        bodyClassName="participant-join-modal__body"
      >
        <p className="participant-join-modal__intro">
          {isEn ? 'Enter the code shared by your facilitator.' : 'Saisissez le code partagé par votre facilitateur.'}
        </p>
        <form onSubmit={joinNewSession} className="participant-inline-form participant-inline-form--join-modal">
          <label className="participant-join-modal__field">
            <span>{isEn ? 'Session code' : 'Code de session'}</span>
            <input
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder={isEn ? 'Session code' : 'Code de session'}
              aria-label={isEn ? 'Session code' : 'Code de session'}
              aria-invalid={joinCodeInvalid}
              autoComplete="off"
              maxLength={32}
            />
          </label>
          {joinCodeMessage ? <p className="participant-error-text" role="alert">{joinCodeMessage}</p> : null}
          <p className="participant-join-modal__help">
            {isEn ? 'Ask your facilitator for the session code.' : 'Demandez le code de session à votre facilitateur.'}
          </p>
          <button type="submit" className="btn-primary" disabled={joiningSessionId === 'new'}>
            {joiningSessionId === 'new' ? (isEn ? 'Joining...' : 'Connexion...') : (isEn ? 'Join session' : 'Rejoindre')}
          </button>
        </form>
      </Modal>
      <Footer />
    </>
  );
}
