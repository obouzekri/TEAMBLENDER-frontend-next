const LEGACY_BASE = (process.env.NEXT_PUBLIC_LEGACY_BASE || 'http://localhost:3000').replace(/\/$/, '');

export function toLegacy(pathname) {
  const normalizedPath = String(pathname || '').startsWith('/') ? pathname : `/${pathname}`;
  return `${LEGACY_BASE}${normalizedPath}`;
}

export function getFacilitatorLaunchPathCandidates(sessionId) {
  const encodedSessionId = sessionId ? encodeURIComponent(sessionId) : '';

  return [
    encodedSessionId ? `/src/pages/facilitator-session.html?sessionId=${encodedSessionId}` : '/src/pages/facilitator-session.html',
    encodedSessionId ? `/src/pages/facilitator_launch.html?sessionId=${encodedSessionId}` : '/src/pages/facilitator_launch.html',
    encodedSessionId ? `/facilitator-session.html?sessionId=${encodedSessionId}` : '/facilitator-session.html',
    encodedSessionId ? `/facilitator_launch.html?sessionId=${encodedSessionId}` : '/facilitator_launch.html',
  ];
}

export { LEGACY_BASE };
