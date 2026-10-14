import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const deviceToken = 'a'.repeat(64);
const linkToken = 'b'.repeat(64);
const expiresAt = '2099-01-01T00:00:00.000Z';
const participant = { id: 42, role: 'participant', name: 'Alex Martin', first_name: 'Alex', last_name: 'Martin', recovery_session_id: 12 };
const session = { id: 12, name: 'Recovery fixture', status: 'en_cours', owner_id: 7, code: 'ABCDEF', challenges: [], participants: [], assigned_participants: [] };
let cases = 0;

async function fixture({ locale, mobile, manager = false, remembered = false, invalid = false, authenticated = false }) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    locale, isMobile: mobile, hasTouch: mobile,
  });
  const user = manager ? { id: 7, role: 'user', first_name: 'Manager', name: 'Manager' } : participant;
  const writes = [];
  const errors = [];
  await context.addInitScript(({ user, authenticated, remembered, deviceToken, expiresAt }) => {
    localStorage.setItem('teamblender-consent-state', JSON.stringify({
      decision: 'granted', policyVersion: '2026-06-07', updatedAt: new Date().toISOString(),
    }));
    if (authenticated) {
      sessionStorage.setItem('jwt', 'fixture-access');
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    }
    if (remembered) localStorage.setItem('tb_participant_recoveries', JSON.stringify([{
      sessionId: '12', participantName: 'Alex Martin', deviceToken, expiresAt,
    }]));
  }, { user, authenticated, remembered, deviceToken, expiresAt });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.includes('/api/')) {
      if (!['GET', 'HEAD'].includes(request.method())) writes.push({ path: url.pathname, body: request.postDataJSON() });
      if (url.pathname.endsWith('/auth/resume-participant')) {
        await route.fulfill(invalid
          ? { status: 401, json: { code: 'RECOVERY_INVALID', message: 'Lien invalide / Invalid link' } }
          : { json: { token: 'fixture-access', user: participant, sessionId: 12, recovery: { deviceToken, linkToken, expiresAt } } });
      } else if (url.pathname.endsWith('/auth/join-participant')) {
        await route.fulfill({ json: {
          token: 'fixture-access', user: participant, sessionId: 12, accountCreated: false,
          recovery: { deviceToken, linkToken, expiresAt },
        } });
      } else if (url.pathname.endsWith('/participant-management/42/recovery') || url.pathname.endsWith('/recovery-link')) {
        await route.fulfill({ json: { linkToken, expiresAt } });
      } else if (url.pathname.endsWith('/participant-management')) {
        await route.fulfill({ json: { can_remove_current: false, participants: [{ id: 42, name: 'Alex Martin', presence: 'offline' }] } });
      } else if (url.pathname.endsWith('/participants/me/sessions')) {
        await route.fulfill({ json: [session] });
      } else if (url.pathname.endsWith('/sessions/12/state') && !manager) {
        await route.fulfill({ json: { ...session, active_challenge_id: 7, current_challenge: { id: 7, engine_key: 'the_quiz' } } });
      } else if (url.pathname.endsWith('/sessions/12') || url.pathname.endsWith('/sessions/12/state')) {
        await route.fulfill({ json: session });
      } else if (url.pathname.endsWith('/runtime-challenge')) {
        await route.fulfill({ status: 404, json: { code: 'NO_SESSION_CHALLENGE' } });
      } else if (url.pathname.endsWith('/participants/me')) {
        await route.fulfill({ json: participant });
      } else if (url.pathname.endsWith('/auth/logout')) {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.fulfill({ json: [] });
      }
    } else if (url.pathname.includes('/socket.io') || url.pathname.startsWith('/ingest') || url.origin !== new URL(baseUrl).origin) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, writes, errors };
}

