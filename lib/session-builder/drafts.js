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

  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.selectedChallenges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistDraftToStorage(sessionId, selectedChallenges) {
  if (typeof window === 'undefined') return null;
  const storageKey = getDraftStorageKey(sessionId);
  if (!storageKey) return null;

  const nowIso = new Date().toISOString();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      sessionId: String(sessionId),
      selectedChallenges,
      updatedAt: nowIso,
    })
  );

  // Kept for compatibility with existing manager flow and live page reads.
  sessionStorage.setItem(SELECTED_CHALLENGES_STORAGE_KEY, JSON.stringify(selectedChallenges));
  localStorage.setItem(SELECTED_CHALLENGES_STORAGE_KEY, JSON.stringify(selectedChallenges));
  sessionStorage.setItem(SESSION_ID_STORAGE_KEY, String(sessionId));

  return nowIso;
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
