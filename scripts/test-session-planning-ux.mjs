import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const catalog = [
  { id: 101, engine_key: 'mission_critique_v1', name: 'Mission Critique', duration: 15, objectives: 'collaboration', status: 'actif' },
  { id: 102, engine_key: 'labyrinthe_live_v1', name: 'Labyrinthe', duration: 15, objectives: 'collaboration', status: 'actif' },
  { id: 103, engine_key: 'crossword_live_v1', name: 'Mots croisés', duration: 15, objectives: 'collaboration', status: 'actif' },
];
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const locale of ['fr', 'en']) {
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 900 } });
    let savedSession = null;
    await context.addInitScript((language) => {
      sessionStorage.setItem('jwt', 'local-ux-fixture');
      sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: 'user', first_name: 'UX' }));
      localStorage.setItem('tb_locale_preference', language);
    }, locale);
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes('/api/')) {
        if (url.origin === new URL(baseUrl).origin) await route.continue();
        else await route.abort();
        return;
      }
      let data = [];
      if (/\/challenges$/.test(url.pathname)) data = catalog;
      if (/\/sessions$/.test(url.pathname) && route.request().method() === 'POST') {
        savedSession = { ...route.request().postDataJSON(), id: 42, assigned_participants: [], challenges: [], code: 'UXTEST' };
        data = savedSession;
      } else if (/\/sessions\/42\/invite$/.test(url.pathname)) {
        data = { ...savedSession, invite_token: 'ux-fixture' };
      } else if (/\/sessions\/42$/.test(url.pathname)) {
        if (route.request().method() === 'PUT') savedSession = { ...savedSession, ...route.request().postDataJSON() };
        data = savedSession;
      }
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/session-builder`);
    const cookieButton = page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true });
    await cookieButton.click();
    await page.locator('#session-name').fill('Session planning UX');
    assert.equal(await page.locator('#expected-participants').getAttribute('required'), null);
    assert.equal(await page.locator('#session-objective').inputValue(), '');
    await page.locator('#expected-participants').fill('6');
    await page.locator('#session-objective').selectOption('collaboration');
    await page.getByRole('button', { name: locale === 'fr' ? 'Créer la session' : 'Create session', exact: true }).click();
    await page.getByRole('heading', { name: 'Session planning UX', exact: true }).waitFor();
    assert.equal(savedSession.expected_participant_count, 6);
    assert.equal(savedSession.objective, 'collaboration');
    assert.equal(savedSession.participant_ids, undefined);
    await page.getByRole('button', { name: locale === 'fr' ? 'Me proposer un programme' : 'Suggest a program', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#program-duration').fill('30');
    await dialog.getByRole('button', { name: locale === 'fr' ? 'Générer une proposition' : 'Generate a proposal', exact: true }).click();
    const preview = dialog.locator('ol li');
    assert.ok(await preview.count() > 0);
    assert.ok(!(await preview.allTextContents()).some((name) => name.includes('croisés')));
    const initialPreview = await preview.allTextContents();
    await dialog.getByRole('button', { name: locale === 'fr' ? 'Remplacer' : 'Replace', exact: true }).first().click();
    await page.waitForFunction((before) => {
      const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
      const current = [...modal.querySelectorAll('ol li')].map((item) => item.textContent);
      return JSON.stringify(current) !== JSON.stringify(before) || modal.querySelector('[role="alert"]');
    }, initialPreview);
    await dialog.getByRole('button', { name: locale === 'fr' ? 'Utiliser ce programme' : 'Use this program', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.ok(await page.locator('[data-activity-id]').count() > 0);
    await page.getByRole('button', { name: locale === 'fr' ? 'Modifier les détails de session' : 'Edit session details', exact: true }).click();
    await page.locator('#edit-expected-participants').fill('');
    await page.locator('#edit-session-objective').selectOption('');
    await page.getByRole('dialog').getByRole('button', { name: locale === 'fr' ? 'Sauvegarder' : 'Save', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(savedSession.expected_participant_count, null);
    assert.equal(savedSession.objective, null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`SESSION_PLANNING_UX_OK ${locale}`);
  }
} finally {
  await browser.close();
}
