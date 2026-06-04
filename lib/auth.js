import { getApiUrl } from '@/lib/config';

function decodeBase64UrlJson(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const padLength = (4 - (raw.length % 4)) % 4;
    const normalized = `${raw}${'='.repeat(padLength)}`.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

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
    return { response: userRes, data: userData, authScope: 'user' };
  }

  // Try participant login only for invalid-credentials user responses.
  // This avoids noisy extra 401 calls for known account states (pending/rejected/disabled).
  const shouldTryParticipantFallback = allowParticipantFallback && userRes.status === 401;
  if (!shouldTryParticipantFallback) {
    return { response: userRes, data: userData, authScope: 'user' };
  }

  const participantRes = await fetch(getApiUrl('/auth/login-participant'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const participantData = await parseAuthResponse(participantRes);

  if (participantRes.ok) {
    return { response: participantRes, data: participantData, authScope: 'participant' };
  }

  const userHasSpecificAccountIssue = ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_DISABLED'].includes(userData.code);
  const participantHasSpecificAccountIssue = ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_DISABLED', 'PARTICIPANT_NOT_CONFIGURED'].includes(participantData.code);

  if (userHasSpecificAccountIssue && !participantHasSpecificAccountIssue && participantRes.status === 401) {
    return { response: userRes, data: userData, authScope: 'user' };
  }

  return { response: participantRes, data: participantData || userData, authScope: 'participant' };
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

export function getOAuthStartUrl(provider, redirectPath = '/login') {
  const safeProvider = String(provider || '').trim().toLowerCase();
  if (!safeProvider) return '';

  const redirectUri = typeof window !== 'undefined'
    ? new URL(String(redirectPath || '/login'), window.location.origin).toString()
    : '';

  const base = getApiUrl(`/auth/${safeProvider}`);
  const search = new URLSearchParams();
  if (redirectUri) search.set('redirect_uri', redirectUri);

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export function readOAuthCallbackFromLocation() {
  if (typeof window === 'undefined') {
    return { hasOAuthPayload: false, token: '', user: null, error: '', errorDescription: '', provider: '' };
  }

  const params = new URLSearchParams(window.location.search);
  const oauth = String(params.get('oauth') || '').trim();
  const token = String(params.get('token') || '').trim();
  const provider = String(params.get('provider') || '').trim();
  const error = String(params.get('error') || '').trim();
  const errorDescription = String(params.get('error_description') || '').trim();
  const encodedUser = String(params.get('user') || '').trim();
  const user = decodeBase64UrlJson(encodedUser);

  return {
    hasOAuthPayload: oauth === 'success' || oauth === 'error' || Boolean(token) || Boolean(error),
    token,
    user,
    error,
    errorDescription,
    provider,
  };
}

export function clearOAuthCallbackParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const next = new URL(window.location.href);
  ['oauth', 'provider', 'token', 'user', 'error', 'error_description'].forEach((key) => {
    next.searchParams.delete(key);
  });
  window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
}
