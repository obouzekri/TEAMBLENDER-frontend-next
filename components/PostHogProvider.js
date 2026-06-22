'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { trackGaEvent } from '@/lib/analytics';
import { hasAnalyticsConsent } from '@/lib/consent';

const POSTHOG_PROJECT_TOKEN = String(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
).trim();
const POSTHOG_HOST = String(process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com').trim();

function capturePerformanceEvent() {
  if (typeof window === 'undefined' || !window.performance) return;

  const send = () => {
    const entries = window.performance.getEntriesByType('navigation');
    const navEntry = Array.isArray(entries) ? entries[0] : null;
    const pageLoadMs = Number(navEntry?.duration || 0);

    if (!Number.isFinite(pageLoadMs) || pageLoadMs <= 0) return;

    posthog.capture('web_performance', {
      page_load_ms: Math.round(pageLoadMs),
      route: window.location.pathname,
    });

    trackGaEvent('web_performance', {
      page_load_ms: Math.round(pageLoadMs),
      route: window.location.pathname,
    });
  };

  if (document.readyState === 'complete') {
    send();
    return;
  }

  window.addEventListener('load', send, { once: true });
}

export default function PostHogProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!POSTHOG_PROJECT_TOKEN || typeof window === 'undefined' || !hasAnalyticsConsent()) return;

    if (!window.__TEAMBLENDER_POSTHOG_INIT__) {
      posthog.init(POSTHOG_PROJECT_TOKEN, {
        api_host: '/ingest',
        ui_host: POSTHOG_HOST,
        defaults: '2026-01-30',
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
      });
      window.__TEAMBLENDER_POSTHOG_INIT__ = true;
    }

    const onWindowError = (event) => {
      const payload = {
        type: 'window_error',
        message: String(event?.message || 'Unknown error'),
        source: String(event?.filename || ''),
        line: Number(event?.lineno || 0),
        column: Number(event?.colno || 0),
      };

      posthog.capture('frontend_error', {
        ...payload,
      });

      trackGaEvent('frontend_error', payload);
    };

    const onUnhandledRejection = (event) => {
      const reason = event?.reason;
      const payload = {
        type: 'unhandled_rejection',
        message: String(reason?.message || reason || 'Unknown rejection'),
      };

      posthog.capture('frontend_error', {
        ...payload,
      });

      trackGaEvent('frontend_error', payload);
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    capturePerformanceEvent();

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      if (window.__TEAMBLENDER_POSTHOG_INIT__) {
        posthog.reset?.();
        posthog.opt_out_capturing?.();
      }
    };
  }, []);

  useEffect(() => {
    if (!POSTHOG_PROJECT_TOKEN || !window.__TEAMBLENDER_POSTHOG_INIT__ || !hasAnalyticsConsent()) return;

    const query = typeof window !== 'undefined'
      ? String(window.location.search || '').replace(/^\?/, '')
      : '';
    const pathWithQuery = query ? `${pathname}?${query}` : pathname;

    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path: pathWithQuery,
    });
  }, [pathname]);

  return null;
}
