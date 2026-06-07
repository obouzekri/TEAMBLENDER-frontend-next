'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import CookieConsentBanner from './CookieConsentBanner';
import GoogleAnalyticsProvider from './GoogleAnalyticsProvider';
import PostHogProvider from './PostHogProvider';
import {
  getStoredConsentState,
  hasAnalyticsConsent,
  subscribeConsentChanges,
} from '@/lib/consent';
import { loadGtmContainer, unloadGtmContainer, hasTrackingStackConfigured } from '@/lib/analytics';

export default function TrackingConsentGate({ children }) {
  const [consentState, setConsentState] = useState(() => getStoredConsentState());

  useEffect(() => {
    const syncConsentState = () => setConsentState(getStoredConsentState());
    syncConsentState();

    return subscribeConsentChanges((nextState) => {
      setConsentState(nextState);
    });
  }, []);

  useEffect(() => {
    if (hasAnalyticsConsent()) {
      loadGtmContainer();
      return;
    }

    unloadGtmContainer();
  }, [consentState]);

  const shouldRenderTracking = hasAnalyticsConsent();
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
