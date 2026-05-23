import { chromium } from 'playwright';

const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const BACKEND_URL = process.env.SMOKE_BACKEND_URL || 'http://localhost:3000';
const MANAGER_EMAIL = process.env.SMOKE_MANAGER_EMAIL || 'admin@admin.com';
const MANAGER_PASSWORD = process.env.SMOKE_MANAGER_PASSWORD || 'Admin1234!';
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

async function loginManager() {
  const login = await requestJson(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MANAGER_EMAIL, password: MANAGER_PASSWORD }),
  });

  assert(login.response.ok, `Backend manager login failed (${login.response.status})`);
  assert(login.payload?.token, 'Backend manager login did not return token');
  assert(login.payload?.user, 'Backend manager login did not return user payload');

  return {
    token: login.payload.token,
    user: login.payload.user,
  };
}

async function resolveSessionId(token) {
  const sessions = await requestJson(`${BACKEND_URL}/api/sessions`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!sessions.response.ok) {
    return '';
  }

  const list = Array.isArray(sessions.payload)
    ? sessions.payload
    : Array.isArray(sessions.payload?.sessions)
      ? sessions.payload.sessions
      : Array.isArray(sessions.payload?.data)
        ? sessions.payload.data
        : [];

  const first = list[0];
  const id = String(first?.id || first?.session_id || first?.sessionId || '').trim();
  return id;
}

async function run() {
  const { token, user } = await loginManager();
  const sessionId = await resolveSessionId(token);

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true, channel: BROWSER_CHANNEL });
  } catch (err) {
    throw new Error(`Unable to launch browser channel "${BROWSER_CHANNEL}". ${err.message}`);
  }

  const context = await browser.newContext();
  await context.addInitScript(({ tokenValue, userValue }) => {
    localStorage.setItem('jwt', tokenValue);
    sessionStorage.setItem('jwt', tokenValue);
    sessionStorage.setItem('currentUser', JSON.stringify(userValue));
  }, { tokenValue: token, userValue: user });
  const page = await context.newPage();

  try {
    await page.goto(`${FRONTEND_URL}/home`, { waitUntil: 'domcontentloaded' });
    const targetBuilderUrl = sessionId
      ? `${FRONTEND_URL}/session-builder?sessionId=${encodeURIComponent(sessionId)}`
      : `${FRONTEND_URL}/session-builder`;
    await page.goto(targetBuilderUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const text = document.body?.innerText || '';
      return text.includes('Construire votre session') || text.includes('Préparer la session');
    }, { timeout: 15000 });

    await page.waitForFunction(() => {
      const bodyText = document.body?.innerText || '';
      const isEmptyState = bodyText.includes('Aucune activité ne correspond à vos critères');
      const buttons = Array.from(document.querySelectorAll('button'));
      const catalogButtons = buttons.filter((btn) => {
        const text = (btn.textContent || '').trim();
        return text.includes('Ajouter') || text.includes('Ajoutée');
      });
      return isEmptyState || catalogButtons.length > 0;
    }, { timeout: 20000 });

    const emptyMessage = page.locator('text=Aucune activité ne correspond à vos critères');
    const addButtons = page.locator('button:has-text("Ajouter"), button:has-text("Ajoutée")');

    const hasEmpty = await emptyMessage.count();
    const buttonCount = await addButtons.count();

    assert(hasEmpty === 0, 'Session-builder affiche un catalogue vide');
    assert(buttonCount > 0, 'Aucune carte challenge detectee dans le catalogue');

    console.log('SMOKE_SESSION_BUILDER_CATALOG_OK');
    console.log(`buttons=${buttonCount}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((err) => {
  console.error('SMOKE_SESSION_BUILDER_CATALOG_FAIL');
  console.error(err.message || err);
  process.exit(1);
});
