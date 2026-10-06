import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const activities = [
  { id: 101, name: 'Alpha', category: 'Collaboration', objectives: 'collaboration, Collaboration, communication', duration: 10, description: 'Short description.' },
  { id: 102, name: 'Beta', category: 'icebreaker', objectives: 'cohesion', duration: 15, description: 'A longer description. '.repeat(15) },
  { id: 103, name: 'Gamma', category: 'icebreaker', objectives: 'communication, leadership, cohesion', duration: 20, description: 'Team activity.' },
];
const session = { id: 42, name: 'UX test session', challenges: activities, assigned_participants: [], code: 'UXTEST', invite_token: 'ux-fixture' };
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  for (const { locale, mobile } of [
    { locale: 'en', mobile: false },
    { locale: 'fr', mobile: false },
    { locale: 'fr', mobile: true },
  ]) {
    console.log(`Checking ${locale} ${mobile ? 'touch' : 'desktop'}`);
    const context = await browser.newContext({
      locale,
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    let savedOrder = null;
    await context.addInitScript((language) => {
      sessionStorage.setItem('jwt', 'local-ux-fixture');
      sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: 'manager', first_name: 'UX' }));
      localStorage.setItem('tb_locale_preference', language);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (text) => {
          if (window.failClipboard) throw new Error('Clipboard denied');
          window.copiedText = text;
        } },
      });
    }, locale);
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/api/')) {
        let data = [];
        if (/\/sessions\/42$/.test(url.pathname) && route.request().method() === 'PUT') {
          savedOrder = route.request().postDataJSON().challenge_ids;
        }
        if (/\/challenges$/.test(url.pathname)) data = activities;
        else if (/\/sessions\/42\/invite$/.test(url.pathname)) data = session;
        else if (/\/sessions\/42$/.test(url.pathname)) data = session;
        await route.fulfill({ json: data });
      } else if (url.origin === new URL(baseUrl).origin) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/session-builder?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
    await page.getByRole('heading', { name: session.name, exact: true }).waitFor();
    assert.ok(await page.getByRole('heading', { name: session.name, exact: true })
      .evaluate((item) => Number.parseFloat(getComputedStyle(item).fontSize)) >= 24);
    const list = page.locator('ul').filter({ has: page.locator('[data-activity-id]') });
    const order = () => list.locator('[data-activity-id]').evaluateAll((items) => items.map((item) => Number(item.dataset.activityId)));
    await page.locator('[data-activity-id="103"]').waitFor();
    assert.deepEqual(await order(), [101, 102, 103]);

    const catalog = page.locator('[data-catalog]');
    const cards = catalog.locator('[class*="cardHeader"]').locator('..');
    const heights = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    assert.ok(heights.length >= 3);
    assert.ok(Math.max(...heights) - Math.min(...heights) < 1, `Unequal card heights: ${heights}`);
    const alpha = cards.filter({ has: page.getByRole('heading', { name: 'Alpha', exact: true }) });
    assert.equal(await alpha.locator('[class*="badge"]').filter({ hasText: /^Collaboration$/ }).count(), 1);
    await alpha.getByRole('button', { name: locale === 'en' ? 'In list' : 'Déjà ajouté', exact: true }).isDisabled().then((disabled) => assert.ok(disabled));

    const reset = page.getByRole('button', { name: locale === 'en' ? 'Reset filters' : 'Réinitialiser les filtres', exact: true });
    await reset.focus();
    await reset.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await reset.getByRole('tooltip').evaluate((item) => getComputedStyle(item).opacity), '1');

    const handle = page.locator('[data-activity-id="101"] button').first();
    const secondaryActions = page.locator('[data-activity-id="101"] [class*="itemActions"]');
    await page.mouse.move(0, 0);
    assert.equal(await secondaryActions.evaluate((item) => getComputedStyle(item).opacity), mobile ? '1' : '0');
    await handle.focus();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-activity-id="101"] [class*="itemActions"]')).opacity === '1');
    await handle.press('ArrowDown');
    assert.deepEqual(await order(), [102, 101, 103]);
    await handle.press('ArrowUp');
    assert.deepEqual(await order(), [101, 102, 103]);
    await list.scrollIntoViewIfNeeded();
    const source = await handle.boundingBox();
    const target = await page.locator('[data-activity-id="103"]').boundingBox();
    if (mobile) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source.x + source.width / 2, y: source.y + source.height / 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    await page.waitForFunction(() => [...document.querySelectorAll('[data-activity-id]')].map((item) => Number(item.dataset.activityId)).join(',') === '102,103,101');
    assert.deepEqual(await order(), [102, 103, 101]);
    const savedResponse = page.waitForResponse((response) => response.url().includes('/sessions/42') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: locale === 'en' ? 'Save configuration' : 'Sauvegarder la configuration', exact: true }).click();
    assert.ok((await savedResponse).ok());
    await page.waitForFunction(() => Boolean(localStorage.getItem('selectedChallenges')));
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('selectedChallenges')).map((item) => item.id)), [102, 103, 101]);
    assert.deepEqual(savedOrder, [102, 103, 101]);

    const copyButtons = page.locator('[class*="summaryInviteCopy"]');
    assert.equal(await copyButtons.count(), 3);
    assert.equal(new Set(await copyButtons.evaluateAll((items) => items.map((item) => item.className))).size, 1);
    for (const [label, expected] of [
      [locale === 'en' ? 'Copy invite' : "Copier l'invitation", 'UXTEST'],
      [locale === 'en' ? 'Copy link' : 'Copier le lien', 'invite=ux-fixture'],
      [locale === 'en' ? 'Copy code' : 'Copier le code', 'UXTEST'],
    ]) {
      const button = page.getByRole('button', { name: label, exact: true });
      await button.click();
      await page.getByRole('button', { name: locale === 'en' ? 'Copied' : 'Copié !', exact: true }).waitFor();
      assert.ok((await page.evaluate(() => window.copiedText)).includes(expected));
      await button.waitFor();
      assert.equal(await button.textContent(), label);
    }
    await page.evaluate(() => { window.failClipboard = true; });
    await page.getByRole('button', { name: locale === 'en' ? 'Copy code' : 'Copier le code', exact: true }).click();
    await page.getByText(locale === 'en' ? 'Unable to copy. Please copy the invitation manually.' : "Impossible de copier. Copiez l'invitation manuellement.", { exact: true }).waitFor();
    const remove = page.locator('[data-activity-id="101"]').getByRole('button', { name: locale === 'en' ? 'Remove this activity' : 'Retirer cette activité', exact: true });
    await remove.focus();
    await remove.click();
    assert.deepEqual(await order(), [102, 103]);
    await alpha.getByRole('button', { name: locale === 'en' ? 'Add' : 'Ajouter', exact: true }).click();
    assert.deepEqual(await order(), [102, 103, 101]);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('TEST_SESSION_BUILDER_UX_OK');
} finally {
  await browser.close();
}
