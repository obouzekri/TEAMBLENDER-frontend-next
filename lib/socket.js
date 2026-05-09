'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { getBackendOrigin } from './config';

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
  const socketRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      setReconnecting(false);
      setError(null);
      return () => {};
    }

    // Get JWT token for authentication
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '')
      : '';

    // Create Socket.io instance with authentication and reconnect config
    const newSocket = io(getBackendOrigin(), {
      auth: {
        token: token || null,
      },
      reconnection: true,
      reconnectionDelay: 1000, // Start with 1s
      reconnectionDelayMax: 5000, // Max 5s
      reconnectionAttempts: Infinity, // Infinite retries
      transports: ['websocket', 'polling'], // Fallback to polling if WebSocket unavailable
    });

    // Connection established
    newSocket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);
      console.log('[Socket.io] Connected:', newSocket.id);
    });

    // Attempting to reconnect
    newSocket.on('reconnecting', () => {
      setReconnecting(true);
      console.log('[Socket.io] Reconnecting...');
    });

    // Reconnection failed
    newSocket.on('reconnect_failed', () => {
      setError('Impossible de se reconnecter au serveur. Vérifiez votre connexion réseau.');
      console.error('[Socket.io] Reconnection failed');
    });

    // Connection error
    newSocket.on('connect_error', (err) => {
      const message = typeof err === 'string' ? err : (err?.message || 'Erreur de connexion WebSocket');
      setError(message);
      console.error('[Socket.io] Error:', err);
    });

    // Connection lost
    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[Socket.io] Disconnected:', reason);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.off('connect');
      newSocket.off('reconnecting');
      newSocket.off('reconnect_failed');
      newSocket.off('connect_error');
      newSocket.off('disconnect');
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

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

  globalSocket = io(getBackendOrigin(), {
    auth: { token: token || null },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  });

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
