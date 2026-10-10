'use client';

import React, { useEffect, useState } from 'react';
import useSocket from '@/lib/socket';
import { getApiUrl } from '@/lib/config';
import { getAuthHeaders, clearStoredAuth } from '@/lib/auth';
import AppNav from '@/components/AppNav';
import ToastContainer from '@/components/ToastContainer';
import useToast from '@/lib/useToast';
import mountRuntimeChallenge from '@/lib/challenges/runtime';
import styles from './ChallengeWrapper.module.css';
import useI18n from '@/lib/i18n/useI18n';
import { ChallengeConnectionContext, ChallengeProgressContext } from '@/lib/challenges/connection-context';
import SessionPreparation from '@/components/SessionPreparation';

const REALTIME_ENGINES = new Set([
  'escape_room_v1',
  'phrase_collaborative_v1',
  'copuzzle_live_v1',
  'labyrinthe_live_v1',
  'lab_d_innovation_v1',
  'mission_critique_v1',
  'the_quiz_v1',
  'vrai_ou_mensonge_v1',
  'pixel_architect_v1',
  'crossword_live_v1'
]);

/**
 * ChallengeWrapper - Main container for live challenges
 * 
 * Responsibilities:
 * - Fetch session runtime challenge configuration
 * - Establish Socket.io connection
 * - Dispatch to appropriate engine component
 * - Handle errors and loading states
 * - Manage auth & ownership
 */
