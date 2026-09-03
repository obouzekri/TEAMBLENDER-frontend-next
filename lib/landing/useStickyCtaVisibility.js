"use client";

import { useEffect, useState } from 'react';

// Shows a sticky CTA once the given sentinel element scrolls out of view, but
// only below the desktop breakpoint (mirrors the hero's mobile-only sticky bar).
export default function useStickyCtaVisibility(sentinelRef) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const updateVisibility = () => {
      setIsVisible(Boolean(mobileQuery.matches && sentinel.getBoundingClientRect().top <= 0));
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);

    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('resize', updateVisibility);
    };
  }, [sentinelRef]);

  return isVisible;
}
