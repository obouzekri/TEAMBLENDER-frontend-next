'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import useSocketConnection from './useSocketConnection';

export default function useConfirmedAction({ socket, emitEvent, state, resetKey = null, requiresRunningTimer = true }) {
  const { t } = useI18n();
  const connected = useSocketConnection(socket);
  const pendingRef = useRef(null);
  const lastRef = useRef(null);
  const timerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [status, setStatus] = useState('idle');
  const [failure, setFailure] = useState('');
  const fail = useCallback((message) => {
    window.clearTimeout(timerRef.current);
    pendingRef.current = null;
    setStatus('failed');
    setFailure(message);
  }, []);
  const confirm = useCallback(() => {
    const action = pendingRef.current;
    if (!action) return;
    pendingRef.current = null;
    window.clearTimeout(timerRef.current);
    setStatus('confirmed');
    setFailure('');
    action.onConfirmed?.();
  }, []);

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    pendingRef.current = null;
    lastRef.current = null;
    setStatus('idle');
    setFailure('');
  }, [resetKey]);

  useEffect(() => {
    if (pendingRef.current?.isConfirmed(state)) {
      confirm();
    }
  }, [state, confirm]);

  useEffect(() => {
    const onDisconnect = () => {
      if (pendingRef.current) fail(t('challengeAction.interrupted'));
    };
    const onError = (packet) => {
      if (pendingRef.current) fail(String(packet?.message || t('challengeAction.failed')));
    };
    const onEvent = (packet) => {
      if (pendingRef.current?.isConfirmedEvent?.(packet)) confirm();
    };
    socket?.on('disconnect', onDisconnect);
    socket?.on('challenge:error', onError);
    socket?.on('challenge:event', onEvent);
    return () => {
      socket?.off('disconnect', onDisconnect);
      socket?.off('challenge:error', onError);
      socket?.off('challenge:event', onEvent);
    };
  }, [socket, fail, t, confirm]);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const run = useCallback((action) => {
    if (pendingRef.current) return false;
    lastRef.current = action;
    if (!socket?.connected) {
      fail(t('challengeAction.offline'));
      return false;
    }
    const timer = stateRef.current?.timer;
    if ((requiresRunningTimer && timer?.enabled !== false && timer?.status !== 'running') || (action.isAvailable && !action.isAvailable(stateRef.current))) {
      fail(t('challengeAction.unavailable'));
      return false;
    }
    if (action.isConfirmed(stateRef.current)) {
      setStatus('confirmed');
      setFailure('');
      action.onConfirmed?.();
      return true;
    }
    pendingRef.current = action;
    setStatus('pending');
    setFailure('');
    if (emitEvent(action.type, action.payload) !== true) {
      fail(t('challengeAction.failed'));
      return false;
    }
    timerRef.current = window.setTimeout(() => fail(t('challengeAction.unconfirmed')), 10000);
    return true;
  }, [socket, emitEvent, fail, t, requiresRunningTimer]);

  return {
    run,
    busy: status === 'pending',
    feedback: {
      status,
      message: status === 'pending' ? t('challengeAction.sending') : status === 'confirmed' ? t('challengeAction.confirmed') : failure,
      retry: status === 'failed' && connected && (!requiresRunningTimer || state?.timer?.enabled === false || state?.timer?.status === 'running') && (!lastRef.current?.isAvailable || lastRef.current.isAvailable(state)) ? () => lastRef.current && run(lastRef.current) : null,
    },
  };
}
