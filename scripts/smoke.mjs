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

  // The backend only accepts an active challenge that belongs to the session,
  // so the smoke test creates its own session instead of reusing an existing one.
  const sessionName = `Smoke manager ${Date.now()}`;
  const createSession = await requestJson(`${BACKEND_URL}/api/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: sessionName, challenge_ids: [Number(selected.id)] }),
  });
  assert(createSession.response.ok, `Create session failed (${createSession.response.status})`);
  const sessionId = Number(createSession.payload?.id);
  assert(Number.isInteger(sessionId), 'Session creation did not return an id');

  return { sessionId, sessionName, challengeId: Number(selected.id), token, user: login.payload.user };
}

async function setActiveChallenge(sessionId, challengeId, token) {
  const setActive = await requestJson(`${BACKEND_URL}/api/sessions/${sessionId}/active-challenge`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ active_challenge_id: challengeId }),
  });
  assert(setActive.response.ok, `Set active challenge failed (${setActive.response.status})`);
}

async function deleteSession(sessionId, token) {
  const { response } = await requestJson(`${BACKEND_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) console.warn(`Smoke session ${sessionId} not deleted (${response.status})`);
}

async function run() {
  const { sessionId, sessionName, challengeId, token, user } = await prepareSessionData();
  try {
    await setActiveChallenge(sessionId, challengeId, token);
    await checkPages(sessionId, sessionName, token, user);
  } finally {
    await deleteSession(sessionId, token);
  }
}

async function checkPages(sessionId, sessionName, token, user) {
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  } catch (err) {
    throw new Error(`Unable to launch browser channel "${BROWSER_CHANNEL}". ${err.message}`);
  }
  const context = await browser.newContext({ locale: 'fr-FR' }); // the checks below use the French UI
  const page = await context.newPage();

  try {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });

    await page.evaluate(({ tokenValue, userValue }) => {
      localStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('currentUser', JSON.stringify(userValue));
    }, { tokenValue: token, userValue: user });

    await page.goto(`${FRONTEND_URL}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=ESPACE MANAGER', { timeout: 15000 });

    await page.goto(`${FRONTEND_URL}/session-builder`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Créer une session")', { timeout: 15000 });

    await page.goto(`${FRONTEND_URL}/session-live/${sessionId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    // The live page shows the session name once the session data has loaded.
    await page.waitForFunction((expectedName) => {
      const bodyText = document.body?.innerText || '';
      const blockingStates = [
        'ERREUR 404',
        'Cette page n existe pas',
        'Une erreur inattendue est survenue',
      ];
      return !blockingStates.some((label) => bodyText.includes(label))
        && bodyText.includes(expectedName);
    }, sessionName, { timeout: 20000 });

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
