'use client';

import { useRef } from 'react';
import styles from './Modal.module.css';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import useModalFocus from '@/lib/useModalFocus';

export default function Modal({
  open,
  title,
  children,
  onClose,
  hideHeader = false,
  overlayClassName = '',
  dialogClassName = '',
  headerClassName = '',
  titleClassName = '',
  closeClassName = '',
  bodyClassName = '',
}) {
  const { locale } = useI18n();
  const closeLabel = locale === 'en' ? 'Close' : 'Fermer';

  useBodyScrollLock(open);
  const dialogRef = useRef(null);
  useModalFocus(open, dialogRef, onClose);

  if (!open) return null;

  return (
    <div className={[styles.overlay, overlayClassName].filter(Boolean).join(' ')} onClick={onClose} role="presentation">
      <div ref={dialogRef} tabIndex={-1} className={[styles.dialog, dialogClassName].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {!hideHeader ? (
          <div className={[styles.header, headerClassName].filter(Boolean).join(' ')}>
            <h2 className={[styles.title, titleClassName].filter(Boolean).join(' ')}>{title}</h2>
            <button type="button" className={[styles.close, closeClassName].filter(Boolean).join(' ')} aria-label={closeLabel} onClick={onClose}>×</button>
          </div>
        ) : null}
        <div className={bodyClassName || undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
