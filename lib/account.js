import { getApiUrl } from '@/lib/config';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
}

async function parseJsonSafely(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload.code;
    error.details = payload.details;
    throw error;
  }

  return payload;
}

export function getStoredCurrentUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(user) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('currentUser', JSON.stringify(user || {}));
}

export async function getMe() {
  return request('/users/me', { method: 'GET' });
}

export async function updateMe(body) {
  return request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(body || {}),
  });
}

export async function updateMyPassword(currentPassword, newPassword) {
  return request('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function resetMyPassword(userId) {
  return request(`/users/${encodeURIComponent(userId)}/password`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function listPricingPlans() {
  const response = await fetch(getApiUrl('/pricing-plans'));
  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const error = new Error(payload.error || 'Impossible de charger les formules.');
    error.status = response.status;
    throw error;
  }
  return Array.isArray(payload) ? payload : [];
}

export async function updateMyPlan(pricingPlanId) {
  return request('/users/me/plan', {
    method: 'PATCH',
    body: JSON.stringify({ pricing_plan_id: pricingPlanId }),
  });
}
