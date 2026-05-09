'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const FACILITATOR_ROLES = new Set(['admin', 'manager', 'facilitator', 'user', 'owner', 'host', 'animateur']);

export default function useRealtimeChallenge({ runtimePayload, socket, context }) {
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  const challengeKey = String(runtimePayload?.engine_key || '').trim();
  const sessionId = String(context?.sessionId || runtimePayload?.session_id || '').trim();
  const participantId = String(context?.userId || runtimePayload?.context?.participantId || '').trim();
  const role = String(context?.role || runtimePayload?.context?.role || 'participant').trim();
  const displayName = String(runtimePayload?.context?.displayName || '').trim() || `participant-${participantId || 'unknown'}`;

  const isFacilitator = useMemo(() => FACILITATOR_ROLES.has(role.toLowerCase()), [role]);

  const emitEvent = useCallback((type, payload = {}) => {
    if (!socket || !socket.connected || !type) return;
    socket.emit('challenge:event', { type, payload });
  }, [socket]);

  const joinChallenge = useCallback(() => {
    if (!socket || !socket.connected || !sessionId || !challengeKey || !participantId) return;

    socket.emit('challenge:join', {
      sessionId,
      challengeKey,
      participantId,
      role,
      name: displayName,
      config: runtimePayload?.config || {},
    });
  }, [socket, sessionId, challengeKey, participantId, role, displayName, runtimePayload]);

  useEffect(() => {
    if (!socket || !socket.connected) return;

    const onState = (payload) => {
      const nextState = payload?.state || null;
      const participantSlot = Number(payload?.participantSlot);
      if (!nextState) {
        setState(null);
        return;
      }

      setState({
        ...nextState,
        participantSlot: Number.isInteger(participantSlot) ? participantSlot : null,
      });
    };

    const onEvent = (packet = {}) => {
      setEvents((prev) => [packet, ...prev].slice(0, 30));

      const type = String(packet?.type || '').trim();
      const payload = packet?.payload || {};

      if (type === 'phrase.state') {
        setState((prev) => ({
          ...(prev || {}),
          phrase: payload?.phrase || (prev?.phrase || null),
          config: payload?.config || (prev?.config || null),
        }));
      }

      if (type === 'puzzle.state') {
        setState((prev) => ({
          ...(prev || {}),
          puzzle: {
            ...(prev?.puzzle || {}),
            pieces: Array.isArray(payload?.pieces) ? payload.pieces : (prev?.puzzle?.pieces || []),
          },
          config: payload?.config || (prev?.config || null),
        }));
      }

      if (type === 'laby.state') {
        setState((prev) => ({
          ...(prev || {}),
          labyrinthe: payload?.state || (prev?.labyrinthe || null),
        }));
      }

      if (type === 'timer.state' || type === 'timer.tick') {
        setState((prev) => ({
          ...(prev || {}),
          timer: {
            ...(prev?.timer || {}),
            ...(payload || {}),
          },
        }));
      }

      if (type === 'puzzle.completed' || type === 'phrase.completed') {
        setState((prev) => ({
          ...(prev || {}),
          summary: payload?.summary || prev?.summary || null,
          timer: {
            ...(prev?.timer || {}),
            status: 'completed',
          },
        }));
      }
    };

    const onError = (packet) => {
      setError(String(packet?.message || 'Erreur realtime inconnue'));
    };

    socket.on('challenge:state', onState);
    socket.on('challenge:event', onEvent);
    socket.on('challenge:error', onError);

    joinChallenge();

    return () => {
      socket.off('challenge:state', onState);
      socket.off('challenge:event', onEvent);
      socket.off('challenge:error', onError);
    };
  }, [socket, joinChallenge]);

  return {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
    joinChallenge,
    challengeKey,
    sessionId,
    participantId,
  };
}
