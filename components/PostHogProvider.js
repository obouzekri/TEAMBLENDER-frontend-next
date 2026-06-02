'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const POSTHOG_KEY = String(process.env.NEXT_PUBLIC_POSTHOG_KEY || '').trim();
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
  };

  if (document.readyState === 'complete') {
    send();
    return;
  }

  window.addEventListener('load', send, { once: true });
}

export default function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === 'undefined') return;

    if (!window.__TEAMBLENDER_POSTHOG_INIT__) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
      });
      window.__TEAMBLENDER_POSTHOG_INIT__ = true;
    }

    const onWindowError = (event) => {
      posthog.capture('frontend_error', {
        type: 'window_error',
        message: String(event?.message || 'Unknown error'),
        source: String(event?.filename || ''),
        line: Number(event?.lineno || 0),
        column: Number(event?.colno || 0),
      });
    };

    const onUnhandledRejection = (event) => {
      const reason = event?.reason;
      posthog.capture('frontend_error', {
        type: 'unhandled_rejection',
        message: String(reason?.message || reason || 'Unknown rejection'),
      });
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    capturePerformanceEvent();

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY || !window.__TEAMBLENDER_POSTHOG_INIT__) return;

    const query = searchParams?.toString();
    const pathWithQuery = query ? `${pathname}?${query}` : pathname;

    posthog.capture('$pageview', {
      $current_url: window.location.href,
      path: pathWithQuery,
    });
  }, [pathname, searchParams]);

  return null;
}
