'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FACILITATOR_ROLES = new Set(['admin', 'manager', 'facilitator', 'facilitateur', 'user', 'owner', 'host', 'animateur']);

function toTitleWord(raw) {
  const token = String(raw || '').trim().toLowerCase();
  if (!token) return '';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function humanizeEmail(value) {
  const normalized = String(value || '').trim();
  if (!normalized || !normalized.includes('@')) return normalized;

  const localPart = normalized.split('@')[0] || '';
  const chunks = localPart
    .replace(/[^a-zA-Z._-]/g, ' ')
    .split(/[._\-\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!chunks.length) return normalized;
  if (chunks.length === 1) {
    return toTitleWord(chunks[0]);
  }
  return `${toTitleWord(chunks[0])} ${toTitleWord(chunks[chunks.length - 1])}`.trim();
}

function resolveDisplayName(runtimePayload, context, participantId) {
  const runtimeFirst = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || '').trim();
  const runtimeLast = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || '').trim();
  const runtimeFull = `${runtimeFirst} ${runtimeLast}`.trim();
  if (runtimeFull) return runtimeFull;

  const contextFirst = String(context?.firstName || context?.first_name || '').trim();
  const contextLast = String(context?.lastName || context?.last_name || '').trim();
  const contextFull = `${contextFirst} ${contextLast}`.trim();
  if (contextFull) return contextFull;

  const explicit = String(runtimePayload?.context?.displayName || context?.displayName || '').trim();
  if (explicit) return humanizeEmail(explicit) || explicit;

  const email = String(runtimePayload?.context?.email || context?.email || '').trim();
  if (email) return humanizeEmail(email) || email;

  return `Participant ${participantId || 'unknown'}`;
}

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
  const displayName = resolveDisplayName(runtimePayload, context, participantId);
  const firstName = String(runtimePayload?.context?.firstName || runtimePayload?.context?.first_name || context?.firstName || context?.first_name || '').trim();
  const lastName = String(runtimePayload?.context?.lastName || runtimePayload?.context?.last_name || context?.lastName || context?.last_name || '').trim();
  const email = String(runtimePayload?.context?.email || context?.email || '').trim();
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
      displayName,
      firstName,
      first_name: firstName,
      lastName,
      last_name: lastName,
      email,
      config: runtimePayload?.config || {},
    });
  }, [socket, sessionId, challengeKey, challengeId, participantId, role, displayName, firstName, lastName, email, runtimePayload]);

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

      if (type === 'pixel.state') {
        setState((prev) => ({
          ...(prev || {}),
          pixel: payload?.pixel || (prev?.pixel || null),
          config: payload?.config || (prev?.config || null),
        }));
      }

      if (type === 'quiz.state') {
        const incomingQuiz = payload && typeof payload === 'object'
          ? (payload.quiz && typeof payload.quiz === 'object' ? payload.quiz : payload)
          : null;

        setState((prev) => ({
          ...(prev || {}),
          quiz: incomingQuiz || (prev?.quiz || null),
          config: payload?.config || incomingQuiz?.config || (prev?.config || null),
        }));
      }

      if (type === 'answer_submitted' || type === 'leaderboard_updated' || type === 'question_started' || type === 'question_finished' || type === 'session_started' || type === 'session_finished') {
        setState((prev) => {
          const previousQuiz = prev?.quiz && typeof prev.quiz === 'object' ? prev.quiz : null;
          if (!previousQuiz) return prev;

          const nextQuiz = { ...previousQuiz };

          if (type === 'answer_submitted') {
            nextQuiz.answer_count = Number(payload?.answer_count || previousQuiz.answer_count || 0);
          }

          if (type === 'leaderboard_updated') {
            nextQuiz.leaderboard = Array.isArray(payload?.leaderboard)
              ? payload.leaderboard
              : previousQuiz.leaderboard || [];
          }

          if (type === 'question_started') {
            nextQuiz.phase = 'question_live';
            nextQuiz.question_index = Number(payload?.question_index || 0);
            nextQuiz.current_question = payload?.question || previousQuiz.current_question || null;
            nextQuiz.question_ends_at = payload?.ends_at || previousQuiz.question_ends_at || null;
            nextQuiz.answer_count = 0;
          }

          if (type === 'question_finished') {
            const previousHistory = Array.isArray(previousQuiz.question_history)
              ? previousQuiz.question_history
              : [];
            const incomingQuestionId = Number(payload?.question_id || 0);
            const nextHistory = previousHistory.filter((entry) => Number(entry?.question_id || 0) !== incomingQuestionId);
            nextHistory.push({
              question_id: incomingQuestionId,
              question_index: Number(payload?.question_index || previousQuiz.question_index || 0),
              question: payload?.question || previousQuiz.current_question || null,
              correct_choice_index: Number(payload?.correct_choice_index),
              explanation: String(payload?.explanation || previousQuiz?.latest_question_result?.explanation || ''),
              answer_count: Number(payload?.answer_count || 0),
              reason: String(payload?.reason || 'completed'),
            });

            nextQuiz.phase = 'question_result';
            nextQuiz.latest_question_result = {
              ...(previousQuiz.latest_question_result || {}),
              correct_choice_index: Number(payload?.correct_choice_index),
              answer_count: Number(payload?.answer_count || 0),
              explanation: String(payload?.explanation || previousQuiz?.latest_question_result?.explanation || ''),
            };
            nextQuiz.question_history = nextHistory;
            if (Array.isArray(payload?.leaderboard)) {
              nextQuiz.leaderboard = payload.leaderboard;
            }
          }

          if (type === 'session_started') {
            nextQuiz.phase = 'question_live';
          }

          if (type === 'session_finished') {
            nextQuiz.phase = 'final_score';
            nextQuiz.final_standings = Array.isArray(payload?.final_standings)
              ? payload.final_standings
              : previousQuiz.final_standings || [];
          }

          return {
            ...(prev || {}),
            quiz: nextQuiz,
          };
        });
      }

      if (type === 'participants.update') {
        setState((prev) => ({
          ...(prev || {}),
          participants_status: payload || null,
          quiz: prev?.quiz
            ? {
                ...(prev.quiz || {}),
                connected_count: Number(payload?.connected_count || 0),
                slot_count: Number(payload?.slot_count || 0),
                participants: Array.isArray(payload?.participants)
                  ? payload.participants
                  : (prev.quiz?.participants || []),
              }
            : prev?.quiz || null,
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

      if (type === 'puzzle.completed' || type === 'phrase.completed' || type === 'mission.completed' || type === 'vom.completed' || type === 'pixel.completed' || type === 'quiz.completed' || type === 'session_finished') {
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
