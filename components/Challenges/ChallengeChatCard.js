'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './ChallengeChatCard.module.css';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';

export default function ChallengeChatCard({
  className = '',
  title,
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
  submitLabel = '➤',
  disabled = false,
  showCounter = true,
  collapsible = true,
  defaultCollapsed = false,
}) {
  const { t, locale } = useI18n();
  const isEn = locale === 'en';
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const previousMessageCountRef = useRef(Array.isArray(messages) ? messages.length : 0);
  const logRef = useRef(null);
  const resolvedTitle = title || t('chatCard.title');
  const resolvedEmptyText = emptyText || t('chatCard.empty');
  const resolvedPlaceholder = placeholder || t('chatCard.placeholder');
  const closeChatLabel = isEn ? 'Close chat' : 'Fermer le chat';
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
    if (collapsed || (isMobileMode && !mobileOpen)) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, collapsed, isMobileMode, mobileOpen]);

  useEffect(() => {
    if (!isMobileMode || mobileOpen) {
      setUnreadCount(0);
      previousMessageCountRef.current = Array.isArray(messages) ? messages.length : 0;
      return;
    }

    const currentLength = Array.isArray(messages) ? messages.length : 0;
    const previousLength = previousMessageCountRef.current;
    if (currentLength > previousLength) {
      setUnreadCount((count) => count + (currentLength - previousLength));
    }
    previousMessageCountRef.current = currentLength;
  }, [messages, isMobileMode, mobileOpen]);

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
          {submitLabel}
        </button>
      </form>

      {showCounter ? <p className={styles.chatHint}>{t('chatCard.counter', { count: String(inputValue || '').length, max: maxLength })}</p> : null}
    </>
  );

  return (
    <>
      <section className={`${styles.chatCard} ${collapsed ? styles.chatCardCollapsed : ''} ${className}`.trim()}>
        <div className={styles.chatHeader}>
          <h3 className={`${styles.chatTitle} challenge-section-title`}>{resolvedTitle}</h3>
          {collapsible ? (
            <button
              type="button"
              className={styles.chatToggleBtn}
              onClick={() => setCollapsed((prev) => !prev)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? t('chatCard.expandAria') : t('chatCard.collapseAria')}
              title={collapsed ? t('chatCard.expandTitle') : t('chatCard.collapseTitle')}
            >
              {collapsed ? '▾' : '▴'}
            </button>
          ) : null}
        </div>

        {collapsed ? null : chatContent}
      </section>

      <button
        type="button"
        className={styles.mobileChatFab}
        onClick={() => setMobileOpen(true)}
        aria-label={t('chatCard.title')}
        title={t('chatCard.title')}
      >
        <span className={styles.mobileChatFabIcon} aria-hidden="true">💬</span>
        {unreadCount > 0 ? <span className={styles.mobileChatFabBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>

      {mobileOpen ? (
        <div className={styles.mobileChatBackdrop} role="presentation" onClick={() => setMobileOpen(false)}>
          <section
            className={styles.mobileChatSheet}
            role="dialog"
            aria-modal="true"
            aria-label={resolvedTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileChatHead}>
              <h3 className={`${styles.chatTitle} challenge-section-title`}>{resolvedTitle}</h3>
              <button
                type="button"
                className={styles.mobileChatClose}
                onClick={() => setMobileOpen(false)}
                aria-label={closeChatLabel}
                title={closeChatLabel}
              >
                <span className={styles.mobileChatCloseIcon} aria-hidden="true">✕</span>
                <span>{isEn ? 'Close' : 'Fermer'}</span>
              </button>
            </div>
            {chatContent}
          </section>
        </div>
      ) : null}
    </>
  );
}
