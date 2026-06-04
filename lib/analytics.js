const GA_MEASUREMENT_ID = String(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').trim();
const GTM_ID = String(process.env.NEXT_PUBLIC_GTM_ID || '').trim();

function ensureDataLayer() {
  if (typeof window === 'undefined') return null;

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function trackDataLayerEvent(eventName, params = {}) {
  const dataLayer = ensureDataLayer();
  if (!dataLayer) return;

  const safeEventName = String(eventName || '').trim();
  if (!safeEventName) return;

  window.dataLayer.push({
    event: safeEventName,
    ...params,
  });
}

export function isGaEnabled() {
  return Boolean(GTM_ID || GA_MEASUREMENT_ID);
}

export function getGaMeasurementId() {
  return GA_MEASUREMENT_ID;
}

export function trackGtmPageView(pagePath) {
  if (!GTM_ID && !GA_MEASUREMENT_ID) return;

  trackDataLayerEvent('page_view', {
    page_path: String(pagePath || '/'),
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  });
}

export function trackGtmEvent(eventName, params = {}) {
  if (!GTM_ID && !GA_MEASUREMENT_ID) return;

  trackDataLayerEvent(eventName, params || {});
}

export function trackGaPageView(pagePath) {
  trackGtmPageView(pagePath);
}

export function trackGaEvent(eventName, params = {}) {
  trackGtmEvent(eventName, params);
}
