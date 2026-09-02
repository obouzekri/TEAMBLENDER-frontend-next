"use client";

import { trackGaEvent } from '@/lib/analytics';
import { safeHref } from '@/lib/landing/landingContent';

// Centralizes the GA "cta_click" payload shape for the landing page's CTAs, so
// app/page.js only wires the callbacks instead of owning the tracking logic.
export default function useLandingCtaTracking({
  landingStatic,
  heroCtaPrimary,
  heroCtaSecondary,
  finalCtaSecondary,
}) {
  function handlePrimaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'hero_primary',
      cta_label: String(heroCtaPrimary.cta_label || landingStatic.fallback.heroPrimaryLabel).trim(),
      cta_destination: safeHref(heroCtaPrimary.cta_href, '/signup'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  function handleHeroSecondaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'hero_secondary',
      cta_label: String(heroCtaSecondary.cta_label || landingStatic.fallback.heroSecondaryLabel).trim(),
      cta_destination: safeHref(heroCtaSecondary.cta_href, '/pricing'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  function handleFinalSecondaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'final_secondary',
      cta_label: String(finalCtaSecondary.cta_label || landingStatic.fallback.finalSecondaryLabel).trim(),
      cta_destination: safeHref(finalCtaSecondary.cta_href, '/contact'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  return { handlePrimaryCtaClick, handleHeroSecondaryCtaClick, handleFinalSecondaryCtaClick };
}
