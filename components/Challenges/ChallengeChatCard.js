'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './ChallengeChatCard.module.css';

export default function ChallengeChatCard({
  className = '',
  title = 'Chat',
  messages = [],
  currentAuthor = '',
  inputValue = '',
  onInputChange,
  onSubmit,
  onQuickMessage,
  quickMessages = [],
  emptyText = 'Aucun message pour le moment.',
  placeholder = 'Ecrire un message',
  maxLength = 240,
  submitLabel = '➤',
  disabled = false,
  showCounter = true,
  collapsible = true,
  defaultCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));
  const logRef = useRef(null);

  useEffect(() => {
    if (collapsed) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, collapsed]);

  return (
    <section className={`${styles.chatCard} ${collapsed ? styles.chatCardCollapsed : ''} ${className}`.trim()}>
      <div className={styles.chatHeader}>
        <h3 className={`${styles.chatTitle} challenge-section-title`}>{title}</h3>
        {collapsible ? (
          <button
            type="button"
            className={styles.chatToggleBtn}
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Afficher le chat' : 'Réduire le chat'}
            title={collapsed ? 'Afficher' : 'Réduire'}
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
              <p className={styles.chatEmpty}>{emptyText}</p>
            ) : messages.map((message) => {
              const mine = String(message?.author || '') === String(currentAuthor || '');
              return (
                <div key={String(message?.id || `${message?.author || 'msg'}-${message?.text || ''}`)} className={`${styles.chatRow}${mine ? ` ${styles.chatRowMine}` : ''}`}>
                  <span className={styles.chatAuthor}>{String(message?.author || 'system')}</span>
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
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={disabled}
            />
            <button
              type="submit"
              className={styles.chatSubmit}
              disabled={disabled || !String(inputValue || '').trim()}
              aria-label="Envoyer"
              title="Envoyer"
            >
              {submitLabel}
            </button>
          </form>

          {showCounter ? <p className={styles.chatHint}>{String(inputValue || '').length}/{maxLength} caracteres</p> : null}
        </>
      )}
    </section>
  );
}
