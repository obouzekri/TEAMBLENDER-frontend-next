import { getApiUrl } from '@/lib/config';
import { buildAuthHeaders } from '@/lib/auth-storage';
import { withCsrfHeaders } from '@/lib/csrf';

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = method === 'GET' || method === 'HEAD'
    ? { ...buildAuthHeaders(options.headers || {}) }
    : withCsrfHeaders({
        'Content-Type': 'application/json',
        ...buildAuthHeaders(options.headers || {}),
      });

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Réponse invalide du serveur');
  }

  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }

  return payload;
}

export function getLinkedInDrafts() {
  return request('/admin-linkedin/drafts');
}

export function createLinkedInDraft(draft) {
  return request('/admin-linkedin/drafts', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
}

export function updateLinkedInDraft(id, draft) {
  return request(`/admin-linkedin/drafts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(draft),
  });
}

export function deleteLinkedInDraft(id) {
  return request(`/admin-linkedin/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
