function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function fetchSessionResults({ sessionId, getApiUrl, headers, signal, isEn, fetchImpl = fetch }) {
  const id = encodeURIComponent(sessionId);
  const resources = [
    { path: `/sessions/${id}`, label: 'Session', validate: (value) => isRecord(value) && String(value.id) === String(sessionId) },
    { path: `/challenge-results/sessions/${id}/results`, label: isEn ? 'Results' : 'Résultats', validate: (value) => Array.isArray(value?.data) },
    { path: `/challenge-results/sessions/${id}/participation-rate`, label: 'Participation', validate: (value) => isRecord(value?.data) },
    { path: `/challenge-results/sessions/${id}/kpis`, label: isEn ? 'Indicators' : 'Indicateurs', validate: (value) => isRecord(value?.data) },
  ];
  const payloads = await Promise.all(resources.map(async ({ path, label, validate }) => {
    const response = await fetchImpl(getApiUrl(path), { headers, signal });
    if (!response.ok) {
      throw new Error(`${label} : ${isEn ? 'unable to load data' : 'chargement impossible'} (HTTP ${response.status}).`);
    }
    const payload = await response.json();
    if (!validate(payload)) {
      throw new Error(`${label} : ${isEn ? 'invalid server response' : 'réponse serveur invalide'}.`);
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
