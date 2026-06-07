const CONSENT_POLICY_VERSION = '2026-06-07';
const CONSENT_STATE_KEY = 'teamblender-consent-state';
const CONSENT_HISTORY_KEY = 'teamblender-consent-history';
const CONSENT_EVENT_NAME = 'teamblender-consent-changed';

function getWindow() {
  if (typeof window === 'undefined') return null;
  return window;
}

function readJson(storageKey, fallbackValue) {
  const activeWindow = getWindow();
  if (!activeWindow) return fallbackValue;

  try {
    const raw = activeWindow.localStorage.getItem(storageKey);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function writeJson(storageKey, value) {
  const activeWindow = getWindow();
  if (!activeWindow) return;

  try {
    activeWindow.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage errors; consent handling should not break the app shell.
  }
}

function dispatchConsentChange() {
  const activeWindow = getWindow();
  if (!activeWindow) return;

  activeWindow.dispatchEvent(new Event(CONSENT_EVENT_NAME));
}

export function getConsentHistory() {
  const history = readJson(CONSENT_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

export function getStoredConsentState() {
  const state = readJson(CONSENT_STATE_KEY, null);
  if (!state || typeof state !== 'object') return null;
  if (String(state.policyVersion || '') !== CONSENT_POLICY_VERSION) return null;
  if (state.decision !== 'granted' && state.decision !== 'denied') return null;

  return {
    decision: state.decision,
    policyVersion: CONSENT_POLICY_VERSION,
    updatedAt: String(state.updatedAt || ''),
  };
}

export function hasAnalyticsConsent() {
  return getStoredConsentState()?.decision === 'granted';
}

export function recordConsentDecision(decision, source = 'banner') {
  const normalizedDecision = decision === 'granted' ? 'granted' : 'denied';
  const previousState = getStoredConsentState();

  if (previousState?.decision === normalizedDecision) {
    return previousState;
  }

  const timestamp = new Date().toISOString();
  const nextState = {
    decision: normalizedDecision,
    policyVersion: CONSENT_POLICY_VERSION,
    updatedAt: timestamp,
  };

  const nextHistory = [
    {
      decision: normalizedDecision,
      previousDecision: previousState?.decision || null,
      policyVersion: CONSENT_POLICY_VERSION,
      timestamp,
      source,
    },
    ...getConsentHistory(),
  ].slice(0, 25);

  writeJson(CONSENT_STATE_KEY, nextState);
  writeJson(CONSENT_HISTORY_KEY, nextHistory);
  dispatchConsentChange();

  return nextState;
}

export function clearConsentDecision(source = 'banner') {
  const previousState = getStoredConsentState();
  const timestamp = new Date().toISOString();
  const nextHistory = [
    {
      decision: 'denied',
      previousDecision: previousState?.decision || null,
      policyVersion: CONSENT_POLICY_VERSION,
      timestamp,
      source,
      clearedState: true,
    },
    ...getConsentHistory(),
  ].slice(0, 25);

  writeJson(CONSENT_STATE_KEY, null);
  writeJson(CONSENT_HISTORY_KEY, nextHistory);
  dispatchConsentChange();
}

export function subscribeConsentChanges(callback) {
  const activeWindow = getWindow();
  if (!activeWindow || typeof callback !== 'function') {
    return () => {};
  }

  const handleConsentEvent = () => callback(getStoredConsentState());
  const handleStorageEvent = (event) => {
    if (!event || event.storageArea !== activeWindow.localStorage) return;
    if (event.key !== CONSENT_STATE_KEY && event.key !== CONSENT_HISTORY_KEY) return;
    callback(getStoredConsentState());
  };

  activeWindow.addEventListener(CONSENT_EVENT_NAME, handleConsentEvent);
  activeWindow.addEventListener('storage', handleStorageEvent);

  return () => {
    activeWindow.removeEventListener(CONSENT_EVENT_NAME, handleConsentEvent);
    activeWindow.removeEventListener('storage', handleStorageEvent);
  };
}

export function getConsentPolicyVersion() {
  return CONSENT_POLICY_VERSION;
}
