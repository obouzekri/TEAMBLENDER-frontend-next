// Local draft of the challenge selection, kept in localStorage per session.
export const SESSION_ID_STORAGE_KEY = 'sessionId';
export const SELECTED_CHALLENGES_STORAGE_KEY = 'selectedChallenges';
const DRAFT_STORAGE_PREFIX = 'sessionBuilderDraft:';
export const CREATION_DRAFT_STORAGE_KEY = 'sessionBuilderCreationDraft:v1';

function getDraftStorageKey(sessionId) {
  const normalizedId = String(sessionId || '').trim();
  if (!normalizedId) return null;
  return `${DRAFT_STORAGE_PREFIX}${normalizedId}`;
}

export function readDraftFromStorage(sessionId) {
  if (typeof window === 'undefined') return null;
  const storageKey = getDraftStorageKey(sessionId);
  if (!storageKey) return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.selectedChallenges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Catalog data the API attaches to a challenge's engine_config (e.g. the whole crossword grid
// library, ~50 KB). It is reference data for the config modal, never part of a session's config.
const CATALOG_ONLY_CONFIG_KEYS = ['templatesByLocale', 'templates'];

export function stripCatalogOnlyConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return config;
  if (!CATALOG_ONLY_CONFIG_KEYS.some((key) => key in config)) return config;
  const next = { ...config };
  CATALOG_ONLY_CONFIG_KEYS.forEach((key) => delete next[key]);
  return next;
}

// The draft only needs what restoreSelectedChallenges reads back: the challenge identity and its
// config. Storing whole catalog entries filled the storage quota and crashed the builder.
export function toDraftChallenge(challenge) {
  if (!challenge || typeof challenge !== 'object') return null;
  const draft = {};
  if (challenge.id !== undefined && challenge.id !== null) draft.id = challenge.id;
  if (challenge.engine_key) draft.engine_key = challenge.engine_key;
  if (challenge.config && typeof challenge.config === 'object') {
    draft.config = stripCatalogOnlyConfig(challenge.config);
  }
  return draft;
}

function isQuotaError(error) {
  return (
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

function removeOtherDrafts(keepKey) {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(DRAFT_STORAGE_PREFIX) && key !== keepKey) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
  return keys.length;
}

// Never let a full or blocked storage break the page: the draft is a convenience, the session
// itself is saved on the server.
function safeSetDraft(storageKey, value) {
  try {
    localStorage.setItem(storageKey, value);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) return false;
    try {
      if (!removeOtherDrafts(storageKey)) return false;
      localStorage.setItem(storageKey, value);
      return true;
    } catch {
      return false;
    }
  }
}

export function persistDraftToStorage(sessionId, selectedChallenges) {
  if (typeof window === 'undefined') return null;
  const storageKey = getDraftStorageKey(sessionId);
  if (!storageKey) return null;

  const nowIso = new Date().toISOString();
  const challenges = (Array.isArray(selectedChallenges) ? selectedChallenges : [])
    .map(toDraftChallenge)
    .filter(Boolean);

  try {
    // Legacy full copies of the selection: nothing reads them any more and they used most of the quota.
    localStorage.removeItem(SELECTED_CHALLENGES_STORAGE_KEY);
    sessionStorage.removeItem(SELECTED_CHALLENGES_STORAGE_KEY);
    sessionStorage.setItem(SESSION_ID_STORAGE_KEY, String(sessionId));
  } catch {
    // Storage unavailable (private mode, blocked site data): the draft below fails the same way.
  }

  const saved = safeSetDraft(
    storageKey,
    JSON.stringify({ sessionId: String(sessionId), selectedChallenges: challenges, updatedAt: nowIso })
  );
  return saved ? nowIso : null;
}

function toEpochMs(value) {
  const parsed = Date.parse(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSessionFreshnessMs(session) {
  const base = toEpochMs(session?.updatedAt);
  const challenges = Array.isArray(session?.challenges) ? session.challenges : [];

  return challenges.reduce((max, challenge) => {
    const challengeUpdated = toEpochMs(challenge?.updatedAt);
    const junctionUpdated = toEpochMs(challenge?.SessionChallenge?.updatedAt);
    return Math.max(max, challengeUpdated, junctionUpdated);
  }, base);
}

export function shouldApplyLocalDraftOverSession(savedDraft, session) {
  const draftUpdatedMs = toEpochMs(savedDraft?.updatedAt);
  if (draftUpdatedMs <= 0) {
    return false;
  }

  const sessionChallenges = Array.isArray(session?.challenges) ? session.challenges : [];
  if (sessionChallenges.length > 0) {
    // Server-side session data is the source of truth once challenges exist.
    // This avoids stale local drafts from overriding persisted configs (e.g. CoPuzzle images).
    return false;
  }

  const sessionFreshnessMs = getSessionFreshnessMs(session);
  return draftUpdatedMs > sessionFreshnessMs;
}
