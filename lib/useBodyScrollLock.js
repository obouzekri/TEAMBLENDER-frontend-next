'use client';

import { useEffect } from 'react';

let lockCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousHtmlOverflow = '';

function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    const body = document.body;
    const html = document.documentElement;
    const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    previousHtmlOverflow = html.style.overflow;

    if (scrollBarGap > 0) {
      body.style.paddingRight = `${scrollBarGap}px`;
    }

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
  }

  lockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount === 0) {
    const body = document.body;
    const html = document.documentElement;

    body.style.overflow = previousBodyOverflow;
    body.style.paddingRight = previousBodyPaddingRight;
    html.style.overflow = previousHtmlOverflow;
  }
}

export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) {
      return undefined;
    }

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
