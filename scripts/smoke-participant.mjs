import { chromium } from 'playwright';

const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const BACKEND_URL = process.env.SMOKE_BACKEND_URL || 'http://localhost:3000';
const MANAGER_EMAIL = process.env.SMOKE_MANAGER_EMAIL || 'admin@admin.com';
const MANAGER_PASSWORD = process.env.SMOKE_MANAGER_PASSWORD || 'Admin1234!';
const CHALLENGE_ENGINE = process.env.SMOKE_CHALLENGE_ENGINE || 'phrase_collaborative_v1';
const BROWSER_CHANNEL = process.env.SMOKE_BROWSER_CHANNEL || 'chrome';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  return { response, payload, text };
}

function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.challenges)) return payload.challenges;
  return [];
}

async function prepareSession() {
  const login = await requestJson(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MANAGER_EMAIL, password: MANAGER_PASSWORD }),
  });

  assert(login.response.ok, `Backend manager login failed (${login.response.status})`);
  assert(login.payload?.token, 'Backend manager login did not return token');

  const managerToken = login.payload.token;
  const headers = {
    Authorization: `Bearer ${managerToken}`,
    'Content-Type': 'application/json',
  };

  const challengesRes = await requestJson(`${BACKEND_URL}/api/challenges`, { headers });
  assert(challengesRes.response.ok, `Fetch challenges failed (${challengesRes.response.status})`);
  const challenges = parseList(challengesRes.payload);
  const selected = challenges.find((item) => String(item?.engine_key || '').trim() === CHALLENGE_ENGINE);
  assert(selected?.id, `No challenge found for engine ${CHALLENGE_ENGINE}`);

  // The backend only accepts an active challenge that belongs to the session,
  // so the smoke test creates its own session instead of reusing an existing one.
  const createSession = await requestJson(`${BACKEND_URL}/api/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: `Smoke participant ${Date.now()}`, challenge_ids: [Number(selected.id)] }),
  });
  assert(createSession.response.ok, `Create session failed (${createSession.response.status})`);
  const sessionId = Number(createSession.payload?.id);
  assert(Number.isInteger(sessionId), 'Session creation did not return an id');

  return {
    sessionId,
    sessionCode: String(createSession.payload?.code || '').trim(),
    challengeId: Number(selected.id),
    managerToken,
  };
}

async function activateChallenge({ sessionId, challengeId, managerToken }) {
  const setActive = await requestJson(`${BACKEND_URL}/api/sessions/${sessionId}/active-challenge`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${managerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ active_challenge_id: challengeId }),
  });
  assert(setActive.response.ok, `Set active challenge failed (${setActive.response.status})`);
}

async function testAssignedSessionsRefresh() {
  const browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  const context = await browser.newContext({ locale: 'fr-FR' }); // the checks below use the French UI
  const page = await context.newPage();
  let status = 'preparee';
  let failRefresh = false;
  let requests = 0;

  try {
    await context.addInitScript(() => {
      sessionStorage.setItem('currentUser', JSON.stringify({
        id: 123,
        role: 'participant',
        name: 'Refresh Participant',
        email: 'refresh@example.test',
      }));
    });
    await context.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('/participants/me/sessions')) {
        requests += 1;
        await route.fulfill({
          status: failRefresh ? 503 : 200,
          json: failRefresh ? { error: 'Unavailable' } : [{ id: 42, name: 'Refresh session', status }],
        });
        return;
      }
      await route.fulfill({ json: {} });
    });
    await page.clock.install();
    await page.goto(`${FRONTEND_URL}/participant`, { waitUntil: 'domcontentloaded' });
    const waiting = page.locator('.participant-session-card__waiting-status');
    const join = page.locator('.participant-session-card__cta');
    const loading = page.getByText(/Loading your sessions|Chargement de vos sessions/);
    await waiting.waitFor();
    assert(await join.count() === 0, 'Prepared session must not be joinable');
    const initialRequests = requests;

    status = 'en_cours';
    await page.clock.fastForward(5000);
    await join.waitFor();
    assert(requests > initialRequests, 'Assigned sessions must refresh automatically');
    assert(await waiting.count() === 0, 'Waiting label must disappear after launch');
    assert(await loading.count() === 0, 'Background refresh must not show the loading skeleton');
    assert(await join.isEnabled(), 'Launched session must be joinable without reloading');

    failRefresh = true;
    const failedResponse = page.waitForResponse((response) =>
      response.url().includes('/participants/me/sessions') && response.status() === 503
    );
    await page.clock.fastForward(5000);
    await failedResponse;
    assert(await join.isVisible(), 'Failed refresh must preserve the previous session state');

    failRefresh = false;
    status = 'preparee';
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await waiting.waitFor();
    assert(await join.count() === 0, 'Focus refresh must update session availability');

    status = 'en_cours';
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await join.waitFor();
    console.log('SMOKE_PARTICIPANT_ASSIGNED_SESSIONS_REFRESH_OK');
  } finally {
    await context.close();
    await browser.close();
  }
}

async function run() {
  if (process.argv.includes('--assigned-sessions-refresh')) {
    await testAssignedSessionsRefresh();
    return;
  }

  const session = await prepareSession();
  const { sessionId, managerToken } = session;
  try {
    await activateChallenge(session);
    await checkParticipantPage(session);
  } finally {
    const { response } = await requestJson(`${BACKEND_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    if (!response.ok) console.warn(`Smoke session ${sessionId} not deleted (${response.status})`);
  }
}

async function checkParticipantPage({ sessionId, sessionCode }) {
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  } catch (err) {
    throw new Error(`Unable to launch browser channel "${BROWSER_CHANNEL}". ${err.message}`);
  }

  const context = await browser.newContext({ locale: 'fr-FR' }); // the checks below use the French UI
  const page = await context.newPage();

  try {
    // Participants join with the session code; a manager can no longer set their password.
    // Joining through the browser context keeps the auth cookie that the participant page relies on.
    assert(sessionCode, 'Session creation did not return a join code');
    const join = await context.request.post(`${BACKEND_URL}/api/auth/join-participant`, {
      data: { sessionCode, first_name: 'Smoke', last_name: 'Participant' },
    });
    assert(join.ok(), `Participant join failed (${join.status()})`);
    const joined = await join.json();
    assert(joined?.token, 'Participant join did not return token');
    assert(joined?.user, 'Participant join did not return user');

    await page.goto(`${FRONTEND_URL}/participant?sessionId=${sessionId}`, { waitUntil: 'domcontentloaded' });

    await page.evaluate(({ tokenValue, userValue }) => {
      localStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('currentUser', JSON.stringify(userValue));
    }, { tokenValue: joined.token, userValue: joined.user });

    await page.goto(`${FRONTEND_URL}/participant?sessionId=${sessionId}`, { waitUntil: 'domcontentloaded' });

    // The participant page either links to the active challenge or opens it directly.
    await page.waitForFunction((engine) => {
      const target = `/challenges/${engine}`;
      if (window.location.pathname.includes(target)) return true;
      return [...document.querySelectorAll('a[href]')].some((link) => link.getAttribute('href').includes(target));
    }, CHALLENGE_ENGINE, { timeout: 30000 });

    console.log('SMOKE_PARTICIPANT_OK');
    console.log(`sessionId=${sessionId}`);
    console.log(`engine=${CHALLENGE_ENGINE}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error('SMOKE_PARTICIPANT_FAIL');
  console.error(err.message || err);
  process.exit(1);
});
