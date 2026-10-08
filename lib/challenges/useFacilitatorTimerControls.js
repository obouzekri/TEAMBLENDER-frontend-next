'use client';

import { useCallback } from 'react';
import useConfirmedAction from './useConfirmedAction';

function getTimerStatus(snapshot) {
  return String(snapshot?.quiz?.status || snapshot?.timer?.status || 'idle').trim().toLowerCase();
}

export default function useFacilitatorTimerControls({
  socket,
  emitEvent,
  state,
  isFacilitator,
  pauseEvent = 'timer.pause',
  resumeEvent = 'timer.resume',
  statusSelector = getTimerStatus,
}) {
  const action = useConfirmedAction({
    socket,
    emitEvent,
    state,
    requiresRunningTimer: false,
  });

  const pause = useCallback(() => {
    if (!isFacilitator) return false;
    return action.run({
      type: pauseEvent,
      payload: {},
      isAvailable: (snapshot) => statusSelector(snapshot) === 'running',
      isConfirmed: (snapshot) => statusSelector(snapshot) === 'paused',
    });
  }, [action, isFacilitator, pauseEvent, statusSelector]);

  const resume = useCallback(() => {
    if (!isFacilitator) return false;
    return action.run({
      type: resumeEvent,
      payload: {},
      isAvailable: (snapshot) => statusSelector(snapshot) === 'paused',
      isConfirmed: (snapshot) => statusSelector(snapshot) === 'running',
    });
  }, [action, isFacilitator, resumeEvent, statusSelector]);

  return {
    pause: isFacilitator ? pause : null,
    resume: isFacilitator ? resume : null,
    busy: action.busy,
    feedback: action.feedback,
  };
}
