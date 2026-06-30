'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { clearSessionAuth, getAuthHeaders, getStoredAuthToken, getStoredCurrentUser } from '@/lib/auth';
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
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params?.sessionId || '');

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [advancePopupOpen, setAdvancePopupOpen] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(0);
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
      const updated = await res.json();
      setActionMsg(updated?.active_challenge_id
        ? (isEn ? 'Next challenge activated.' : 'Challenge suivant activé.')
        : (isEn ? 'Last challenge completed.' : 'Dernier challenge terminé.'));
      await loadSession();
      refetchSessionState();
    } catch (err) {
      setActionMsg(err.message || (isEn ? 'Error while moving to next challenge.' : 'Erreur lors du passage au challenge suivant.'));
    } finally {
      setActionPending(false);
    }
  }, [canManageFlow, isEn, loadSession, refetchSessionState]);

  const handleNextChallenge = useCallback(() => {
    clearAutoAdvanceTimer();
    setAdvancePopupOpen(true);
  }, [clearAutoAdvanceTimer]);

  async function handleEndSession() {
    if (!window.confirm(isEn ? 'End this session?' : 'Terminer la session ?')) return;
    setActionPending(true);
    setActionMsg('');
    try {
      const res = await fetch(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`),
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: 'terminee' }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `${isEn ? 'Error' : 'Erreur'} ${res.status}`);
      }
      router.push(withLocalePath(`/session-results/${encodeURIComponent(sessionId)}`));
    } catch (err) {
      setActionMsg(err.message || (isEn ? 'Error while ending session.' : 'Erreur lors de la fin de session.'));
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
      setActionMsg(isEn ? 'Challenge completed. Auto-progress in progress...' : 'Challenge terminé. Passage automatique en cours...');
      scheduleAutoAdvance();
      return;
    }

    if (canManageFlow) {
      setActionMsg(isEn
        ? 'Challenge completed. Move to the next challenge when you are ready.'
        : 'Challenge terminé. Passez au challenge suivant quand vous êtes prêt.');
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
  const liveConfigVersion = String(sessionState?.updatedAt || session?.updatedAt || '');
  const assignedParticipantCount = Array.isArray(session?.assigned_participants) ? session.assigned_participants.length : 0;
  const participantCount = Array.isArray(session?.participants) ? session.participants.length : 0;
  const memberCount = assignedParticipantCount || participantCount || (Array.isArray(session?.members) ? session.members.length : 0);
  const userLabel = pickDisplayName(user);
  const connectionState = connected ? 'connected' : (reconnecting ? 'reconnecting' : 'offline');
  const asyncStatusMessage = actionPending
    ? (isEn ? 'Processing action...' : 'Action en cours de traitement...')
    : loading
      ? (isEn ? 'Loading session...' : 'Chargement de la session...')
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
          <div className="session-live-header__row1">
            <strong className="session-live-header__name">{session?.name || `Session ${sessionId}`}</strong>
            {activeChallenge && (
              <span className="eyebrow session-live-header__meta">{activeChallenge.name || activeEngineKey}</span>
            )}
            <span className="eyebrow session-live-header__meta session-live-header__meta--count">
              {memberCount} {isEn ? `participant${memberCount !== 1 ? 's' : ''}` : `participant${memberCount !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="session-live-header__row2">
            <button
              type="button"
              className="btn-primary btn--sm"
              onClick={handleNextChallenge}
              disabled={actionPending || !canManageFlow}
            >
              {actionPending ? (isEn ? 'In progress...' : 'En cours...') : (isEn ? 'Move to next challenge' : 'Passer au challenge suivant')}
            </button>
            <button
              type="button"
              className="btn-secondary btn--sm"
              onClick={handleEndSession}
              disabled={actionPending}
            >
              {isEn ? 'End session' : 'Terminer'}
            </button>
            {flowMode === 'auto' && (
              <span className="session-live-header__msg session-live-header__msg--auto">
                {autoAdvanceCountdown > 0
                  ? (isEn ? `Auto progression in ${autoAdvanceCountdown}s` : `Passage auto dans ${autoAdvanceCountdown}s`)
                  : (isEn ? 'Auto progression enabled' : 'Passage auto activé')}
              </span>
            )}
            {actionMsg && <span className="session-live-header__msg">{actionMsg}</span>}
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
                <h3 id="session-live-popup-title">{isEn ? 'Confirm next challenge' : 'Confirmer le prochain challenge'}</h3>
                <button
                  type="button"
                  className="session-live-popup__close"
                  aria-label={isEn ? 'Close confirmation modal' : 'Fermer la fenetre de confirmation'}
                  onClick={() => setAdvancePopupOpen(false)}
                >
                  ×
                </button>
              </div>
              <p>{isEn ? 'Participants will automatically be moved to the next challenge.' : 'Les participants seront automatiquement deplaces vers le prochain challenge.'}</p>
              <div className="session-live-popup__actions">
                <button
                  type="button"
                  className="btn-secondary btn--sm"
                  onClick={() => setAdvancePopupOpen(false)}
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="button"
                  className="btn-primary btn--sm"
                  onClick={async () => {
                    setAdvancePopupOpen(false);
                    await advanceToNextChallenge();
                  }}
                >
                  {isEn ? 'Confirm' : 'Confirmer'}
                </button>
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
      <Footer />
    </>
  );
}
