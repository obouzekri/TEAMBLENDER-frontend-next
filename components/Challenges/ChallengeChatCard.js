'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './ChallengeChatCard.module.css';
import useI18n from '@/lib/i18n/useI18n';

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
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));
  const logRef = useRef(null);
  const resolvedTitle = title || t('chatCard.title');
  const resolvedEmptyText = emptyText || t('chatCard.empty');
  const resolvedPlaceholder = placeholder || t('chatCard.placeholder');

  useEffect(() => {
    if (collapsed) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, collapsed]);

  return (
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

      {collapsed ? null : (
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
      )}
    </section>
  );
}
