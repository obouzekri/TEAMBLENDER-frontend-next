'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './socket';
import { fetchAPI } from './api';

/**
 * useSessionState - Manages real-time session state synchronization
 *
 * Features:
 * - Listens to Socket.io events (session:launched, session:challenge-advanced)
 * - Polls /sessions/:id/state as fallback
 * - Auto-joins session room on Socket connection
 * - Maintains session state (status, active_challenge_id, position_in_sequence, etc)
 * - Fallback polling if Socket disconnects > 3s
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
  const { socket, connected, reconnecting } = useSocket(!!sessionId);

  const [sessionState, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);

  const pollTimeoutRef = useRef(null);
  const disconnectTimeRef = useRef(null);

  // Fetch current session state from backend
  const fetchSessionState = useCallback(async () => {
    if (!sessionId) return;

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
    }
  }, [sessionId]);

  // Join session room on Socket connection
  useEffect(() => {
    if (!socket || !sessionId || !connected) return;

    // Join the session room
    socket.emit('joinSession', {
      sessionId,
      role: 'participant' // or detect from context
    });

    // Re-fetch full state on (re)connect to recover any state missed while disconnected
    fetchSessionState();

    // Listen for session launch — replace state with backend-authoritative payload
    const handleSessionLaunched = (data) => {
      console.log('Session launched:', data);
      setSessionState(data);
    };

    // Listen for challenge advancement — re-fetch from backend instead of merging socket payload
    // This ensures the client always reflects the authoritative backend state
    const handleChallengeAdvanced = () => {
      fetchSessionState();
    };

    socket.on('session:launched', handleSessionLaunched);
    socket.on('session:challenge-advanced', handleChallengeAdvanced);

    return () => {
      socket.off('session:launched', handleSessionLaunched);
      socket.off('session:challenge-advanced', handleChallengeAdvanced);
    };
  }, [socket, sessionId, connected, fetchSessionState]);

  // Initial fetch on mount
  useEffect(() => {
    fetchSessionState();
  }, [sessionId, fetchSessionState]);

  // Fallback polling: if Socket disconnects > 3s, start polling
  useEffect(() => {
    if (connected) {
      // Socket is connected, stop polling and clear timeout
      if (pollTimeoutRef.current) {
        clearInterval(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      if (disconnectTimeRef.current) {
        disconnectTimeRef.current = null;
      }
      setPollingActive(false);
      return;
    }

    // Socket is disconnected, start the timeout
    if (!disconnectTimeRef.current) {
      disconnectTimeRef.current = Date.now();
    }

    const timeSinceDisconnect = Date.now() - (disconnectTimeRef.current || 0);

    // After 3 seconds of being disconnected, start polling
    if (timeSinceDisconnect > 3000 && !pollTimeoutRef.current) {
      setPollingActive(true);
      pollTimeoutRef.current = setInterval(() => {
        fetchSessionState();
      }, 5000); // Poll every 5 seconds
    }
  }, [connected, fetchSessionState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearInterval(pollTimeoutRef.current);
      }
    };
  }, []);

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
