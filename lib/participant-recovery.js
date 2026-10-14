import { getApiUrl } from './config.js';
import { withCsrfHeaders } from './csrf.js';
import { getStoredAuthToken } from './auth-storage.js';

const STORAGE_KEY = 'tb_participant_recoveries';
const LINK_KEY = 'tb_participant_recovery_link:';

function storage() {
  return { local: window.localStorage, session: window.sessionStorage };
}

function readJson(store, key, fallback) {
  const raw = store.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export function readRecoveries(api = storage(), now = Date.now()) {
  const entries = readJson(api.local, STORAGE_KEY, []);
  if (!Array.isArray(entries)) throw new Error('Les acces de reprise memorises sont invalides.');
  return entries.filter((entry) => entry && /^\d+$/.test(String(entry.sessionId))
    && /^[a-f0-9]{64}$/.test(String(entry.deviceToken || ''))
    && new Date(entry.expiresAt).getTime() > now);
}

export function saveRecovery(data, api = storage()) {
  if (!data.recovery?.deviceToken || !data.sessionId) return;
  const entry = {
    sessionId: String(data.sessionId),
    participantName: data.user?.name || [data.user?.first_name, data.user?.last_name].filter(Boolean).join(' '),
    deviceToken: data.recovery.deviceToken,
    expiresAt: data.recovery.expiresAt,
  };

  if (data.recovery.linkToken) {
    api.session.setItem(`${LINK_KEY}${entry.sessionId}`, JSON.stringify({
      linkToken: data.recovery.linkToken,
      expiresAt: data.recovery.expiresAt,
    }));
  }

  const entries = readRecoveries(api).filter((item) => item.sessionId !== entry.sessionId);
  api.local.setItem(STORAGE_KEY, JSON.stringify([entry, ...entries]));
}

export function removeRecovery(sessionId, api = storage()) {
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) return;
  const entries = readRecoveries(api).filter((entry) => entry.sessionId !== normalizedSessionId);
  api.local.setItem(STORAGE_KEY, JSON.stringify(entries));
  api.session.removeItem(`${LINK_KEY}${normalizedSessionId}`);
}

export function readPersonalLink(sessionId, api = storage()) {
  const normalizedSessionId = String(sessionId || '').trim();
  if (!normalizedSessionId) return null;
  return readJson(api.session, `${LINK_KEY}${normalizedSessionId}`, null);
}

export function buildRecoveryUrl(linkToken, origin, locale = 'fr') {
  if (!/^[a-f0-9]{64}$/.test(String(linkToken || ''))) throw new Error('Lien de reprise invalide.');
  const url = new URL(`/${locale === 'en' ? 'en' : 'fr'}/resume`, origin);
  url.hash = `recovery=${linkToken}`;
  return url.toString();
}

export async function resumeParticipation(token, kind) {
  const res = await fetch(getApiUrl('/auth/resume-participant'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, kind }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data.error || data.message || `Erreur ${res.status}`), {
      code: data.code,
      status: res.status,
    });
  }
  if (!data.token || !data.user?.id || !data.sessionId || !data.recovery?.deviceToken) {
    throw new Error('Reponse de reprise invalide.');
  }
  return data;
}

export async function revokeRememberedParticipation(sessionId) {
  const normalizedSessionId = String(sessionId || '').trim();
  let entry;
  try {
    entry = readRecoveries().find((item) => item.sessionId === normalizedSessionId);
  } catch (error) {
    console.error('participant.recovery_storage_unavailable', { message: error.message });
  }
  const token = getStoredAuthToken();
  const res = await fetch(getApiUrl('/auth/logout'), {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    body: JSON.stringify(entry ? { deviceToken: entry.deviceToken } : {}),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || data.message || `Erreur ${res.status}`);
  }
  try {
    removeRecovery(normalizedSessionId);
  } catch (error) {
    // Server revocation succeeded; a stale browser entry can no longer restore access.
    console.error('participant.recovery_storage_cleanup_failed', { message: error.message });
  }
}
