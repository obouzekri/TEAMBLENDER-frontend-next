'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { usePathname } from 'next/navigation';
import { stripLocaleFromPath } from '@/lib/i18n/routing';
import CookieConsentBanner from './CookieConsentBanner';
import GoogleAnalyticsProvider from './GoogleAnalyticsProvider';
import PostHogProvider from './PostHogProvider';
import {
  getStoredConsentState,
  subscribeConsentChanges,
  subscribeConsentReopen,
} from '@/lib/consent';
import { loadGtmContainer, unloadGtmContainer, hasTrackingStackConfigured } from '@/lib/analytics';

export default function TrackingConsentGate({ children }) {
  const isRecoveryPage = stripLocaleFromPath(usePathname() || '/') === '/resume';
  // Initialize as null (matches SSR output) — useEffect syncs the real value after mount.
  const [consentState, setConsentState] = useState(null);
  const [isConsentLoaded, setIsConsentLoaded] = useState(false);
  const [isBannerReopened, setIsBannerReopened] = useState(false);

  useEffect(() => {
    const syncConsentState = () => setConsentState(getStoredConsentState());
    syncConsentState();
    setIsConsentLoaded(true);

    return subscribeConsentChanges((nextState) => {
      setConsentState(nextState);
      setIsBannerReopened(false);
    });
  }, []);

  useEffect(() => subscribeConsentReopen(() => setIsBannerReopened(true)), []);

  useEffect(() => {
    const isGranted = consentState?.decision === 'granted' && !isRecoveryPage;
    if (isGranted) {
      loadGtmContainer();
      return;
    }

    unloadGtmContainer();
  }, [consentState, isRecoveryPage]);

  const shouldRenderTracking = consentState?.decision === 'granted' && !isRecoveryPage;
  const shouldRenderBanner =
    isConsentLoaded && (!consentState || isBannerReopened) && hasTrackingStackConfigured();

  return (
    <>
      {children}
      {shouldRenderBanner ? (
        <CookieConsentBanner
          consentState={consentState}
          isReopened={isBannerReopened}
          onDismiss={() => setIsBannerReopened(false)}
        />
      ) : null}
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
