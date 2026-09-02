"use client";

import { useEffect, useState } from 'react';

// Shows a sticky CTA once the given sentinel element scrolls out of view, but
// only below the desktop breakpoint (mirrors the hero's mobile-only sticky bar).
export default function useStickyCtaVisibility(sentinelRef) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(Boolean(mobileQuery.matches && !entry.isIntersecting));
      },
      { threshold: 0.08, rootMargin: '0px 0px -24% 0px' }
    );

    observer.observe(sentinel);

    const handleResize = () => {
      if (!mobileQuery.matches) {
        setIsVisible(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [sentinelRef]);

  return isVisible;
}
