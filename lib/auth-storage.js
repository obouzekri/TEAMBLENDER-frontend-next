import { ensureUserAvatarProfile } from './avatar-profile.js';

const JWT_STORAGE_KEY = 'jwt';
const CURRENT_USER_STORAGE_KEY = 'currentUser';

function getStorageApi() {
  if (typeof window === 'undefined') {
    return { local: null, session: null };
  }

  return {
    local: window.localStorage || null,
    session: window.sessionStorage || null,
  };
}

function readString(storage, key) {
  if (!storage || typeof storage.getItem !== 'function') return '';
  return String(storage.getItem(key) || '').trim();
}

export function getStoredAuthToken(storageApi = getStorageApi()) {
  clearStoredAuthToken(storageApi);
  return '';
}

export function setStoredAuthToken(token, storageApi = getStorageApi(), options = {}) {
  void token;
  void options;
  clearStoredAuthToken(storageApi);
}

export function clearStoredAuthToken(storageApi = getStorageApi()) {
  if (storageApi.local && typeof storageApi.local.removeItem === 'function') {
    storageApi.local.removeItem(JWT_STORAGE_KEY);
  }
  if (storageApi.session && typeof storageApi.session.removeItem === 'function') {
    storageApi.session.removeItem(JWT_STORAGE_KEY);
  }
}

export function getStoredCurrentUser(storageApi = getStorageApi()) {
  clearStoredAuthToken(storageApi);
  const raw = readString(storageApi.session, CURRENT_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return ensureUserAvatarProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(user, storageApi = getStorageApi()) {
  if (!storageApi.session || typeof storageApi.session.setItem !== 'function') return;
  const normalizedUser = ensureUserAvatarProfile(user || {});
  storageApi.session.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(normalizedUser));
}

export function clearStoredCurrentUser(storageApi = getStorageApi()) {
  if (storageApi.session && typeof storageApi.session.removeItem === 'function') {
    storageApi.session.removeItem(CURRENT_USER_STORAGE_KEY);
  }
}

export function buildAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'authorization') delete headers[key];
  }

  return headers;
}

export {
  JWT_STORAGE_KEY,
  CURRENT_USER_STORAGE_KEY,
};
