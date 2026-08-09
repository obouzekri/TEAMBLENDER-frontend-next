'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import styles from './ChallengeChatCard.module.css';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';

export default function ChallengeChatCard({
  className = '',
  messages = [],
  currentAuthor = '',
  inputValue = '',
  onInputChange,
  onSubmit,
  onQuickMessage,
  quickMessages = [],
  emptyText,
  placeholder,
  maxLength = 240,
  submitLabel,
  disabled = false,
  showCounter = true,
}) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const previousMessageCountRef = useRef(Array.isArray(messages) ? messages.length : 0);
  const logRef = useRef(null);
  const drawerTitle = t('chatCard.sessionTitle');
  const resolvedEmptyText = emptyText || t('chatCard.empty');
  const resolvedPlaceholder = placeholder || t('chatCard.placeholder');
  const closeChatLabel = t('chatCard.closeAria');
  const isMobileMode = isMobileViewport;

  useBodyScrollLock(mobileOpen && isMobileMode);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const apply = () => {
      setIsMobileViewport(media.matches);
    };

    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      setUnreadCount(0);
      previousMessageCountRef.current = Array.isArray(messages) ? messages.length : 0;
      return;
    }

    const currentLength = Array.isArray(messages) ? messages.length : 0;
    const previousLength = previousMessageCountRef.current;
    if (currentLength > previousLength) {
      const unreadMessages = messages
        .slice(previousLength)
        .filter((message) => String(message?.author || '') !== String(currentAuthor || ''));
      setUnreadCount((count) => count + unreadMessages.length);
    }
    previousMessageCountRef.current = currentLength;
  }, [currentAuthor, messages, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return () => {};

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      setUnreadCount(0);
    }
  }, [mobileOpen]);

  const chatContent = (
    <>
      {Array.isArray(quickMessages) && quickMessages.length > 0 ? (
        <div className={styles.quickRow}>
          {quickMessages.map((message) => (
            <button
              key={String(message)}
              type="button"
              className={styles.quickButton}
              onClick={() => onQuickMessage && onQuickMessage(message)}
              disabled={disabled}
            >
              {message}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.chatLog} ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
        {!Array.isArray(messages) || messages.length === 0 ? (
          <p className={styles.chatEmpty}>{resolvedEmptyText}</p>
        ) : messages.map((message) => {
          const mine = String(message?.author || '') === String(currentAuthor || '');
          return (
            <div key={String(message?.id || `${message?.author || 'msg'}-${message?.text || ''}`)} className={`${styles.chatRow}${mine ? ` ${styles.chatRowMine}` : ''}`}>
              <span className={styles.chatAuthor}>{String(message?.author || t('chatCard.systemAuthor'))}</span>
              <p className={styles.chatText}>{String(message?.text || '')}</p>
            </div>
          );
        })}
      </div>

      <form className={styles.chatForm} onSubmit={onSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => onInputChange && onInputChange(event.target.value)}
          className={styles.chatInput}
          placeholder={resolvedPlaceholder}
          maxLength={maxLength}
          disabled={disabled}
        />
        <button
          type="submit"
          className={styles.chatSubmit}
          disabled={disabled || !String(inputValue || '').trim()}
          aria-label={t('chatCard.sendAria')}
          title={t('chatCard.sendAria')}
        >
          {submitLabel || <Send size={18} strokeWidth={2} aria-hidden="true" />}
        </button>
      </form>

      {showCounter ? <p className={styles.chatHint}>{t('chatCard.counter', { count: String(inputValue || '').length, max: maxLength })}</p> : null}
    </>
  );

  return (
    <>
      <button
        type="button"
        className={`${styles.mobileChatFab} ${className}`.trim()}
        onClick={() => setMobileOpen(true)}
        aria-label={t('chatCard.title')}
        title={t('chatCard.title')}
      >
        <MessageCircle className={styles.mobileChatFabIcon} size={24} strokeWidth={2} aria-hidden="true" />
        {unreadCount > 0 ? <span className={styles.mobileChatFabBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>

      {mobileOpen ? (
        <div className={styles.mobileChatBackdrop} role="presentation" onClick={() => setMobileOpen(false)}>
          <section
            className={styles.mobileChatSheet}
            role="dialog"
            aria-modal="true"
            aria-label={drawerTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileChatHead}>
              <h3 className={`${styles.chatTitle} challenge-section-title`}>{drawerTitle}</h3>
              <button
                type="button"
                className={styles.mobileChatClose}
                onClick={() => setMobileOpen(false)}
                aria-label={closeChatLabel}
                title={closeChatLabel}
              >
                <X className={styles.mobileChatCloseIcon} size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {chatContent}
          </section>
        </div>
      ) : null}
    </>
  );
}
