import { hasAnalyticsConsent } from '@/lib/consent';

const GTM_ID = String(process.env.NEXT_PUBLIC_GTM_ID || '').trim();
const POSTHOG_TOKEN = String(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
).trim();

function ensureDataLayer() {
  if (typeof window === 'undefined') return null;

  if (!hasAnalyticsConsent()) return null;

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
  return Boolean(GTM_ID);
}

export function hasTrackingStackConfigured() {
  return Boolean(GTM_ID || POSTHOG_TOKEN || process.env.NODE_ENV === 'production');
}

export function loadGtmContainer() {
  if (!GTM_ID || typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!hasAnalyticsConsent()) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

  if (document.getElementById('teamblender-gtm-bootstrap')) return true;

  const bootstrapScript = document.createElement('script');
  bootstrapScript.id = 'teamblender-gtm-bootstrap';
  bootstrapScript.text = `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
  `;
  document.head.appendChild(bootstrapScript);

  const loaderScript = document.createElement('script');
  loaderScript.id = 'teamblender-gtm-loader';
  loaderScript.async = true;
  loaderScript.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(loaderScript);

  return true;
}

export function unloadGtmContainer() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.getElementById('teamblender-gtm-bootstrap')?.remove();
  document.getElementById('teamblender-gtm-loader')?.remove();
  document.getElementById('teamblender-gtm-noscript')?.remove();

  window.dataLayer = [];
  try {
    delete window.gtag;
  } catch {
    window.gtag = undefined;
  }
}

export function getGaMeasurementId() {
  // Deprecated: GA4 direct measurement is disabled; GTM is the only source.
  return '';
}

export function trackGtmPageView(pagePath) {
  if (!GTM_ID || !hasAnalyticsConsent()) return;

  trackDataLayerEvent('page_view', {
    page_path: String(pagePath || '/'),
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  });
}

export function trackGtmEvent(eventName, params = {}) {
  if (!GTM_ID || !hasAnalyticsConsent()) return;

  trackDataLayerEvent(eventName, params || {});
}

export function trackGaPageView(pagePath) {
  trackGtmPageView(pagePath);
}

export function trackGaEvent(eventName, params = {}) {
  trackGtmEvent(eventName, params);
}

function sanitizeString(value) {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function sanitizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildProductPayload(scope, action, context = {}) {
  const safeScope = sanitizeString(scope);
  const safeAction = sanitizeString(action);
  if (!safeScope || !safeAction) {
    return null;
  }

  const sessionId = sanitizeString(context.sessionId);
  const userId = sanitizeString(context.userId);
  const challengeId = sanitizeString(context.challengeId);
  const challengeEngineKey = sanitizeString(context.challengeEngineKey);

  return {
    scope: safeScope,
    action: safeAction,
    session_id: sessionId,
    user_id: userId,
    challenge_id: challengeId,
    challenge_engine_key: challengeEngineKey,
    challenge_count: sanitizeNumber(context.challengeCount),
    provider: sanitizeString(context.provider),
    auth_method: sanitizeString(context.authMethod),
    surface: sanitizeString(context.surface),
    source: 'frontend_next',
    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  };
}

export function trackProductEvent(scope, action, context = {}) {
  const payload = buildProductPayload(scope, action, context);
  if (!payload) return;

  trackGaEvent('product_event', payload);
}

export function trackProductSessionEvent(action, context = {}) {
  trackProductEvent('session', action, context);
}

export function trackProductUserEvent(action, context = {}) {
  trackProductEvent('user', action, context);
}

export function trackProductChallengeEvent(action, context = {}) {
  trackProductEvent('challenge', action, context);
}
