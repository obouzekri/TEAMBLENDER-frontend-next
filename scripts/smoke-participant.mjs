import { chromium } from 'playwright';

const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const BACKEND_URL = process.env.SMOKE_BACKEND_URL || 'http://localhost:3000';
const MANAGER_EMAIL = process.env.SMOKE_MANAGER_EMAIL || 'admin@admin.com';
const MANAGER_PASSWORD = process.env.SMOKE_MANAGER_PASSWORD || 'Admin1234!';
const PARTICIPANT_PASSWORD = process.env.SMOKE_PARTICIPANT_PASSWORD || 'Smoke1234!';
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

async function prepareData() {
  const login = await requestJson(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MANAGER_EMAIL, password: MANAGER_PASSWORD }),
  });

  assert(login.response.ok, `Backend manager login failed (${login.response.status})`);
  assert(login.payload?.token, 'Backend manager login did not return token');
  assert(login.payload?.user?.id, 'Backend manager login did not return user id');

  const token = login.payload.token;
  const manager = login.payload.user;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const sessionsRes = await requestJson(`${BACKEND_URL}/api/sessions`, { headers });
  assert(sessionsRes.response.ok, `Fetch sessions failed (${sessionsRes.response.status})`);
  const sessions = parseList(sessionsRes.payload);
  assert(sessions.length > 0, 'No sessions available for participant smoke test');
  const sessionId = Number(sessions[0].id);
  assert(Number.isInteger(sessionId), 'Invalid session id from backend');

  const challengesRes = await requestJson(`${BACKEND_URL}/api/challenges`, { headers });
  assert(challengesRes.response.ok, `Fetch challenges failed (${challengesRes.response.status})`);
  const challenges = parseList(challengesRes.payload);
  const selected = challenges.find((item) => String(item?.engine_key || '').trim() === CHALLENGE_ENGINE);
  assert(selected?.id, `No challenge found for engine ${CHALLENGE_ENGINE}`);

  const setActive = await requestJson(`${BACKEND_URL}/api/sessions/${sessionId}/active-challenge`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active_challenge_id: Number(selected.id) }),
  });
  assert(setActive.response.ok, `Set active challenge failed (${setActive.response.status})`);

  const participantEmail = `smoke.participant.${Date.now()}@teamspark.local`;
  const createParticipant = await requestJson(`${BACKEND_URL}/api/users/${manager.id}/participants`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: participantEmail,
      first_name: 'Smoke',
      last_name: 'Participant',
      password: PARTICIPANT_PASSWORD,
    }),
  });

  assert(createParticipant.response.ok, `Create participant failed (${createParticipant.response.status})`);

  const participantId = Number(createParticipant.payload?.participantId);
  assert(Number.isInteger(participantId), 'Participant creation did not return participantId');

  const assignRes = await requestJson(`${BACKEND_URL}/api/participants/${participantId}/assign-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId }),
  });
  assert(assignRes.response.ok, `Assign participant failed (${assignRes.response.status})`);

  const participantLogin = await requestJson(`${BACKEND_URL}/api/auth/login-participant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: participantEmail, password: PARTICIPANT_PASSWORD }),
  });

  assert(participantLogin.response.ok, `Participant login failed (${participantLogin.response.status})`);
  assert(participantLogin.payload?.token, 'Participant login did not return token');
  assert(participantLogin.payload?.user, 'Participant login did not return user');

  return {
    sessionId,
    participantToken: participantLogin.payload.token,
    participantUser: participantLogin.payload.user,
  };
}

async function run() {
  const { sessionId, participantToken, participantUser } = await prepareData();

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  } catch (err) {
    throw new Error(`Unable to launch browser channel "${BROWSER_CHANNEL}". ${err.message}`);
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${FRONTEND_URL}/participant?sessionId=${sessionId}`, { waitUntil: 'domcontentloaded' });

    await page.evaluate(({ tokenValue, userValue }) => {
      localStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('jwt', tokenValue);
      sessionStorage.setItem('currentUser', JSON.stringify(userValue));
    }, { tokenValue: participantToken, userValue: participantUser });

    await page.goto(`${FRONTEND_URL}/participant?sessionId=${sessionId}`, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('text=ESPACE PARTICIPANT', { timeout: 15000 });
    await page.waitForSelector('text=Informations de session', { timeout: 15000 });

    const joinLink = page.locator('a:has-text("Rejoindre le challenge actif")');
    await joinLink.waitFor({ timeout: 20000 });

    const href = await joinLink.getAttribute('href');
    assert(href && href.includes(`/challenges/${CHALLENGE_ENGINE}`), 'Participant challenge link is missing or invalid');

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
