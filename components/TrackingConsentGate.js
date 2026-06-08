'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import CookieConsentBanner from './CookieConsentBanner';
import GoogleAnalyticsProvider from './GoogleAnalyticsProvider';
import PostHogProvider from './PostHogProvider';
import {
  getStoredConsentState,
  subscribeConsentChanges,
} from '@/lib/consent';
import { loadGtmContainer, unloadGtmContainer, hasTrackingStackConfigured } from '@/lib/analytics';

export default function TrackingConsentGate({ children }) {
  // Initialize as null (matches SSR output) — useEffect syncs the real value after mount.
  const [consentState, setConsentState] = useState(null);

  useEffect(() => {
    const syncConsentState = () => setConsentState(getStoredConsentState());
    syncConsentState();

    return subscribeConsentChanges((nextState) => {
      setConsentState(nextState);
    });
  }, []);

  useEffect(() => {
    const isGranted = consentState?.decision === 'granted';
    if (isGranted) {
      loadGtmContainer();
      return;
    }

    unloadGtmContainer();
  }, [consentState]);

  const shouldRenderTracking = consentState?.decision === 'granted';
  const shouldRenderBanner = hasTrackingStackConfigured() && !shouldRenderTracking;

  return (
    <>
      {children}
      {shouldRenderBanner ? <CookieConsentBanner consentState={consentState} /> : null}
      {shouldRenderTracking ? (
        <>
          <GoogleAnalyticsProvider />
          <PostHogProvider />
          <Analytics />
        </>
      ) : null}
    </>
  );
}
