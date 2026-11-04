import { translate } from './i18n/index.js';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function fetchSessionResults({ sessionId, getApiUrl, headers, signal, locale, fetchImpl = fetch }) {
  const id = encodeURIComponent(sessionId);
  const resources = [
    { path: `/sessions/${id}`, label: 'Session', validate: (value) => isRecord(value) && String(value.id) === String(sessionId) },
    { path: `/challenge-results/sessions/${id}/results`, label: translate(locale, 'sessionResults.results'), validate: (value) => Array.isArray(value?.data) },
    { path: `/challenge-results/sessions/${id}/participation-rate`, label: 'Participation', validate: (value) => isRecord(value?.data) },
    { path: `/challenge-results/sessions/${id}/kpis`, label: translate(locale, 'sessionResults.indicators'), validate: (value) => isRecord(value?.data) },
  ];
  const payloads = await Promise.all(resources.map(async ({ path, label, validate }) => {
    const response = await fetchImpl(getApiUrl(path), { headers, signal, credentials: 'include' });
    if (!response.ok) {
      throw new Error(translate(locale, 'sessionResults.loadFailed', { label, status: response.status }));
    }
    const payload = await response.json();
    if (!validate(payload)) {
      throw new Error(translate(locale, 'sessionResults.invalidResponse', { label }));
    }
    return payload;
  }));
  return {
    session: payloads[0],
    results: payloads[1].data,
    participationRate: payloads[2].data,
    kpis: payloads[3].data,
  };
}