try {
  for (const locale of ['fr', 'en']) {
    for (const mobile of [false, true]) {
      const en = locale === 'en';
      const current = await fixture({ locale, mobile, remembered: true });
      try {
        const { page, writes, errors } = current;
        await page.goto(`${baseUrl}/${locale}/login?mode=join`);
        await page.locator('#join-session-code').waitFor();
        assert.equal(await page.getByRole('heading', { name: en ? 'Resume my participation' : 'Reprendre ma participation' }).count(), 0, 'No separate resume panel even with remembered browser data');
        await page.locator('#join-session-code').fill('ABCDEF');
        await page.locator('#join-first-name').fill('Alex');
        await page.locator('#join-last-name').fill('Martin');
        await page.locator('#login-panel-join button[type="submit"]').click();
        await page.waitForURL(/\/participant$/);
        const modal = page.getByRole('dialog', { name: en ? 'Resume without losing your progress' : 'Reprendre sans perdre votre progression' });
        await page.locator('.participant-session-card__cta').waitFor();
        assert.equal(await modal.count(), 0, 'No automatic recovery popup');
        assert.equal(await page.locator('.participant-credentials-notice').count(), 0, 'A returning guest does not see an account-created notice');
        const save = page.getByRole('button', { name: en ? 'Save my access' : 'Conserver mon acces' });
        await save.click();
        await modal.waitFor();
        await modal.getByRole('img', { name: en ? 'Scan to resume participation' : 'Scanner pour reprendre la participation' }).waitFor();
        const url = new URL(await modal.getByRole('textbox').inputValue());
        assert.equal(url.hash, `#recovery=${linkToken}`);
        assert.equal(writes.filter((write) => write.path.endsWith('/resume-participant')).length, 0, 'Ordinary return uses only the code form');
        assert.deepEqual(writes.find((write) => write.path.endsWith('/join-participant')).body, {
          sessionCode: 'ABCDEF', first_name: 'Alex', last_name: 'Martin', email: '', nickname: 'Alex',
        });
        await modal.getByRole('button', { name: en ? 'Close' : 'Fermer', exact: true }).click();
        await page.locator('.participant-session-card__cta').waitFor();
        assert.equal(new URL(page.url()).search, '', 'Recovery must show the home page before joining the running session');
        assert.ok(await save.isVisible(), 'Recovery access must be visible on mobile and desktop');
        // Remove local memory to verify logout still calls the server using the current JWT.
        await page.evaluate(() => localStorage.removeItem('tb_participant_recoveries'));
        if (mobile) {
          await page.locator('button.nav-toggle').click();
          await page.locator('.appnav-mobile-logout-btn').click();
        } else {
          await page.locator('.nav-user-trigger').click();
          await page.getByRole('menuitem', { name: en ? 'Log out' : 'Déconnexion' }).click();
        }
        await page.waitForURL(/\/login$/);
        assert.equal(writes.filter((write) => write.path.endsWith('/auth/logout')).length, 1);
        await page.getByRole('tab', { name: en ? 'Join with a code' : 'Rejoindre avec un code' }).click();
        await page.locator('#join-session-code').fill('ABCDEF');
        await page.locator('#join-first-name').fill('Alex');
        await page.locator('#join-last-name').fill('Martin');
        await page.locator('#login-panel-join button[type="submit"]').click();
        await page.waitForURL(/\/participant$/);
        await page.locator('.participant-session-card__cta').waitFor();
        assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('currentUser')).id), 42);
        assert.equal(await modal.count(), 0);
        assert.equal(writes.filter((write) => write.path.endsWith('/join-participant')).length, 2);
        assert.deepEqual(errors, []);
        cases += 1;
      } finally { await current.context.close(); }

      const manager = await fixture({ locale, mobile, manager: true, authenticated: true });
      try {
        const { page, writes, errors } = manager;
        await page.goto(`${baseUrl}/${locale}/session-live/12`);
        await page.locator('button[aria-expanded]').filter({ has: page.locator('svg.lucide-info') }).click();
        await page.getByRole('button', { name: en ? 'Manage participants' : 'Gérer les participants' }).click();
        await page.getByRole('button', { name: en ? 'Restore access' : 'Retablir l acces' }).click();
        assert.equal(writes.length, 0, 'Opening the confirmation must not issue a secret');
        await page.getByRole('button', { name: en ? 'Identity verified: generate link' : 'Identite verifiee : generer le lien' }).click();
        await page.getByRole('img', { name: en ? 'Scan to resume participation' : 'Scanner pour reprendre la participation' }).waitFor();
        assert.equal(writes.filter((write) => write.path.endsWith('/participant-management/42/recovery')).length, 1);
        assert.deepEqual(errors, []);
        cases += 1;
      } finally { await manager.context.close(); }
    }
  }

  for (const invalid of [false, true]) {
    const current = await fixture({ locale: 'fr', mobile: false, invalid });
    try {
      const { page, writes, errors } = current;
      const tracking = [];
      page.on('request', (request) => {
        if (/\/ingest|posthog|google-analytics|googletagmanager|\/_vercel\/insights/.test(request.url())) tracking.push(request.url());
      });
      await page.goto(`${baseUrl}/fr/resume#recovery=${linkToken}`);
      const resume = page.getByRole('button', { name: 'Reprendre la participation', exact: true });
      await resume.waitFor();
      assert.equal(new URL(page.url()).hash, '');
      assert.equal(writes.length, 0, 'Merely opening a link must not consume it');
      assert.deepEqual(tracking, [], 'Recovery page must not load analytics with personal secrets');
      await resume.click();
      if (invalid) {
        await page.getByRole('alert').filter({ hasText: 'Lien invalide' }).waitFor();
        assert.ok(page.url().endsWith('/resume'));
      } else {
        await page.waitForURL(/\/participant$/);
        await page.locator('.participant-session-card__cta').waitFor();
        assert.equal(writes[0].body.kind, 'link');
      }
      assert.deepEqual(errors, []);
      cases += 1;
    } finally { await current.context.close(); }
  }
  console.log(`PARTICIPANT_RECOVERY_UX_OK (${cases} scenarios; mocked APIs, no live data changes)`);
} finally { await browser.close(); }
