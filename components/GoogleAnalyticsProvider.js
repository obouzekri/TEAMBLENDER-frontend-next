'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { hasAnalyticsConsent } from '@/lib/consent';
import { trackGtmPageView } from '@/lib/analytics';

export default function GoogleAnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!hasAnalyticsConsent()) return;

    const query = typeof window !== 'undefined'
      ? String(window.location.search || '').replace(/^\?/, '')
      : '';
    const pagePath = query ? `${pathname}?${query}` : pathname;
    trackGtmPageView(pagePath);
  }, [pathname]);

  return null;
}
