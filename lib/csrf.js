function readCookie(name) {
  if (typeof document === 'undefined') return '';
  const key = String(name || '').trim();
  if (!key) return '';

  const entries = String(document.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const idx = entry.indexOf('=');
    if (idx <= 0) continue;
    const cookieName = entry.slice(0, idx).trim();
    if (cookieName !== key) continue;

    const rawValue = entry.slice(idx + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return '';
}

export function getCsrfToken() {
  return readCookie('tb_csrf');
}

export function withCsrfHeaders(extraHeaders = {}) {
  const token = getCsrfToken();
  return {
    ...(token ? { 'X-CSRF-Token': token } : {}),
    ...(extraHeaders || {}),
  };
}
