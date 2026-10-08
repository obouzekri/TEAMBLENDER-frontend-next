'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import useSocketConnection from './useSocketConnection';

export default function useChallengeChat({
  socket,
  emitEvent,
  author = 'system',
  enabled = true,
  maxMessages = 80,
  maxLength = 240,
}) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [failure, setFailure] = useState('');
  const pendingRef = useRef(null);
  const lastMessageRef = useRef(null);
  const timeoutRef = useRef(null);
  const connected = useSocketConnection(socket);
  const { t } = useI18n();

  const fail = useCallback((message) => {
    window.clearTimeout(timeoutRef.current);
    pendingRef.current = null;
    setFailure(message);
    setStatus('failed');
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    if (!socket || !enabled) return () => {};

    const onEvent = (packet = {}) => {
      if (String(packet?.type || '').trim() !== 'chat.message') return;

      const payload = packet?.payload || {};
      const text = String(payload?.text || '').trim();
      if (!text) return;

      const entry = {
        id: String(payload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        author: String(payload?.author || 'system').trim() || 'system',
        text,
        ts: String(payload?.ts || ''),
      };
      if (payload.client_msg_id && payload.client_msg_id === pendingRef.current?.id) {
        const pending = pendingRef.current;
        window.clearTimeout(timeoutRef.current);
        pendingRef.current = null;
        setStatus('confirmed');
        setFailure('');
        if (pending.isDraft) setChatInput((current) => current === pending.rawText ? '' : current);
      }

      setChatMessages((prev) => {
        if (prev.some((msg) => msg.id === entry.id)) return prev;
        return [...prev.slice(-(Math.max(1, Number(maxMessages || 80)) - 1)), entry];
      });
    };

    socket.on('challenge:event', onEvent);
    const onDisconnect = () => {
      if (pendingRef.current) fail(t('chatCard.interrupted'));
    };
    const onError = (packet) => {
      if (pendingRef.current) fail(String(packet?.message || t('chatCard.failed')));
    };
    socket.on('disconnect', onDisconnect);
    socket.on('challenge:error', onError);
    return () => {
      socket.off('challenge:event', onEvent);
      socket.off('disconnect', onDisconnect);
      socket.off('challenge:error', onError);
    };
  }, [enabled, maxMessages, socket, fail, t]);

  const sendMessage = useCallback((rawText, isDraft = false) => {
    if (pendingRef.current) return false;

    const text = String(rawText || '').trim();
    if (!text) return false;
    lastMessageRef.current = { rawText, isDraft };
    if (!enabled || !socket?.connected || typeof emitEvent !== 'function') {
      fail(t('chatCard.offline'));
      return false;
    }
    const id = globalThis.crypto.randomUUID();
    pendingRef.current = { id, rawText, isDraft };
    setStatus('pending');
    setFailure('');
    const sent = emitEvent('chat.message', { text: text.slice(0, Math.max(1, Number(maxLength || 240))), author, client_msg_id: id });
    if (sent !== true) {
      fail(t('chatCard.failed'));
      return false;
    }
    timeoutRef.current = window.setTimeout(() => fail(t('chatCard.unconfirmed')), 10000);
    return true;
  }, [author, emitEvent, enabled, maxLength, socket, fail, t]);

  const submitChat = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    sendMessage(chatInput, true);
  }, [chatInput, sendMessage]);

  const sendQuickChat = useCallback((text) => {
    return sendMessage(text);
  }, [sendMessage]);

  return {
    chatInput,
    setChatInput,
    chatMessages,
    submitChat,
    sendQuickChat,
    sendMessage,
    chatDelivery: {
      status,
      connected,
      pending: status === 'pending',
      message: !connected ? t('chatCard.offline') : status === 'pending' ? t('chatCard.sending') : status === 'confirmed' ? t('chatCard.confirmed') : failure,
      retry: () => {
        const last = lastMessageRef.current;
        if (last) sendMessage(last.isDraft ? chatInput : last.rawText, last.isDraft);
      },
    },
  };
}
