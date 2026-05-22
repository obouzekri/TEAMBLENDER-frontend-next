'use client';

import { useCallback, useEffect, useState } from 'react';

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

      setChatMessages((prev) => {
        if (prev.some((msg) => msg.id === entry.id)) return prev;
        return [...prev.slice(-(Math.max(1, Number(maxMessages || 80)) - 1)), entry];
      });
    };

    socket.on('challenge:event', onEvent);
    return () => {
      socket.off('challenge:event', onEvent);
    };
  }, [enabled, maxMessages, socket]);

  const sendMessage = useCallback((rawText) => {
    if (!enabled || typeof emitEvent !== 'function') return false;

    const text = String(rawText || '').trim();
    if (!text) return false;

    emitEvent('chat.message', {
      text: text.slice(0, Math.max(1, Number(maxLength || 240))),
      author,
    });

    return true;
  }, [author, emitEvent, enabled, maxLength]);

  const submitChat = useCallback((event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const sent = sendMessage(chatInput);
    if (sent) {
      setChatInput('');
    }
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
  };
}
