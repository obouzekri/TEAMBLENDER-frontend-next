import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const sessions = [
  { id: 42, name: 'Assigned Alpha', status: 'en_cours' },
  { id: 43, name: 'Assigned Beta', status: 'en_cours' },
  { id: 44, name: 'Not launched', status: 'preparee' },
];

async function fixture(locale, width, recovery = false) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const requests = [];
  const errors = [];
  const control = { active: false, runtimeFallback: false, listStatus: 200, malformed: false };
  await context.addInitScript(({ locale, recovery }) => {
    sessionStorage.setItem('jwt', 'navigation-fixture');
    sessionStorage.setItem('currentUser', JSON.stringify({
      id: 123, role: 'participant', name: 'Navigation Participant',
      ...(recovery ? { recovery_session_id: 42 } : {}),
    }));
    localStorage.setItem('tb_locale_preference', locale);
    localStorage.setItem('teamblender-consent-state', JSON.stringify({
      decision: 'denied', policyVersion: '2026-06-07', updatedAt: new Date().toISOString(),
    }));
  }, { locale, recovery });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/')) {
      requests.push(url.pathname);
      if (url.pathname.endsWith('/participants/me/sessions')) {
        await route.fulfill({
          status: control.listStatus,
          json: control.malformed ? {} : recovery ? [sessions[0]] : sessions,
        });
      } else if (url.pathname.endsWith('/auth/join-participant-authenticated')) {
        assert.equal(route.request().postDataJSON().sessionCode, 'BETA');
        await route.fulfill({ json: { sessionId: 43 } });
      } else if (url.pathname.endsWith('/state')) {
        await route.fulfill({ json: {
          status: 'en_cours',
          active_challenge_id: control.active ? 7 : null,
          current_challenge: control.active && !control.runtimeFallback
            ? { id: 7, name: 'Active quiz', engine_key: 'the_quiz' }
            : null,
        } });
      } else if (url.pathname.endsWith('/runtime-challenge')) {
        await route.fulfill({ json: { engine_key: 'the_quiz', challenge_id: 7, config: {} } });
      } else if (/\/sessions\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        await route.fulfill({ json: { ...sessions.find((session) => session.id === id), assigned_participants: [] } });
      } else {
        await route.fulfill({ json: [] });
      }
    } else if (url.pathname.includes('/socket.io') || url.origin !== new URL(baseUrl).origin) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, requests, errors, control };
}

try {
  for (const locale of ['fr', 'en']) {
    for (const width of [390, 1440]) {
      const current = await fixture(locale, width);
      try {
        const { page, requests, errors, control } = current;
        await page.clock.install();
        await page.goto(`${baseUrl}/${locale}/participant`);
        const card = (name) => page.locator('.participant-session-card').filter({ hasText: name });
        await card('Assigned Alpha').getByRole('button').click();
        await page.waitForURL(/\/participant\?sessionId=42$/);
        await page.locator('.participant-meta-line').filter({ hasText: '42' }).waitFor();
        await card('Assigned Beta').waitFor();
        await page.getByText(/Loading assigned sessions|Chargement des sessions assignées/).waitFor({ state: 'hidden' });
        assert.equal(await page.locator('.participant-team-list').count(), 0);
        assert.equal(requests.some((path) => /\/sessions\/\d+\/participants$/.test(path)), false, 'No roster request on the participant home');
        assert.equal(await card('Not launched').getByRole('button').count(), 0, 'Prepared sessions remain unavailable');
        await card('Assigned Alpha').getByRole('button').click();
        assert.equal(await card('Assigned Alpha').getByRole('button').isEnabled(), true, 'Reopening the current waiting room must not stay busy');
        await card('Assigned Beta').getByRole('button').click();
        await page.waitForURL(/\/participant\?sessionId=43$/);
        await page.locator('.participant-meta-line').filter({ hasText: '43' }).waitFor();
        assert.equal(await page.evaluate(() => sessionStorage.getItem('targetSessionId')), '43');
        await page.goBack();
        await page.waitForURL(/\/participant\?sessionId=42$/);
        await page.locator('.participant-meta-line').filter({ hasText: '42' }).waitFor();
        assert.equal(await page.evaluate(() => sessionStorage.getItem('targetSessionId')), '42');
        control.active = true;
        await page.clock.fastForward(9000);
        await page.waitForURL(new RegExp(`/${locale}/challenges/the_quiz\\?sessionId=42$`));
        assert.deepEqual(errors, []);
        console.log(`PASS participant navigation, waiting room and automatic challenge: ${locale}/${width}`);
      } finally { await current.context.close(); }

      const recovered = await fixture(locale, width, true);
      try {
        const { page, errors, control } = recovered;
        await page.goto(`${baseUrl}/${locale}/participant?sessionId=42`);
        await page.locator('.participant-session-card__cta').waitFor();
        assert.equal(await page.locator('.participant-session-card').count(), 1);
        assert.equal(await page.locator('.participant-join-trigger').count(), 0, 'Recovery access cannot add another session');
        await page.getByRole('button', { name: locale === 'fr' ? 'Conserver mon acces' : 'Save my access', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await dialog.getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true }).click();
        control.active = true;
        control.runtimeFallback = true;
        await page.reload();
        await page.waitForURL(new RegExp(`/${locale}/challenges/the_quiz\\?sessionId=42$`));
        assert.deepEqual(errors, []);
        console.log(`PASS recovered session and runtime fallback: ${locale}/${width}`);
      } finally { await recovered.context.close(); }
    }
  }

  const current = await fixture('fr', 1440);
  try {
    const { page, control, errors } = current;
    control.listStatus = 503;
    await page.goto(`${baseUrl}/fr/participant`);
    await page.getByRole('alert').filter({ hasText: 'Impossible de charger vos sessions' }).waitFor();
    assert.equal(await page.getByText('Aucune session assignée', { exact: true }).count(), 0, 'An API failure is not an empty session list');
    control.listStatus = 200;
    control.malformed = true;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('alert').filter({ hasText: 'Liste de sessions invalide' }).waitFor();
    control.malformed = false;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.locator('.participant-session-card__cta').first().waitFor();
    await page.locator('.participant-error-text[role="alert"]').waitFor({ state: 'hidden' });
    await page.locator('.participant-join-trigger').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('beta');
    await dialog.getByRole('button', { name: 'Rejoindre', exact: true }).click();
    await page.waitForURL(/\/participant\?sessionId=43$/);
    await page.locator('.participant-meta-line').filter({ hasText: '43' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS session errors, retry and direct authenticated code join');
  } finally { await current.context.close(); }
} finally {
  await browser.close();
}
