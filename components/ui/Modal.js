'use client';

import { useEffect } from 'react';
import styles from './Modal.module.css';

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} aria-label="Fermer" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
