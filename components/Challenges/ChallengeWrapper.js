'use client';

import React, { useEffect, useState } from 'react';
import useSocket from '@/lib/socket';
import { getApiUrl } from '@/lib/config';
import AppNav from '@/components/AppNav';
import ToastContainer from '@/components/ToastContainer';
import useToast from '@/lib/useToast';
import mountRuntimeChallenge from '@/lib/challenges/runtime';
import styles from './ChallengeWrapper.module.css';

const REALTIME_ENGINES = new Set([
  'escape_room_v1',
  'phrase_collaborative_v1',
  'copuzzle_live_v1',
  'labyrinthe_live_v1',
  'mission_critique_v1',
  'vrai_ou_mensonge_v1',
  'pixel_architect_v1'
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
export default function ChallengeWrapper({ sessionId, engineKey, noNav = false, onChallengeCompleted = null }) {
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
      && String(a.userId || '') === String(b.userId || '')
      && Number(a.sessionId || 0) === Number(b.sessionId || 0)
      && Number(a.challengeId || 0) === Number(b.challengeId || 0);
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

    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
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
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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

          if (payloadEngineKey && payloadEngineKey !== normalizedEngineKey) {
            showErrorToast(`Engine actif en session (${payload.engine_key}) different de l'URL (${normalizedEngineKey}).`);
          }

          const nextRuntimePayload = {
            ...payload,
            challenge_id: resolvedChallengeId,
          };
          console.info('[runtime-challenge] initial payload', {
            sessionId,
            challengeId: resolvedChallengeId,
            engineKey: payloadEngineKey || normalizedEngineKey || '',
            hasRules: Boolean(payload?.config?.rules)
          });
          setRuntimePayload(nextRuntimePayload);
          const resolvedUserId = currentUser.id
            || currentUser.userId
            || currentUser.user_id
            || currentUser.participantId
            || currentUser.participant_id
            || payload.context?.participantId
            || null;

          const nextContext = {
            role: payload.context?.role || 'participant',
            userId: resolvedUserId,
            sessionId: Number(sessionId),
            challengeId: resolvedChallengeId,
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
      const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
      fetch(getApiUrl(`/sessions/${sessionId}/runtime-challenge`), {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
          console.info('[runtime-challenge] resync payload', {
            sessionId,
            challengeId: nextChallengeId,
            engineKey: payloadEngineKey || '',
            hasRules: Boolean(payload?.config?.rules)
          });
          setRuntimePayload(nextRuntimePayload);
          setContext((prev) => {
            const nextContext = {
              role: payload.context?.role || prev?.role || 'participant',
              userId: prev?.userId || payload.context?.participantId || null,
              sessionId: Number(sessionId),
              challengeId: nextChallengeId,
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
        reject(new Error('Initialisation du challenge trop longue. Veuillez reessayer.'));
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
          <h1>Chargement du challenge</h1>
          <p>Préparation de votre expérience en cours...</p>
        </section>
      </main>
    );
  }

  // Render: Error state
  if (error) {
    return (
      <main className={styles.statusShell}>
        <section className={styles.statusCard}>
          <h1>Erreur</h1>
          <p className={styles.error}>{error}</p>
          <div className={styles.statusActions}>
            <button className="btn-primary" onClick={() => window.location.reload()}>Réessayer</button>
            <a href="/home" className="btn-secondary">Retour à l'accueil</a>
          </div>
        </section>
      </main>
    );
  }

  // Render: Waiting for socket connection
  if ((requiresRealtime && !connected) || !engineComponent) {
    return (
      <main className={styles.statusShell}>
        <section className={styles.statusCard}>
          <h1>Connexion en cours</h1>
          <p>
            {requiresRealtime && !connected ? 'Connexion au serveur temps réel...' : 'Initialisation du challenge...'}
          </p>
          {socketError ? <p className={styles.error}>Détail: {socketError}</p> : null}
        </section>
      </main>
    );
  }

  // Render: Challenge UI
  const { component: EngineComponent, props } = engineComponent;

  function handleLogout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
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
      <div className={styles.challengeContainer}>
        <EngineComponent {...props} />
      </div>
    </>
  );
}
