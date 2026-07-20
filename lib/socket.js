'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { getBackendOrigin } from './config';
import { getStoredAuthToken } from './auth-storage';

function parseEnvInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isOnlineClient() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

function resolveSocketTuning() {
  return {
    connectTimeoutMs: parseEnvInt(process.env.NEXT_PUBLIC_SOCKET_CONNECT_TIMEOUT_MS, 12000, 3000, 60000),
    ackTimeoutMs: parseEnvInt(process.env.NEXT_PUBLIC_SOCKET_ACK_TIMEOUT_MS, 10000, 1000, 45000),
    reconnectionDelayMs: parseEnvInt(process.env.NEXT_PUBLIC_SOCKET_RECONNECT_DELAY_MS, 1000, 250, 10000),
    reconnectionDelayMaxMs: parseEnvInt(process.env.NEXT_PUBLIC_SOCKET_RECONNECT_DELAY_MAX_MS, 8000, 1000, 30000),
    reconnectionAttempts: parseEnvInt(process.env.NEXT_PUBLIC_SOCKET_RECONNECT_ATTEMPTS, 20, 3, 100),
  };
}

function isPublicTeamblenderHost() {
  if (typeof window === 'undefined') return false;
  const host = String(window.location.hostname || '').toLowerCase();
  return host === 'teamblender.io' || host === 'www.teamblender.io';
}

function resolveSocketTransports() {
  // On public production frontend, websocket upgrade probe can fail
  // intermittently (browser/proxy path) while polling stays stable.
  if (isPublicTeamblenderHost()) {
    return ['polling'];
  }

  return ['polling', 'websocket'];
}

function buildSocketOptions(token) {
  const tuning = resolveSocketTuning();
  const transports = resolveSocketTransports();
  const pollingOnly = transports.length === 1 && transports[0] === 'polling';
  return {
    auth: {
      token: token || null,
    },
    reconnection: true,
    reconnectionDelay: tuning.reconnectionDelayMs,
    reconnectionDelayMax: tuning.reconnectionDelayMaxMs,
    reconnectionAttempts: tuning.reconnectionAttempts,
    randomizationFactor: 0.5,
    transports,
    upgrade: !pollingOnly,
    timeout: tuning.connectTimeoutMs,
  };
}

/**
 * useSocket - React hook for Socket.io connection management
 * 
 * Features:
 * - Auto-connect to backend Socket.io server
 * - Connection state management (connecting, connected, reconnecting, disconnected, error)
 * - Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s)
 * - Event listener registration
 * - Event emitter with error handling
 * 
 * Usage:
 *   const { socket, connected, error } = useSocket();
 *   
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on('challenge:state', (state) => console.log(state));
 *     socket.emit('challenge:join', { sessionId: 123 });
 *   }, [socket]);
 */
export function useSocket(enabled = true) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const syncOnlineState = () => {
      const offline = !isOnlineClient();
      setIsOffline(offline);
      if (offline) {
        setReconnecting(false);
        setError('Connexion internet indisponible. Reconnexion en attente du reseau.');
      }
    };

    syncOnlineState();

    if (typeof window === 'undefined') return () => {};
    window.addEventListener('online', syncOnlineState);
    window.addEventListener('offline', syncOnlineState);
    return () => {
      window.removeEventListener('online', syncOnlineState);
      window.removeEventListener('offline', syncOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
      setReconnecting(false);
      setError(null);
      setConnectionVersion(0);
      return () => {};
    }

    // Get JWT token for authentication
    const token = getStoredAuthToken();

    if (!isOnlineClient()) {
      setConnected(false);
      setReconnecting(false);
      setError('Connexion internet indisponible. Reconnexion en attente du reseau.');
      return () => {};
    }

    // Create Socket.io instance with authentication and reconnect config
    const newSocket = io(getBackendOrigin(), buildSocketOptions(token));

    // Connection established
    newSocket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);
      setConnectionVersion((prev) => prev + 1);
    });

    // Attempting to reconnect
    const onReconnectAttempt = () => {
      setReconnecting(true);
    };
    newSocket.io.on('reconnect_attempt', onReconnectAttempt);
    newSocket.io.on('reconnect', () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);
    });
    newSocket.io.on('reconnect_error', (err) => {
      const message = typeof err === 'string' ? err : (err?.message || 'Erreur de reconnexion WebSocket');
      setError(message);
    });

    // Reconnection failed
    newSocket.io.on('reconnect_failed', () => {
      setError('Impossible de se reconnecter au serveur. Vérifiez votre connexion réseau.');
      setReconnecting(false);
    });

    // Connection error
    newSocket.on('connect_error', (err) => {
      const message = typeof err === 'string' ? err : (err?.message || 'Erreur de connexion WebSocket');
      setError(message);
      if (process.env.NODE_ENV !== 'production') {
        // Keep low-noise diagnostics to identify handshake/CORS/version mismatches.
        console.warn('[Socket.io] connect_error', {
          message,
          description: err?.description || null,
          context: err?.context || null,
          data: err?.data || null,
        });
      }
    });

    // Connection lost
    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason !== 'io client disconnect') {
        setReconnecting(true);
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.off('connect');
      newSocket.off('connect_error');
      newSocket.off('disconnect');
      newSocket.io.off('reconnect_attempt', onReconnectAttempt);
      newSocket.io.off('reconnect');
      newSocket.io.off('reconnect_error');
      newSocket.io.off('reconnect_failed');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  // Helper: Emit event with error handling
  const emit = useCallback((eventName, payload, callback) => {
    if (!socketRef.current) {
      console.warn('[Socket.io] Socket not connected, cannot emit:', eventName);
      if (callback) {
        callback(new Error('Socket not connected'));
      }
      return;
    }

    const timeoutMs = resolveSocketTuning().ackTimeoutMs;
    socketRef.current.timeout(timeoutMs).emit(eventName, payload, (err) => {
      if (callback) {
        callback(err || null);
      }
    });
  }, []);

  // Helper: Listen for event
  const on = useCallback((eventName, handler) => {
    if (!socketRef.current) {
      console.warn('[Socket.io] Socket not connected, cannot listen:', eventName);
      return () => {};
    }

    socketRef.current.on(eventName, handler);

    // Return unsubscribe function
    return () => {
      socketRef.current?.off(eventName, handler);
    };
  }, []);

  return {
    socket,
    connected,
    reconnecting,
    connectionVersion,
    error,
    isOffline,
    emit,
    on,
  };
}

/**
 * Socket.io connection singleton for challenge events
 * Usage: Direct event emission/listening without React hooks
 */
let globalSocket = null;

export function initializeGlobalSocket() {
  if (globalSocket) return globalSocket;

  const token = getStoredAuthToken();

  globalSocket = io(getBackendOrigin(), buildSocketOptions(token));

  return globalSocket;
}

export function getGlobalSocket() {
  return globalSocket || initializeGlobalSocket();
}

export function disconnectGlobalSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}

export default useSocket;
