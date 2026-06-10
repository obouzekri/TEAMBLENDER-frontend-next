'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { getBackendOrigin } from './config';

function resolveSocketTransports() {
  const backendOrigin = String(getBackendOrigin() || '').trim();

  // On production frontend proxy (teamblender.io), websocket upgrade through
  // /socket.io rewrite can fail intermittently with 400. Polling remains stable.
  if (
    typeof window !== 'undefined'
    && !backendOrigin
    && String(window.location.hostname || '').toLowerCase().endsWith('teamblender.io')
  ) {
    return ['polling'];
  }

  return ['polling', 'websocket'];
}

function buildSocketOptions(token) {
  const transports = resolveSocketTransports();
  return {
    auth: {
      token: token || null,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 12,
    randomizationFactor: 0.5,
    transports,
    timeout: 8000,
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
  const socketRef = useRef(null);

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
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '')
      : '';

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
      return;
    }

    socketRef.current.emit(eventName, payload, (err) => {
      if (err && callback) {
        callback(err);
      } else if (!err && callback) {
        callback(null);
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

  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '')
    : '';

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