export default function ChallengeWrapper({ sessionId, engineKey, noNav = false, onChallengeCompleted = null, headerContent = null }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const normalizedEngineKey = String(engineKey || '').trim();
  const [activeEngineKey, setActiveEngineKey] = useState(normalizedEngineKey);
  const effectiveEngineKey = String(activeEngineKey || normalizedEngineKey || '').trim();
  const initialEngineNeedsRealtime = REALTIME_ENGINES.has(effectiveEngineKey);
  const { socket, connected, error: socketError } = useSocket(initialEngineNeedsRealtime);
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast } = useToast();
  
  const [runtimePayload, setRuntimePayload] = useState(null);
  const [engineComponent, setEngineComponent] = useState(null);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [progressState, setProgressState] = useState(null);
  const requiresRealtime = REALTIME_ENGINES.has(effectiveEngineKey);
  const connectionState = !requiresRealtime
    ? ''
    : connected
      ? 'connected'
      : socketError
        ? 'offline'
        : 'reconnecting';

  function shallowEqualContext(a, b) {
    if (!a || !b) return false;
    return a.role === b.role
      && a.locale === b.locale
      && a.sessionConfigLocked === b.sessionConfigLocked
      && String(a.userId || '') === String(b.userId || '')
      && Number(a.sessionId || 0) === Number(b.sessionId || 0)
      && Number(a.challengeId || 0) === Number(b.challengeId || 0)
      && String(a.first_name || a.firstName || '').trim() === String(b.first_name || b.firstName || '').trim()
      && String(a.last_name || a.lastName || '').trim() === String(b.last_name || b.lastName || '').trim()
      && String(a.displayName || '').trim() === String(b.displayName || '').trim()
      && String(a.email || '').trim() === String(b.email || '').trim();
  }

  // Load session runtime configuration
  useEffect(() => {
    if (!sessionId) {
      setError('Session ID manquant');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const loadingId = showLoadingToast('Chargement du challenge...');

    const rawUser = sessionStorage.getItem('currentUser');
    let currentUser = null;
    try {
      currentUser = rawUser ? JSON.parse(rawUser) : null;
    } catch (e) {
      currentUser = null;
    }

    if (!currentUser) {
      if (!cancelled) {
        removeToast(loadingId);
        setError('Vous devez être connecté pour accéder au challenge');
        setLoading(false);
      }
      return;
    }

    setUser(currentUser);

    fetch(getApiUrl(`/sessions/${sessionId}/runtime-challenge`), {
      cache: 'no-store',
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(async (payload) => {
        if (!cancelled) {
          const payloadEngineKey = String(payload?.engine_key || '').trim();
          if (payloadEngineKey) {
            setActiveEngineKey(payloadEngineKey);
          }
          let resolvedChallengeId = Number(payload.challenge_id || payload.context?.challengeId || payload.context?.challenge_id || 0);

          const nextRuntimePayload = {
            ...payload,
            challenge_id: resolvedChallengeId,
          };
          setRuntimePayload(nextRuntimePayload);
          const resolvedUserId = currentUser.id
            || currentUser.userId
            || currentUser.user_id
            || currentUser.participantId
            || currentUser.participant_id
            || payload.context?.participantId
            || null;

          const firstName = String(
            payload.context?.first_name
            || payload.context?.firstName
            || currentUser.first_name
            || currentUser.firstName
            || ''
          ).trim();
          const lastName = String(
            payload.context?.last_name
            || payload.context?.lastName
            || currentUser.last_name
            || currentUser.lastName
            || ''
          ).trim();
          const fullName = `${firstName} ${lastName}`.trim();
          const email = String(payload.context?.email || currentUser.email || '').trim();
          const displayName = String(payload.context?.displayName || payload.context?.name || fullName || email || '').trim();

          const nextContext = {
            locale: payload.context?.locale === 'en' ? 'en' : 'fr',
            sessionConfigLocked: Boolean(payload.context?.sessionConfigLocked),
            role: payload.context?.role || 'participant',
            userId: resolvedUserId,
            sessionId: Number(sessionId),
            challengeId: resolvedChallengeId,
            first_name: firstName,
            last_name: lastName,
            firstName,
            lastName,
            email,
            name: displayName,
            displayName,
          };
          setContext((prev) => (shallowEqualContext(prev, nextContext) ? prev : nextContext));
          removeToast(loadingId);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          removeToast(loadingId);
          const message = err.message || 'Erreur lors du chargement du challenge';
          setError(message);
          showErrorToast(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, showErrorToast, showLoadingToast, removeToast, normalizedEngineKey]);

  // Keep runtime payload synchronized after socket reconnects.
  // Challenge advancement is already handled by parent remount via key(sessionId+activeChallengeId+engineKey).
  useEffect(() => {
    if (!socket) return () => {};

    const handleRuntimeResync = () => {
      fetch(getApiUrl(`/sessions/${sessionId}/runtime-challenge`), {
        cache: 'no-store',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Erreur ${res.status}: ${res.statusText}`);
          return res.json();
        })
        .then((payload) => {
          const payloadEngineKey = String(payload?.engine_key || '').trim();
          if (payloadEngineKey) {
            setActiveEngineKey(payloadEngineKey);
          }
          const nextChallengeId = Number(payload.challenge_id || payload.context?.challengeId || payload.context?.challenge_id || 0);
          const nextRuntimePayload = {
            ...payload,
            challenge_id: nextChallengeId,
          };
          setRuntimePayload(nextRuntimePayload);
          setContext((prev) => {
            const firstName = String(
              payload.context?.first_name
              || payload.context?.firstName
              || prev?.first_name
              || prev?.firstName
              || ''
            ).trim();
            const lastName = String(
              payload.context?.last_name
              || payload.context?.lastName
              || prev?.last_name
              || prev?.lastName
              || ''
            ).trim();
            const fullName = `${firstName} ${lastName}`.trim();
            const email = String(payload.context?.email || prev?.email || '').trim();
            const displayName = String(payload.context?.displayName || payload.context?.name || fullName || email || '').trim();

            const nextContext = {
              locale: payload.context?.locale === 'en' ? 'en' : 'fr',
              sessionConfigLocked: Boolean(payload.context?.sessionConfigLocked),
              role: payload.context?.role || prev?.role || 'participant',
              userId: prev?.userId || payload.context?.participantId || null,
              sessionId: Number(sessionId),
              challengeId: nextChallengeId,
              first_name: firstName,
              last_name: lastName,
              firstName,
              lastName,
              email,
              name: displayName,
              displayName,
            };
            return shallowEqualContext(prev, nextContext) ? prev : nextContext;
          });
          setError(null);
        })
        .catch((err) => {
          const message = err.message || 'Erreur lors du chargement du nouveau challenge';
          setError(message);
          showErrorToast(message);
        });
    };

    const handleSocketConnect = () => {
      // Force backend-authoritative resync on every (re)connection.
      handleRuntimeResync();
    };

    socket.on('connect', handleSocketConnect);

    if (socket.connected) {
      handleSocketConnect();
    }

    return () => {
      socket.off('connect', handleSocketConnect);
    };
  }, [socket, sessionId, showErrorToast]);

  // Load engine component once runtime is ready (and socket if required)
  useEffect(() => {
    if (!runtimePayload) return;
    if (requiresRealtime && (!socket || !connected)) return;

    let cancelled = false;
    const loadingId = showLoadingToast('Initialisation du challenge...');
    const INIT_TIMEOUT_MS = 15000;
    let timeoutId = null;

    const mountPromise = mountRuntimeChallenge(
      effectiveEngineKey,
      runtimePayload,
      socket,
      context,
      { onChallengeCompleted }
    );

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error('Initialisation du challenge trop longue. Veuillez réessayer.'));
      }, INIT_TIMEOUT_MS);
    });

    Promise.race([mountPromise, timeoutPromise])
      .then((engineDef) => {
        if (!cancelled) {
          setEngineComponent(engineDef);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err.message || 'Erreur lors du chargement du moteur';
          setError(message);
          showErrorToast(message);
        }
      })
      .finally(() => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!cancelled) {
          removeToast(loadingId);
        }
      });

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      removeToast(loadingId);
    };
  }, [
    runtimePayload,
    socket,
    connected,
    effectiveEngineKey,
    context,
    onChallengeCompleted,
    requiresRealtime,
    showErrorToast,
    showLoadingToast,
    removeToast,
  ]);

  // Handle socket error
  useEffect(() => {
    if (socketError) {
      showErrorToast(socketError);
    }
  }, [socketError, showErrorToast]);

  // Render: Loading state
  if (loading) {
    return (
      <main className={styles.statusShell}>
        <section className={styles.statusCard}>
          <div className={styles.spinner} aria-hidden="true" />
          <h1>{isEn ? 'Loading challenge' : 'Chargement du challenge'}</h1>
          <p>{isEn ? 'Preparing your experience...' : 'Préparation de votre expérience en cours...'}</p>
        </section>
      </main>
    );
  }

  // Render: Error state
  if (error) {
    const isAuthError = /connect|session|authentif/i.test(error);
    const userMessage = isAuthError
      ? (isEn ? 'Your session has expired or you do not have access to this challenge.' : 'Votre session a expiré ou vous n\'avez pas accès à ce challenge.')
      : (isEn ? 'Unable to load the challenge. Check your connection and retry.' : 'Le challenge n\'a pas pu être chargé. Vérifiez votre connexion et réessayez.');
    return (
      <main className={styles.statusShell}>
        <section className={styles.statusCard}>
          <h1>{isEn ? 'Unable to load challenge' : 'Impossible de charger le challenge'}</h1>
          <p className={styles.error}>{userMessage}</p>
          <p className={styles.errorDetail}>{error}</p>
          <div className={styles.statusActions}>
            <button className="btn-primary" onClick={() => window.location.reload()}>{isEn ? 'Retry' : 'Réessayer'}</button>
            <a href={withLocalePath('/home')} className="btn-secondary">{isEn ? 'Back to home' : 'Retour à l’accueil'}</a>
          </div>
        </section>
      </main>
    );
  }

  // Render: Waiting for socket connection
  if (!engineComponent) {
    return (
      <main className={styles.statusShell}>
        <section className={styles.statusCard}>
          <div className={styles.spinner} aria-hidden="true" />
          <h1>{isEn ? 'Connecting' : 'Connexion en cours'}</h1>
          <p>
            {requiresRealtime && !connected ? (isEn ? 'Connecting to the realtime server...' : 'Connexion au serveur temps réel...') : (isEn ? 'Initializing challenge...' : 'Initialisation du challenge...')}
          </p>
          {socketError ? <p className={styles.error}>{isEn ? 'Connection problem: check your network.' : 'Problème de connexion — vérifiez votre réseau.'}</p> : null}
        </section>
      </main>
    );
  }

  // Render: Challenge UI
  const { component: EngineComponent, props } = engineComponent;

  function handleLogout() {
    clearStoredAuth();
    window.location.replace('/login');
  }

  const navUserLabel = (() => {
    const first = String(user?.first_name || user?.firstName || '').trim();
    const last = String(user?.last_name || user?.lastName || '').trim();
    const full = `${first} ${last}`.trim();
    return full || first || String(user?.name || user?.email || 'User');
  })();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {!noNav && (
        <AppNav
          userLabel={navUserLabel}
          onLogout={handleLogout}
          role={user?.role}
          connectionState={connectionState}
        />
      )}
      {headerContent ? <div className={styles.headerSlot}>{headerContent}</div> : null}
      <SessionPreparation
        participantCount={progressState?.participants_status?.connected_count ?? progressState?.quiz?.connected_count ?? null}
        readyCount={progressState?.quiz?.ready_count ?? null}
        expectedCount={progressState?.quiz?.slot_count ?? null}
        configuration={runtimePayload ? 'loaded' : 'unknown'}
        sessionAvailable={Boolean(sessionId && runtimePayload)}
        connected={!requiresRealtime || connected}
        running={progressState?.timer?.status === 'running' || progressState?.timer?.status === 'paused' || Boolean(progressState?.vom && !['waiting_start', 'finished'].includes(progressState.vom.phase)) || progressState?.escapeStatus === 'running'}
        completed={Boolean(progressState?.summary) || ['completed', 'timeout', 'stopped'].includes(progressState?.timer?.status) || ['finished', 'fin', 'debrief'].includes(progressState?.quiz?.phase) || progressState?.labyrinthe?.phase === 'done' || progressState?.vom?.phase === 'finished' || ['completed', 'success', 'succeeded', 'timeout', 'timed_out', 'failed'].includes(progressState?.escapeStatus)}
      />
      {requiresRealtime && !connected ? <p role="alert" className={styles.connectionError}>
        {isEn ? 'Connection interrupted. Actions are unavailable; your drafts are kept.' : 'Connexion interrompue. Les actions sont indisponibles ; vos brouillons sont conservés.'}
      </p> : null}
      <div className={styles.challengeContainer}>
        <ChallengeConnectionContext.Provider value={!requiresRealtime || connected}>
          <ChallengeProgressContext.Provider value={setProgressState}>
            <EngineComponent {...props} />
          </ChallengeProgressContext.Provider>
        </ChallengeConnectionContext.Provider>
      </div>
    </>
  );
}
