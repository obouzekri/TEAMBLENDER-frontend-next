const GA_MEASUREMENT_ID = String(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').trim();

function ensureGtag() {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return null;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  return window.gtag;
}

export function isGaEnabled() {
  return Boolean(GA_MEASUREMENT_ID);
}

export function getGaMeasurementId() {
  return GA_MEASUREMENT_ID;
}

export function trackGaPageView(pagePath) {
  const gtag = ensureGtag();
  if (!gtag) return;

  gtag('event', 'page_view', {
    page_path: String(pagePath || '/'),
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

export function trackGaEvent(eventName, params = {}) {
  const gtag = ensureGtag();
  if (!gtag) return;

  const safeEventName = String(eventName || '').trim();
  if (!safeEventName) return;

  gtag('event', safeEventName, params || {});
}
