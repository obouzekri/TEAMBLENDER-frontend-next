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

export async function getBillingOverview(params = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', String(params.q));
  if (params.provider) search.set('provider', String(params.provider));
  if (params.status) search.set('status', String(params.status));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return request(`/admin-billing/overview${query ? `?${query}` : ''}`);
}

export async function getBillingTimeline(limit = 100) {
  return request(`/admin-billing/timeline?limit=${encodeURIComponent(String(limit))}`);
}

export async function adminChangeUserPlan(userId, body) {
  return request(`/admin-billing/users/${encodeURIComponent(String(userId))}/change-plan`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export async function adminUpdateSubscription(userId, body) {
  return request(`/admin-billing/users/${encodeURIComponent(String(userId))}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify(body || {}),
  });
}

export async function adminCreateManualPayment(userId, body) {
  return request(`/admin-billing/users/${encodeURIComponent(String(userId))}/manual-payment`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export async function adminRefundInvoice(invoiceId, body) {
  return request(`/admin-billing/invoices/${encodeURIComponent(String(invoiceId))}/refund`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export async function adminGenerateInvoicePdf(invoiceId) {
  return request(`/admin-billing/invoices/${encodeURIComponent(String(invoiceId))}/pdf`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
