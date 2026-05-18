import { getApiUrl } from '@/lib/config';

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

  // Try participant login only for invalid-credentials user responses.
  // This avoids noisy extra 401 calls for known account states (pending/rejected/disabled).
  const shouldTryParticipantFallback = allowParticipantFallback && userRes.status === 401;
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

  // Admins land directly on the admin console
  if (role === 'admin') return `/admin${suffix}`;
  // Managers keep using the home dashboard
  if (role === 'manager') return `/home${suffix}`;
  // Participants use the Next.js participant landing page
  if (role === 'participant') return `/participant${suffix}`;
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

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('jwt');
  sessionStorage.removeItem('jwt');
  sessionStorage.removeItem('currentUser');
  sessionStorage.removeItem('targetSessionId');
  sessionStorage.removeItem('selectedChallenges');
  sessionStorage.removeItem('sessionId');
}

export async function verifyEmail({ token, userType = 'user' }) {
  const res = await fetch(getApiUrl('/auth/verify-email'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, userType }),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { res, data };
}

export async function resendVerification({ token, email, userType }) {
  const body = {};
  if (token) body.token = token;
  if (email) body.email = email;
  if (userType) body.userType = userType;

  const res = await fetch(getApiUrl('/auth/resend-verification'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { res, data };
}

export async function forgotPassword({ email, userType = 'user' }) {
  const res = await fetch(getApiUrl('/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userType }),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { res, data };
}

export async function resetPassword({ token, newPassword, userType = 'user' }) {
  const res = await fetch(getApiUrl('/auth/reset-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, userType }),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return { res, data };
}
