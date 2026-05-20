'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FACILITATOR_ROLES = new Set(['admin', 'manager', 'facilitator', 'user', 'owner', 'host', 'animateur']);

export default function useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  const challengeKey = String(runtimePayload?.engine_key || '').trim();
  const sessionId = String(context?.sessionId || runtimePayload?.session_id || '').trim();
  const participantId = String(
    context?.userId
    || context?.participantId
    || runtimePayload?.context?.participantId
    || ''
  ).trim();
  const role = String(context?.role || runtimePayload?.context?.role || 'participant').trim();
  const displayName = String(runtimePayload?.context?.displayName || '').trim() || `participant-${participantId || 'unknown'}`;
  const challengeId = String(
    runtimePayload?.challenge_id
    || context?.challengeId
    || runtimePayload?.context?.challengeId
    || ''
  ).trim();

  const isFacilitator = useMemo(() => FACILITATOR_ROLES.has(role.toLowerCase()), [role]);
  const completionEventKeyRef = useRef('');
  const joinKeyRef = useRef('');

  const emitEvent = useCallback((type, payload = {}) => {
    if (!socket || !socket.connected || !type) return;
    socket.emit('challenge:event', { type, payload });
  }, [socket]);

  const joinChallenge = useCallback((force = false) => {
    if (!socket || !socket.connected || !sessionId || !challengeKey || !participantId) return;

    const nextJoinKey = `${sessionId}:${challengeKey}:${challengeId}:${participantId}:${role}`;
    if (!force && joinKeyRef.current === nextJoinKey) {
      return;
    }
    joinKeyRef.current = nextJoinKey;

    socket.emit('challenge:join', {
      sessionId,
      challengeKey,
      challengeId,
      participantId,
      role,
      name: displayName,
      config: runtimePayload?.config || {},
    });
  }, [socket, sessionId, challengeKey, challengeId, participantId, role, displayName, runtimePayload]);

  useEffect(() => {
    joinKeyRef.current = '';
  }, [sessionId, challengeKey, challengeId, participantId, role]);

  useEffect(() => {
    if (!socket) return;

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

      if (type === 'mission.state') {
        setState((prev) => ({
          ...(prev || {}),
          mission: payload?.mission || (prev?.mission || null),
          config: payload?.config || (prev?.config || null),
        }));
      }

      if (type === 'vom.state') {
        setState((prev) => ({
          ...(prev || {}),
          vom: payload?.vom || (prev?.vom || null),
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

      if (type === 'puzzle.completed' || type === 'phrase.completed' || type === 'mission.completed' || type === 'vom.completed') {
        const completionKey = `${sessionId}:${challengeKey}:${type}:${String(payload?.reason || '')}`;
        if (completionEventKeyRef.current !== completionKey) {
          completionEventKeyRef.current = completionKey;
          if (typeof onChallengeCompleted === 'function') {
            onChallengeCompleted({
              type,
              payload,
              challengeId,
              challengeKey,
              sessionId,
            });
          }
        }

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

    const onConnect = () => {
      joinChallenge(true);
    };

    socket.on('challenge:state', onState);
    socket.on('challenge:event', onEvent);
    socket.on('challenge:error', onError);
    socket.on('connect', onConnect);

    if (socket.connected) {
      joinChallenge();
    }

    return () => {
      socket.off('challenge:state', onState);
      socket.off('challenge:event', onEvent);
      socket.off('challenge:error', onError);
      socket.off('connect', onConnect);
    };
  }, [socket, joinChallenge, onChallengeCompleted, challengeKey, sessionId]);

  return {
    state,
    events,
    error,
    isFacilitator,
    emitEvent,
    joinChallenge,
    challengeKey,
    challengeId,
    sessionId,
    participantId,
  };
}
