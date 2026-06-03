'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { getGaMeasurementId, isGaEnabled, trackGaPageView } from '@/lib/analytics';

const GA_MEASUREMENT_ID = getGaMeasurementId();

export default function GoogleAnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isGaEnabled()) return;
    const query = typeof window !== 'undefined'
      ? String(window.location.search || '').replace(/^\?/, '')
      : '';
    const pagePath = query ? `${pathname}?${query}` : pathname;
    trackGaPageView(pagePath);
  }, [pathname]);

  if (!isGaEnabled()) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
