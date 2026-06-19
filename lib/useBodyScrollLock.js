'use client';

import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    const body = document.body;
    const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;

    if (scrollBarGap > 0) {
      body.style.paddingRight = `${scrollBarGap}px`;
    }

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
    body.style.overflow = previousOverflow;
    body.style.paddingRight = previousPaddingRight;
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
