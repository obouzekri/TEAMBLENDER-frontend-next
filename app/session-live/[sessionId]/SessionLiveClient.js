'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { clearSessionAuth, getAuthHeaders, getStoredCurrentUser } from '@/lib/auth';
import { fetchWithCsrfRetry } from '@/lib/csrf';
import { localizeChallengeName } from '@/lib/challenges/catalogLocalization';
import { getApiUrl } from '@/lib/config';
import { useSessionState } from '@/lib/useSessionState';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import SessionLiveHeader from '@/components/SessionLiveHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ChallengeHeaderPortalContext } from '@/lib/challengeHeaderPortal';

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
  const params = useParams();
  const pathname = usePathname();
  const sessionId = String(params?.sessionId || '');

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [challengeSlotNode, setChallengeSlotNode] = useState(null);
  const [isAdvanceConfirmOpen, setIsAdvanceConfirmOpen] = useState(false);
  const [completedChallengeId, setCompletedChallengeId] = useState('');

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

    const currentUser = getStoredCurrentUser();
    if (!currentUser || isParticipantRole(currentUser.role)) {
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
      const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${t('liveSession.error')} ${res.status}`);
      const data = await res.json();
      setSession(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || t('liveSession.unableToLoadSession'));
      setLoading(false);
    }
  }, [locale, sessionId]);

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
      const res = await fetchWithCsrfRetry(
        getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/flow/complete-active`),
        { method: 'PATCH', headers: getAuthHeaders(), credentials: 'include' }
      );
      if (!res.ok) {
        const body = await res.text();
        let payload = null;
        try {
          payload = body ? JSON.parse(body) : null;
        } catch {
          payload = null;
        }
        throw new Error(payload?.error || body || `${t('liveSession.error')} ${res.status}`);
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
    setCompletedChallengeId(completedChallengeId);

    if (flowMode === 'auto' && canManageFlow) {
      scheduleAutoAdvance();
      return;
    }
  }, [activeChallengeId, canManageFlow, flowMode, locale, scheduleAutoAdvance, sessionState?.current_challenge?.id]);

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
  const sessionStatus = String(sessionState?.status || session?.status || '').trim().toLowerCase();
  const isSessionPrepared = sessionStatus === 'preparee';
  const isSessionFinished = sessionStatus === 'terminee';
  const challenges = Array.isArray(session?.challenges) ? session.challenges : [];
  // A finished session has no active challenge: do not fall back on the first one, which would
  // show its debrief again instead of the end of the session.
  const activeChallenge = isSessionFinished
    ? null
    : sessionState?.current_challenge
      || (activeChallengeId ? challenges.find((c) => c.id === activeChallengeId) || null : challenges[0] || null);
  const activeEngineKey = activeChallenge?.engine_key || '';
  const activeChallengeName = (activeChallenge ? localizeChallengeName(activeChallenge, locale) : '')
    || activeEngineKey
    || t('sessionLive.noActiveChallengeTitle');
  const liveConfigVersion = String(sessionState?.updatedAt || session?.updatedAt || '');
  const assignedParticipantCount = Array.isArray(session?.assigned_participants) ? session.assigned_participants.length : 0;
  const participantCount = Array.isArray(session?.participants) ? session.participants.length : 0;
  const memberCount = assignedParticipantCount || participantCount || (Array.isArray(session?.members) ? session.members.length : 0);
  const userLabel = pickDisplayName(user);
  const totalChallenges = Number(sessionState?.total_challenges || challenges.length || 0);
  const positionInSequence = Number(sessionState?.position_in_sequence || 0);
  const isLastChallenge = totalChallenges > 0 && positionInSequence >= totalChallenges;
  const isActiveChallengeCompleted = Boolean(completedChallengeId)
    && completedChallengeId === String(activeChallengeId || sessionState?.current_challenge?.id || '');

  // Moving on ends the current challenge for everyone, so ask first unless it is already over.
  const requestAdvance = () => {
    if (isActiveChallengeCompleted && !isLastChallenge) {
      advanceToNextChallenge();
      return;
    }
    setIsAdvanceConfirmOpen(true);
  };
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
          <h1>{t('liveSession.loadingSession')}</h1>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('liveSession.error')}</h1>
          <p className="error">{error}</p>
          <Link href={withLocalePath('/home')} className="btn-secondary">{t('liveSession.backToHome')}</Link>
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
        <ChallengeHeaderPortalContext.Provider value={challengeSlotNode}>
          <SessionLiveHeader
            sessionId={sessionId}
            sessionName={session?.name || `${t('sessionLive.sessionFallbackName')} ${sessionId}`}
            sessionCode={session?.code || session?.session_code || session?.sessionCode || sessionId}
            participantCount={memberCount}
            expectedParticipantCount={session?.expected_participant_count}
            sessionObjective={session?.objective}
            canManageParticipants={['admin', 'user'].includes(user?.role) && (user?.role === 'admin' || Number(session?.owner_id) === Number(user?.id))}
            challenges={challenges}
            activeChallengeId={activeChallengeId}
            activeChallengeName={activeChallengeName}
            onAdvance={requestAdvance}
            advancing={actionPending}
            showAdvanceButton={canManageFlow && !isSessionPrepared && !isSessionFinished}
            challengeSlotRef={setChallengeSlotNode}
          />

          {isSessionPrepared ? (
            <section className="feature-card session-live-empty-state">
              <h2>{t('sessionLive.notLaunchedTitle')}</h2>
              <p>{t('sessionLive.notLaunchedBody')}</p>
              <Link href={withLocalePath(`/session-builder?sessionId=${encodeURIComponent(sessionId)}`)} className="btn-primary">
                {t('sessionLive.openBuilder')}
              </Link>
            </section>
          ) : isSessionFinished ? (
            <section className="feature-card session-live-empty-state">
              <h2>{t('sessionLive.finishedTitle')}</h2>
              <p>{t('sessionLive.finishedBody')}</p>
              <Link href={withLocalePath(`/session-results/${encodeURIComponent(sessionId)}`)} className="btn-primary">
                {t('sessionLive.viewResults')}
              </Link>
            </section>
          ) : activeEngineKey ? (
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
              <h2>{t('liveSession.noActiveChallenge')}</h2>
              <p>
                {t('liveSession.activateAChallengeFromThe')}{' '}
                <Link href={withLocalePath(`/session-builder?sessionId=${encodeURIComponent(sessionId)}`)}>
                  session builder
                </Link>
                .
              </p>
            </section>
          )}
        </ChallengeHeaderPortalContext.Provider>
      </main>
      <Modal
        open={isAdvanceConfirmOpen}
        title={isLastChallenge ? t('sessionLive.confirmFinishSessionTitle') : t('sessionLive.confirmNextChallengeTitle')}
        onClose={() => setIsAdvanceConfirmOpen(false)}
      >
        <p>
          {isLastChallenge
            ? t('sessionLive.confirmFinishSessionBody')
            : isActiveChallengeCompleted
              ? t('sessionLive.confirmNextChallengeBody')
              : t('sessionLive.confirmNextChallengeRunningBody')}
        </p>
        <div className="session-live-confirm-actions">
          <Button variant="secondary" onClick={() => setIsAdvanceConfirmOpen(false)} disabled={actionPending}>
            {t('sessionLive.cancel')}
          </Button>
          <Button
            onClick={async () => {
              setIsAdvanceConfirmOpen(false);
              await advanceToNextChallenge();
            }}
            disabled={actionPending}
          >
            {t('sessionLive.confirm')}
          </Button>
        </div>
      </Modal>
      {!isSessionLiveRoute ? <Footer /> : null}
    </>
  );
}
