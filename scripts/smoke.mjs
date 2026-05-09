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

async function prepareSessionData() {
  const login = await requestJson(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MANAGER_EMAIL, password: MANAGER_PASSWORD }),
  });

  assert(login.response.ok, `Backend login failed (${login.response.status})`);
  assert(login.payload?.token, 'Backend login did not return token');
  assert(login.payload?.user, 'Backend login did not return user payload');

  const token = login.payload.token;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const sessionsRes = await requestJson(`${BACKEND_URL}/api/sessions`, { headers });
  assert(sessionsRes.response.ok, `Fetch sessions failed (${sessionsRes.response.status})`);

  const sessions = Array.isArray(sessionsRes.payload)
    ? sessionsRes.payload
    : Array.isArray(sessionsRes.payload?.sessions)
      ? sessionsRes.payload.sessions
      : Array.isArray(sessionsRes.payload?.data)
        ? sessionsRes.payload.data
        : [];

  assert(sessions.length > 0, 'No sessions available for smoke test');
  const sessionId = Number(sessions[0].id);
  assert(Number.isInteger(sessionId), 'Invalid session id from backend');

  const challengesRes = await requestJson(`${BACKEND_URL}/api/challenges`, { headers });
  assert(challengesRes.response.ok, `Fetch challenges failed (${challengesRes.response.status})`);

  const challenges = Array.isArray(challengesRes.payload)
    ? challengesRes.payload
    : Array.isArray(challengesRes.payload?.challenges)
      ? challengesRes.payload.challenges
      : Array.isArray(challengesRes.payload?.data)
        ? challengesRes.payload.data
        : [];

  const selected = challenges.find((item) => String(item?.engine_key || '').trim() === CHALLENGE_ENGINE);
  assert(selected?.id, `No challenge found for engine ${CHALLENGE_ENGINE}`);

  const setActive = await requestJson(`${BACKEND_URL}/api/sessions/${sessionId}/active-challenge`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active_challenge_id: Number(selected.id) }),
  });
  assert(setActive.response.ok, `Set active challenge failed (${setActive.response.status})`);

  return { sessionId, token, user: login.payload.user };
}

async function run() {
  const { sessionId, token, user } = await prepareSessionData();

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  } catch (err) {
    throw new Error(`Unable to launch browser channel "${BROWSER_CHANNEL}". ${err.message}`);
  }
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('text=Connexion a TEAMSPARK', { timeout: 15000 });

    await page.evaluate(({ tokenValue, userValue }) => {
      localStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('currentUser', JSON.stringify(userValue));
    }, { tokenValue: token, userValue: user });

    await page.goto(`${FRONTEND_URL}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=ESPACE MANAGER', { timeout: 15000 });

    await page.goto(`${FRONTEND_URL}/session-builder`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Construire votre session', { timeout: 15000 });

    await page.goto(`${FRONTEND_URL}/challenges/${CHALLENGE_ENGINE}?sessionId=${sessionId}`, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('text=Phrase Collaborative', { timeout: 20000 });

    console.log('SMOKE_OK');
    console.log(`sessionId=${sessionId}`);
    console.log(`engine=${CHALLENGE_ENGINE}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error('SMOKE_FAIL');
  console.error(err.message || err);
  process.exit(1);
});
