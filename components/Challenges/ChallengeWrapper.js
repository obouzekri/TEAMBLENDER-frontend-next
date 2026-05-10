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
  'phrase_collaborative_v1',
  'copuzzle_live_v1',
  'labyrinthe_live_v1',
  'icebreaker_v1'
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
export default function ChallengeWrapper({ sessionId, engineKey, noNav = false }) {
  const normalizedEngineKey = String(engineKey || '').trim();
  const initialEngineNeedsRealtime = REALTIME_ENGINES.has(normalizedEngineKey);
  const { socket, connected, error: socketError } = useSocket(initialEngineNeedsRealtime);
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast } = useToast();
  
  const [runtimePayload, setRuntimePayload] = useState(null);
  const [engineComponent, setEngineComponent] = useState(null);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const requiresRealtime = REALTIME_ENGINES.has(normalizedEngineKey);

  // Load session runtime configuration
  useEffect(() => {
    if (!sessionId) {
      setError('Session ID manquant');
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
          let resolvedChallengeId = Number(payload.challenge_id || payload.context?.challengeId || payload.context?.challenge_id || 0);

          if (payloadEngineKey && payloadEngineKey !== normalizedEngineKey) {
            showErrorToast(`Engine actif en session (${payload.engine_key}) different de l'URL (${normalizedEngineKey}).`);

            // When URL engine differs from active runtime engine, try to map the URL engine
            // to its challenge id from session details to avoid cross-engine id mismatches.
            try {
              const sessionRes = await fetch(getApiUrl(`/sessions/${sessionId}`), {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                const sessionChallenges = Array.isArray(sessionData?.challenges) ? sessionData.challenges : [];
                const matchingChallenge = sessionChallenges.find((item) => {
                  const itemEngine = String(
                    item?.engine_key || item?.engineKey || item?.challenge?.engine_key || item?.challenge?.engineKey || ''
                  ).trim();
                  return itemEngine === normalizedEngineKey;
                });

                const mappedChallengeId = Number(
                  matchingChallenge?.id ||
                  matchingChallenge?.challenge_id ||
                  matchingChallenge?.challengeId ||
                  matchingChallenge?.challenge?.id ||
                  0
                );

                if (Number.isInteger(mappedChallengeId) && mappedChallengeId > 0) {
                  resolvedChallengeId = mappedChallengeId;
                }
              }
            } catch {
              // Keep runtime challenge id as fallback if session lookup fails.
            }
          }

          setRuntimePayload({
            ...payload,
            challenge_id: resolvedChallengeId,
          });
          setContext({
            role: payload.context?.role || 'participant',
            userId: currentUser.id,
            sessionId: Number(sessionId),
            challengeId: resolvedChallengeId,
          });
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

  // Load engine component once runtime is ready (and socket if required)
  useEffect(() => {
    if (!runtimePayload) return;
    if (requiresRealtime && (!socket || !connected)) return;

    let cancelled = false;
    const loadingId = showLoadingToast('Initialisation du challenge...');

    mountRuntimeChallenge(
      normalizedEngineKey,
      runtimePayload,
      socket,
      context
    )
      .then((engineDef) => {
        if (!cancelled) {
          setEngineComponent(engineDef);
          removeToast(loadingId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          removeToast(loadingId);
          const message = err.message || 'Erreur lors du chargement du moteur';
          setError(message);
          showErrorToast(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    runtimePayload,
    socket,
    connected,
    normalizedEngineKey,
    context,
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

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {!noNav && (
        <AppNav
          userLabel={user?.first_name || user?.email || 'User'}
          onLogout={handleLogout}
          role={user?.role}
        />
      )}
      <div className={styles.challengeContainer}>
        <EngineComponent {...props} />
      </div>
    </>
  );
}
