import { getApiUrl } from '@/lib/config';

const LEGACY_BASE = (process.env.NEXT_PUBLIC_LEGACY_BASE || 'http://localhost:3000').replace(/\/$/, '');

async function parseAuthResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text };
  }
}

export async function loginWithFallback(email, password, options = {}) {
  const allowParticipantFallback = Boolean(options.allowParticipantFallback);
  const credentials = { email, password };

  const userRes = await fetch(getApiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const userData = await parseAuthResponse(userRes);

  if (userRes.ok) {
    return { response: userRes, data: userData };
  }

  const shouldTryParticipantFallback = allowParticipantFallback || userRes.status === 401;
  if (!shouldTryParticipantFallback) {
    return { response: userRes, data: userData };
  }

  const participantRes = await fetch(getApiUrl('/auth/login-participant'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const participantData = await parseAuthResponse(participantRes);

  if (participantRes.ok) {
    return { response: participantRes, data: participantData };
  }

  const userHasSpecificAccountIssue = ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_DISABLED'].includes(userData.code);
  const participantHasSpecificAccountIssue = ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_DISABLED', 'PARTICIPANT_NOT_CONFIGURED'].includes(participantData.code);

  if (userHasSpecificAccountIssue && !participantHasSpecificAccountIssue && participantRes.status === 401) {
    return { response: userRes, data: userData };
  }

  return { response: participantRes, data: participantData || userData };
}

export function resolveConnectedUserId(user) {
  if (!user || typeof user !== 'object') return '';
  const candidate = user.id || user.userId || user.user_id || user.participantId || user.participant_id;
  return candidate ? String(candidate).trim() : '';
}

export function getRedirectPath(role, sessionId, userId) {
  const params = new URLSearchParams();
  if (sessionId) params.set('sessionId', sessionId);
  if (userId) params.set('userId', userId);
  const suffix = params.toString() ? `?${params.toString()}` : '';

  // Admin and managers go to the Next.js home dashboard
  if (role === 'admin' || role === 'manager') return `/home${suffix}`;
  // Participants still go to legacy until participant flow is migrated
  if (role === 'participant') return `${LEGACY_BASE}/src/pages/participant-dashboard.html${suffix}`;
  // Fallback: Next.js home
  return `/home${suffix}`;
}

export async function registerUser(payload) {
  const res = await fetch(getApiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  return { res, data, text };
}
