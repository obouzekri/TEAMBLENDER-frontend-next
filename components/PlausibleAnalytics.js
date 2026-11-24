import Script from 'next/script';
import { SUPPORTED_LOCALES } from '@/lib/i18n/routing';
import { isPreviewEnvironment, PRIVATE_SEO_PATHS } from '@/lib/seo';

// Mesure d'audience sans cookie (Plausible) : pas de consentement requis, contrairement à
// PostHog/GTM. Activée seulement si NEXT_PUBLIC_PLAUSIBLE_DOMAIN est défini, hors préproduction.
// Script et envoi passent par /pa (rewrites de next.config.mjs) pour éviter les bloqueurs.
// Les espaces privés (manager, participant, live…) sont exclus : on ne mesure que le site public.
const PLAUSIBLE_DOMAIN = String(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || '').trim();

const EXCLUDED_PATHS = PRIVATE_SEO_PATHS.flatMap((path) => [
  `${path}**`,
  ...SUPPORTED_LOCALES.map((locale) => `/${locale}${path}**`),
]).join(', ');

export default function PlausibleAnalytics() {
  if (!PLAUSIBLE_DOMAIN || isPreviewEnvironment()) return null;

  return (
    <Script
      id="plausible-analytics"
      src="/pa/script.js"
      data-domain={PLAUSIBLE_DOMAIN}
      data-api="/pa/api/event"
      data-exclude={EXCLUDED_PATHS}
      strategy="afterInteractive"
    />
  );
}
