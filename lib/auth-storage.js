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
  const localToken = readString(storageApi.local, JWT_STORAGE_KEY);
  if (localToken) return localToken;
  return readString(storageApi.session, JWT_STORAGE_KEY);
}

export function setStoredAuthToken(token, storageApi = getStorageApi()) {
  const normalized = String(token || '').trim();
  if (!normalized) return;

  if (storageApi.local && typeof storageApi.local.setItem === 'function') {
    storageApi.local.setItem(JWT_STORAGE_KEY, normalized);
  }
  if (storageApi.session && typeof storageApi.session.setItem === 'function') {
    storageApi.session.setItem(JWT_STORAGE_KEY, normalized);
  }
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
  const raw = readString(storageApi.session, CURRENT_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(user, storageApi = getStorageApi()) {
  if (!storageApi.session || typeof storageApi.session.setItem !== 'function') return;
  storageApi.session.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user || {}));
}

export function clearStoredCurrentUser(storageApi = getStorageApi()) {
  if (storageApi.session && typeof storageApi.session.removeItem === 'function') {
    storageApi.session.removeItem(CURRENT_USER_STORAGE_KEY);
  }
}

export function buildAuthHeaders(token, extraHeaders = {}) {
  const normalizedToken = String(token || '').trim();
  return {
    ...(normalizedToken ? { Authorization: `Bearer ${normalizedToken}` } : {}),
    ...extraHeaders,
  };
}

export {
  JWT_STORAGE_KEY,
  CURRENT_USER_STORAGE_KEY,
};
