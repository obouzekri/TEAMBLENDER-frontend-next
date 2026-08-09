'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Users } from 'lucide-react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui';
import { clearSessionAuth, getAuthHeaders, getStoredAuthToken, getStoredCurrentUser } from '@/lib/auth';
import { getLabyrintheRulesPreset } from '@/lib/challenges/labyrintheRules';
import { getApiUrl } from '@/lib/config';
import { useSessionState } from '@/lib/useSessionState';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';

const ChallengeWrapper = dynamic(
  () => import('@/components/Challenges/ChallengeWrapper'),
  { ssr: false, loading: () => <p>Loading challenge / Chargement du challenge...</p> }
);

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

function isParticipantRole(role) {
  return String(role || '').trim().toLowerCase() === 'participant';
}

export default function SessionLiveClient() {
  const { locale, t, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const params = useParams();
  const pathname = usePathname();
  const sessionId = String(params?.sessionId || '');

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [advancePopupOpen, setAdvancePopupOpen] = useState(false);
  useBodyScrollLock(advancePopupOpen);

  const autoAdvanceTimerRef = useRef(null);
  const completedChallengeKeyRef = useRef('');
  const authInitRef = useRef(false);
  const {
    sessionState,
    connected,
    reconnecting,
    refetch: refetchSessionState
  } = useSessionState(sessionId || null);

  // Auth guard
  useEffect(() => {
    if (authInitRef.current) {
      return;
    }

    const token = getStoredAuthToken();
    const currentUser = getStoredCurrentUser();
    if (!token || !currentUser || isParticipantRole(currentUser.role)) {
      window.location.replace(withLocalePath('/login'));
      return;
    }
    authInitRef.current = true;
    setUser(currentUser);
  }, [withLocalePath]);

  // Load session
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`${isEn ? 'Error' : 'Erreur'} ${res.status}`);
      const data = await res.json();
      setSession(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || (isEn ? 'Unable to load session.' : 'Impossible de charger la session.'));
      setLoading(false);
    }
  }, [isEn, sessionId]);

  useEffect(() => {
    if (user) loadSession();
  }, [user, loadSession]);

  function logout() {
    clearSessionAuth();
    window.location.replace(withLocalePath('/login'));
  }

  const canManageFlow = user ? !isParticipantRole(user.role) : false;

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const advanceToNextChallenge = useCallback(async () => {
    if (!canManageFlow) {
      return;
    }

    setActionPending(true);
    setActionError('');
    try {
      const res = await fetch(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/flow/complete-active`),
        { method: 'PATCH', headers: getAuthHeaders() }
      );
      if (!res.ok) {
        const body = await res.text();
        let payload = null;
        try {
          payload = body ? JSON.parse(body) : null;
        } catch {
          payload = null;
        }
        throw new Error(payload?.error || body || `${isEn ? 'Error' : 'Erreur'} ${res.status}`);
      }
      await res.json();
      await loadSession();
      refetchSessionState();
    } catch (err) {
      setActionError(err.message || t('sessionLive.actionMoveNextError'));
    } finally {
      setActionPending(false);
    }
  }, [canManageFlow, loadSession, refetchSessionState, t]);

  const handleNextChallenge = useCallback(() => {
    clearAutoAdvanceTimer();
    setAdvancePopupOpen(true);
  }, [clearAutoAdvanceTimer]);

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
    autoAdvanceTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearAutoAdvanceTimer();
        advanceToNextChallenge();
        return;
      }
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
      scheduleAutoAdvance();
      return;
    }
  }, [activeChallengeId, canManageFlow, flowMode, isEn, scheduleAutoAdvance, sessionState?.current_challenge?.id]);

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
  const activeChallengeName = activeEngineKey === 'labyrinthe_live_v1'
    ? getLabyrintheRulesPreset(locale).challengeName
    : activeChallenge?.name || activeEngineKey || t('sessionLive.noActiveChallengeTitle');
  const liveConfigVersion = String(sessionState?.updatedAt || session?.updatedAt || '');
  const assignedParticipantCount = Array.isArray(session?.assigned_participants) ? session.assigned_participants.length : 0;
  const participantCount = Array.isArray(session?.participants) ? session.participants.length : 0;
  const memberCount = assignedParticipantCount || participantCount || (Array.isArray(session?.members) ? session.members.length : 0);
  const userLabel = pickDisplayName(user);
  const connectionState = connected ? 'connected' : (reconnecting ? 'reconnecting' : 'offline');
  const isSessionLiveRoute = Boolean(pathname && pathname.includes('/session-live/'));
  const asyncStatusMessage = actionPending
    ? t('sessionLive.processingAction')
    : actionError
      ? actionError
      : loading
        ? t('sessionLive.loadingSession')
      : '';

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{isEn ? 'Loading session...' : 'Chargement de la session...'}</h1>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{isEn ? 'Error' : 'Erreur'}</h1>
          <p className="error">{error}</p>
          <Link href={withLocalePath('/home')} className="btn-secondary">{isEn ? 'Back to home' : 'Retour a l\'accueil'}</Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role="participant-live" connectionState={connectionState} />
      <main className="shell app-home session-live-shell session-live-shell--fullscreen">
        {asyncStatusMessage ? (
          <p className="ui-async-status" role="status" aria-live="polite">{asyncStatusMessage}</p>
        ) : null}
        <section className="session-live-header session-live-surface">
          <div className="session-live-header__details">
            <strong className="session-live-header__sessionName">
              {t('sessionLive.sessionLabel', {
                name: session?.name || `${t('sessionLive.sessionFallbackName')} ${sessionId}`,
              })}
            </strong>
            <span className="session-live-header__separator" aria-hidden="true">•</span>
            <span className="session-live-header__challengeBadge" title={activeChallengeName}>
              {activeChallengeName}
            </span>
            <span className="session-live-header__participantBadge">
              <Users aria-hidden="true" size={14} strokeWidth={2} />
              {t('sessionLive.participantCount', { count: memberCount })}
            </span>
          </div>
          <div className="session-live-header__actions">
            <Button
              variant="primary"
              size="sm"
              className="session-live-header__actionButton"
              onClick={handleNextChallenge}
              disabled={actionPending || !canManageFlow}
            >
              {actionPending ? t('sessionLive.inProgress') : t('sessionLive.moveToNextChallenge')}
            </Button>
          </div>
        </section>

        {advancePopupOpen ? (
          <div className="session-live-popup-backdrop" role="presentation" onClick={() => setAdvancePopupOpen(false)}>
            <section
              className="session-live-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="session-live-popup-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="session-live-popup__header">
                <h3 id="session-live-popup-title">{t('sessionLive.confirmNextChallengeTitle')}</h3>
                <button
                  type="button"
                  className="session-live-popup__close"
                  aria-label={t('sessionLive.closeConfirmationModal')}
                  onClick={() => setAdvancePopupOpen(false)}
                >
                  ×
                </button>
              </div>
              <p>{t('sessionLive.confirmNextChallengeBody')}</p>
              <div className="session-live-popup__actions">
                <Button variant="secondary" size="sm" onClick={() => setAdvancePopupOpen(false)}>
                  {t('sessionLive.cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={async () => {
                  setAdvancePopupOpen(false);
                  await advanceToNextChallenge();
                }}>
                  {t('sessionLive.confirm')}
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {activeEngineKey ? (
          <section className="session-live-challenge-frame">
            <ChallengeWrapper
              key={`${sessionId}:${activeChallengeId || 'none'}:${activeEngineKey}:${liveConfigVersion}`}
              sessionId={sessionId}
              engineKey={activeEngineKey}
              noNav
              onChallengeCompleted={handleChallengeCompleted}
            />
          </section>
        ) : (
          <section className="feature-card session-live-empty-state">
            <h2>{isEn ? 'No active challenge' : 'Aucun challenge actif'}</h2>
            <p>
              {isEn ? 'Activate a challenge from the' : 'Activez un challenge depuis le'}{' '}
              <Link href={withLocalePath(`/session-builder?sessionId=${encodeURIComponent(sessionId)}`)}>
                session builder
              </Link>
              .
            </p>
          </section>
        )}

      </main>
      {!isSessionLiveRoute ? <Footer /> : null}
    </>
  );
}
