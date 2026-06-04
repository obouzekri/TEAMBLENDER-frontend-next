'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackGtmPageView } from '@/lib/analytics';

export default function GoogleAnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const query = typeof window !== 'undefined'
      ? String(window.location.search || '').replace(/^\?/, '')
      : '';
    const pagePath = query ? `${pathname}?${query}` : pathname;
    trackGtmPageView(pagePath);
  }, [pathname]);

  return null;
}
