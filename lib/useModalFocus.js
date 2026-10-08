'use client';

import { useEffect, useRef } from 'react';

const modalStack = [];
const selector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function useModalFocus(open, dialogRef, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;
    const previousFocus = document.activeElement;
    modalStack.push(dialog);
    const controls = () => Array.from(dialog.querySelectorAll(selector)).filter((node) => node.getClientRects().length && !node.closest('[inert]'));
    const focusFirst = () => (controls()[0] || dialog).focus();
    focusFirst();
    const isTop = () => modalStack[modalStack.length - 1] === dialog;
    const onFocus = (event) => {
      if (isTop() && !dialog.contains(event.target)) focusFirst();
    };
    const onKeyDown = (event) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocus);
      const index = modalStack.lastIndexOf(dialog);
      if (index >= 0) modalStack.splice(index, 1);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, dialogRef]);
}
