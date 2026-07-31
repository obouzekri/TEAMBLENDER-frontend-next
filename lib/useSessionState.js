'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './socket';
import { fetchAPI } from './api';

const FALLBACK_POLL_START_DELAY_MS = 3000;
const FALLBACK_POLL_INTERVAL_MS = 5000;
const CONNECTED_SYNC_INTERVAL_MS = 12000;
const MIN_FETCH_GAP_MS = 1500;

/**
 * useSessionState - Manages real-time session state synchronization
 *
 * Features:
 * - Listens to Socket.io events (session:launched, session:challenge-advanced)
 * - Polls /sessions/:id/state as fallback
 * - Auto-joins session room on Socket connection
 * - Maintains session state (status, active_challenge_id, position_in_sequence, etc)
 * - Fallback polling if Socket stays unavailable for 500ms
 *
 * Usage:
 *   const { sessionState, loading, pollingActive } = useSessionState(sessionId);
 *   
 *   useEffect(() => {
 *     if (sessionState?.current_challenge) {
 *       console.log('Current:', sessionState.current_challenge.name);
 *     }
 *   }, [sessionState]);
 */
export function useSessionState(sessionId) {
  const { socket, connected, reconnecting, connectionVersion } = useSocket(!!sessionId);

  const [sessionState, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);

  const pollIntervalRef = useRef(null);
  const pollStartTimeoutRef = useRef(null);
  const lastFetchStartedAtRef = useRef(0);
  const inFlightRef = useRef(null);
  const pendingFetchRef = useRef(false);
  const pendingFetchTimeoutRef = useRef(null);

  const clearPendingFetchTimeout = useCallback(() => {
    if (pendingFetchTimeoutRef.current) {
      clearTimeout(pendingFetchTimeoutRef.current);
      pendingFetchTimeoutRef.current = null;
    }
  }, []);

  const schedulePendingFetch = useCallback((delayMs, fetcher) => {
    if (pendingFetchTimeoutRef.current) {
      return;
    }

    pendingFetchTimeoutRef.current = setTimeout(() => {
      pendingFetchTimeoutRef.current = null;
      if (!pendingFetchRef.current) {
        return;
      }
      pendingFetchRef.current = false;
      fetcher({ force: true });
    }, Math.max(50, Number(delayMs) || 0));
  }, []);

  const stopFallbackPolling = useCallback(() => {
    if (pollStartTimeoutRef.current) {
      clearTimeout(pollStartTimeoutRef.current);
      pollStartTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPollingActive(false);
  }, []);

  // Fetch current session state from backend
  const fetchSessionState = useCallback(async ({ force = false } = {}) => {
    if (!sessionId) return;

    const now = Date.now();
    if (inFlightRef.current) {
      if (force) {
        pendingFetchRef.current = true;
      }
      return inFlightRef.current;
    }

    const elapsedSinceLastFetch = now - lastFetchStartedAtRef.current;
    if (!force && elapsedSinceLastFetch < MIN_FETCH_GAP_MS) {
      pendingFetchRef.current = true;
      schedulePendingFetch(MIN_FETCH_GAP_MS - elapsedSinceLastFetch, fetchSessionState);
      return;
    }

    clearPendingFetchTimeout();

    lastFetchStartedAtRef.current = now;

    const request = (async () => {
      try {
        const state = await fetchAPI(`/sessions/${sessionId}/state`, {
          method: 'GET'
        });
        setSessionState(state);
        setError(null);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch session state');
        setLoading(false);
      } finally {
        inFlightRef.current = null;
        if (pendingFetchRef.current) {
          pendingFetchRef.current = false;
          fetchSessionState({ force: true });
        }
      }
    })();

    inFlightRef.current = request;
    return request;
  }, [clearPendingFetchTimeout, schedulePendingFetch, sessionId]);

  // Join session room on Socket connection
  useEffect(() => {
    if (!socket || !sessionId || !connected) return;

    // Join the session room
    socket.emit('joinSession', {
      sessionId,
      role: 'participant' // or detect from context
    });

    // Re-fetch full state on (re)connect to recover any state missed while disconnected
    fetchSessionState({ force: true });

    // Listen for session launch — replace state with backend-authoritative payload
    const handleSessionLaunched = (data) => {
      setSessionState((prev) => ({
        ...(prev || {}),
        ...(data || {}),
        current_challenge: data?.current_challenge || prev?.current_challenge || null,
      }));
      fetchSessionState({ force: true });
    };

    // Listen for challenge advancement — re-fetch from backend instead of merging socket payload
    // This ensures the client always reflects the authoritative backend state
    const handleChallengeAdvanced = (data) => {
      setSessionState((prev) => ({
        ...(prev || {}),
        ...(data || {}),
        current_challenge: data?.current_challenge || prev?.current_challenge || null,
      }));
      fetchSessionState({ force: true });
    };

    socket.on('session:launched', handleSessionLaunched);
    socket.on('session:challenge-advanced', handleChallengeAdvanced);

    return () => {
      socket.off('session:launched', handleSessionLaunched);
      socket.off('session:challenge-advanced', handleChallengeAdvanced);
    };
  }, [socket, sessionId, connected, fetchSessionState, connectionVersion]);

  // Initial fetch on mount
  useEffect(() => {
    fetchSessionState();
  }, [sessionId, fetchSessionState]);

  // Consistency polling while connected: recovers from missed realtime events
  // (e.g. transient proxy/socket issues or multi-instance broadcast gaps).
  useEffect(() => {
    if (!sessionId || !connected) {
      return () => {};
    }

    const intervalId = setInterval(() => {
      fetchSessionState();
    }, CONNECTED_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [connected, fetchSessionState, sessionId]);

  // Fallback polling: if Socket disconnects > 3s, start polling
  useEffect(() => {
    if (connected) {
      stopFallbackPolling();
      return;
    }

    if (!sessionId) {
      stopFallbackPolling();
      return;
    }

    if (pollStartTimeoutRef.current || pollIntervalRef.current) {
      return;
    }

    pollStartTimeoutRef.current = setTimeout(() => {
      pollStartTimeoutRef.current = null;
      setPollingActive(true);
      pollIntervalRef.current = setInterval(() => {
        fetchSessionState();
      }, FALLBACK_POLL_INTERVAL_MS);
    }, FALLBACK_POLL_START_DELAY_MS);

    return stopFallbackPolling;
  }, [connected, fetchSessionState, sessionId, stopFallbackPolling]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopFallbackPolling();
      clearPendingFetchTimeout();
    };
  }, [clearPendingFetchTimeout, stopFallbackPolling]);

  return {
    sessionState,
    loading,
    error,
    connected,
    reconnecting,
    pollingActive,
    refetch: fetchSessionState
  };
}
