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
import { formatDate } from '@/lib/i18n/format';

export default function ParticipantPage() {
  const searchParams = useSearchParams();
  const requestedSessionId = String(searchParams.get('sessionId') || '').trim();
  return <ParticipantHome key={requestedSessionId} requestedSessionId={requestedSessionId} />;
}

function ParticipantHome({ requestedSessionId }) {
  const { locale, withLocalePath, t } = useI18n();
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
  const [joinSessionError, setJoinSessionError] = useState('');
  const joinInFlightRef = useRef(false);
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
    if (joiningSessionId) return t('participantSpace.connectingToSession');
    if (joining) return t('participantSpace.loadingActiveChallenge');
    if (loadingSessions) return t('participantSpace.loadingAssignedSessions');
    return '';
  }, [locale, joiningSessionId, joining, loadingSessions]);

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
          setSessionDetailsError(`${t('participantSpace.unableToLoadSessionInformation')} ${err.message}`);
        }
      }
    }

    loadSessionDetails();
    return () => {
      cancelled = true;
    };
  }, [locale, ready, sessionId]);

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
          setRuntimeError(err?.message || t('participantSpace.unableToLoadActiveChallenge'));
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
  }, [locale, ready, sessionId, sessionState?.active_challenge_id, stateEngineKey]);

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
        if (!Array.isArray(sessions)) throw new Error(t('participantSpace.invalidSessionList'));
        if (!controller.signal.aborted) {
          setAssignedSessions(sessions);
          setSessionsError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSessionsError(`${t('participantSpace.unableToLoadYourSessionsRetrying')} ${err.message}`);
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
  }, [ready, locale]);

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

  async function navigateToSession(sessionIdentifier) {
    const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionIdentifier)}/state`), {
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = await res.json();
    let engine = String(state?.current_challenge?.engine_key || '').trim();
    if (!engine && state?.active_challenge_id) {
      const runtimeRes = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionIdentifier)}/runtime-challenge`), {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });
      if (!runtimeRes.ok) throw new Error(`HTTP ${runtimeRes.status}`);
      const payload = await runtimeRes.json();
      engine = String(payload?.engine_key || '').trim();
      if (!engine) throw new Error(t('participantSpace.activeChallengeUnavailable'));
    }
    sessionStorage.setItem('targetSessionId', sessionIdentifier);
    router.push(withLocalePath(engine
      ? `/challenges/${encodeURIComponent(engine)}?sessionId=${encodeURIComponent(sessionIdentifier)}`
      : `/participant?sessionId=${encodeURIComponent(sessionIdentifier)}`));
  }

  async function joinSession(sessionIdentifier) {
    if (!sessionIdentifier || joinInFlightRef.current) return;
    const selectedSession = assignedSessions.find((session) => getSessionIdentifier(session) === String(sessionIdentifier));
    if (String(selectedSession?.status || '').trim().toLowerCase() !== 'en_cours') {
      return;
    }
    joinInFlightRef.current = true;
    setJoiningSessionId(sessionIdentifier);
    setJoinSessionError('');
    try {
      await navigateToSession(sessionIdentifier);
    } catch (err) {
      setJoinSessionError(`${t('participantSpace.unableToJoinThisSessionPlease')} ${err.message}`);
    } finally {
      joinInFlightRef.current = false;
      setJoiningSessionId(null);
    }
  }

  async function joinNewSession(event) {
    event.preventDefault();
    if (joinInFlightRef.current) return;
    setJoinCodeMessage('');
    setJoinCodeInvalid(false);
    const normalizedCode = String(joinCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      setJoinCodeMessage(t('participantSpace.enterASessionCode'));
      return;
    }

    joinInFlightRef.current = true;
    setJoiningSessionId('new');
    try {
      const { res, data } = await joinParticipantAuthenticated(normalizedCode);
      if (!res.ok) {
        const invalid = res.status === 404 || data?.code === 'SESSION_NOT_FOUND';
        setJoinCodeInvalid(invalid);
        setJoinCodeMessage(invalid
          ? t('participantSpace.invalidOrUnknownSessionCode')
          : (data?.error || t('participantSpace.unableToJoinThisSession')));
        return;
      }
      const resolvedSessionId = String(data?.sessionId || '').trim();
      if (!resolvedSessionId) {
        setJoinCodeMessage(t('participantSpace.theServerDidNotReturnA'));
        return;
      }
      await navigateToSession(resolvedSessionId);
      setJoinCode('');
      setJoinModalOpen(false);
    } catch {
      setJoinCodeMessage(t('participantSpace.unableToReachTheServerCheck'));
    } finally {
      joinInFlightRef.current = false;
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
          <h1>{t('participantSpace.checkingSession')}</h1>
          <p>{t('participantSpace.loading')}</p>
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
              <h1>{t('participantSpace.welcomeParticipantlabel', { participantLabel })}</h1>
              <p>
                {!sessionId
                  ? t('participantSpace.findYourSessionsAndJoinYour')
                  : t('participantSpace.yourSessionIsRunningTheActive')}
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
                {t('participantSpace.joinASession')}
              </button> : null}
              {sessionId && challengeLink ? (
                <Link className="btn-primary" href={challengeLink}>
                  {t('participantSpace.joinChallenge')}
                </Link>
              ) : sessionId && !joining && !runtimeError && !sessionError ? (
                <button type="button" className="btn-primary" disabled>
                  {flowMode === 'auto'
                    ? t('participantSpace.automaticProgressionIsBeingPrepared')
                    : t('participantSpace.waitingForFacilitator')}
                </button>
              ) : sessionId ? (
                <button type="button" className="btn-primary" disabled>
                  {joining ? t('participantSpace.loading2') : t('participantSpace.challengeUnavailable')}
                </button>
              ) : assignedSessions.length === 0 && !loadingSessions && !sessionsError ? (
                <Link className="btn-primary" href={withLocalePath('/login')}>
                  {t('participantSpace.backToLogin')}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="participant-hero-trust" aria-label={t('participantSpace.participantGuideposts')}>
            <span>{t('participantSpace.individualAccess')}</span>
            <span>{t('participantSpace.realTimeSession')}</span>
            <span>{t('participantSpace.guidedExperience')}</span>
          </div>
          {asyncStatusMessage ? (
            <p className="ui-async-status" role="status" aria-live="polite">{asyncStatusMessage}</p>
          ) : null}
          {showAccountCreatedNotice ? (
            <div className="participant-credentials-notice" role="status">
              <strong>{t('participantSpace.youReAllSet')}</strong>
              <p className="participant-credentials-hint">
                {t('participantSpace.yourParticipantAccountHasBeenCreated')}
              </p>
              <p className="participant-credentials-hint">
                {t('participantSpace.youCanSetUpYourAccount')}
              </p>
              <div className="participant-credentials-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAccountCreatedNotice(false)}>
                  {t('participantSpace.continue')}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <div className="participant-grid">
          {/* Loading skeleton while sessions are being fetched */}
          {loadingSessions && (
            <section className="feature-card participant-panel participant-panel--wide participant-sessions-panel">
              <div className="participant-panel__head">
                <div>
                  <h2 className="participant-sessions-title">{t('participantSpace.assignedSessions')}</h2>
                  <p className="participant-help-text">{t('participantSpace.loadingYourSessions')}</p>
                </div>
              </div>
              <p className="participant-help-text">{t('participantSpace.retrievingData')}</p>
            </section>
          )}

          {sessionsError ? <p className="participant-error-text" role="alert">{sessionsError}</p> : null}
          {joinSessionError ? <p className="participant-error-text" role="alert">{joinSessionError}</p> : null}
          {assignedSessions.length > 0 && (
            <section className="feature-card participant-panel participant-panel--wide participant-sessions-panel">
              <div className="participant-panel__head">
                <div>
                  <h2 className="participant-sessions-title">{t('participantSpace.assignedSessions')}</h2>
                </div>
              </div>
              <div className="session-cards-grid participant-sessions-grid">
                {assignedSessions.map((session) => {
                  const sessionIdentifier = getSessionIdentifier(session);
                  if (!sessionIdentifier) return null;
                  const isSessionLive = String(session.status || '').trim().toLowerCase() === 'en_cours';
                  const statusVariant = isSessionLive ? 'en-cours' : session.status === 'terminee' ? 'terminee' : 'a-venir';
                  const statusLabel = session.status === 'en_cours'
                    ? t('participantSpace.inProgress')
                    : session.status === 'preparee'
                      ? t('participantSpace.prepared')
                      : session.status === 'terminee'
                        ? t('participantSpace.completed')
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
                              {formatDate(session.session_date, locale)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="session-card-actions participant-session-card__footer">
                        {isSessionLive ? (
                          <button
                            type="button"
                            className="btn-primary participant-session-card__cta"
                            disabled={Boolean(joiningSessionId)}
                            onClick={() => joinSession(sessionIdentifier)}
                          >
                            {joiningSessionId === sessionIdentifier
                              ? t('participantSpace.connecting')
                              : t('participantSpace.join')}
                          </button>
                        ) : (
                          <span className="participant-session-card__waiting-status">
                            {t('participantSpace.waitingForLaunch')}
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
              <h2>{t('participantSpace.noAssignedSession')}</h2>
              <p className="participant-help-text">
                {t('participantSpace.youDoNotHaveAnyAssigned')}
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
                <p className="eyebrow">{t('participantSpace.activeSession')}</p>
                <h2>{t('participantSpace.sessionInformation')}</h2>
              </div>
            </div>
            <p className="participant-meta-line">
              {t('participantSpace.sessionId')} <strong>{sessionId}</strong>
            </p>
            {stateEngineKey || runtime?.engine_key ? (
              <p className="participant-meta-line participant-meta-line--strong">
                {t('participantSpace.activeChallenge')} <strong>{sessionState?.current_challenge?.name || stateEngineKey || runtime?.challenge_name || runtime?.engine_key}</strong>
              </p>
            ) : sessionId && !joining && !sessionError && !runtimeError ? (
              <p className="participant-help-text">
                {flowMode === 'auto'
                  ? t('participantSpace.noActiveChallengeYetProgressionWill')
                  : t('participantSpace.noChallengeInProgressYetThe')}
              </p>
            ) : null}
            {joining && !runtime ? <p className="participant-help-text">{t('participantSpace.loadingActiveChallenge')}</p> : null}
            {runtimeError ? <p className="participant-error-text">{t('participantSpace.error')} {runtimeError}</p> : null}
            {sessionError ? <p className="participant-error-text" role="alert">{sessionError}</p> : null}
            {sessionDetailsError ? <p className="participant-error-text" role="alert">{sessionDetailsError}</p> : null}
          </section>
          </div>
        ) : null}
      </main>
      <Modal
        open={joinModalOpen}
        title={t('participantSpace.joinASession2')}
        onClose={() => setJoinModalOpen(false)}
        dialogClassName="participant-join-modal"
        titleClassName="participant-join-modal__title"
        bodyClassName="participant-join-modal__body"
      >
        <p className="participant-join-modal__intro">
          {t('participantSpace.enterTheCodeSharedByYour')}
        </p>
        <form onSubmit={joinNewSession} className="participant-inline-form participant-inline-form--join-modal">
          <label className="participant-join-modal__field">
            <span>{t('participantSpace.sessionCode')}</span>
            <input
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder={t('participantSpace.sessionCode')}
              aria-label={t('participantSpace.sessionCode')}
              aria-invalid={joinCodeInvalid}
              autoComplete="off"
              maxLength={32}
            />
          </label>
          {joinCodeMessage ? <p className="participant-error-text" role="alert">{joinCodeMessage}</p> : null}
          <p className="participant-join-modal__help">
            {t('participantSpace.askYourFacilitatorForTheSession')}
          </p>
          <button type="submit" className="btn-primary" disabled={joiningSessionId === 'new'}>
            {joiningSessionId === 'new' ? t('participantSpace.joining') : t('participantSpace.joinSession')}
          </button>
        </form>
      </Modal>
      <Footer />
    </>
  );
}
