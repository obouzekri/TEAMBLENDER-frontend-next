import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';
import { DISPLAY_PREFERENCES_KEY } from '../lib/display-preferences.js';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const user = { id: 1, role: 'manager', first_name: 'Fixture', last_name: 'Manager' };
const endpoints = ['results', 'participation-rate', 'kpis'];

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
      const normalized = value / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

try {
  for (const { locale, width, theme } of [
    { locale: 'fr', width: 1440, theme: 'light' },
    { locale: 'en', width: 1440, theme: 'dark' },
    { locale: 'fr', width: 390, theme: 'dark' },
    { locale: 'en', width: 390, theme: 'light' },
  ]) {
    console.log(`Checking preferences/results: ${locale}, ${width}, ${theme}`);
    const dictionary = locale === 'fr' ? fr : en;
    const preferences = dictionary.preferencesPage;
    const context = await browser.newContext({ locale, viewport: { width, height: 1000 } });
    const failures = new Map();
    let resultRows = [];
    const apiCalls = [];
    try {
      await context.addInitScript(({ user, locale, theme }) => {
        sessionStorage.setItem('jwt', 'local-preferences-results-fixture');
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('tb_locale_preference', locale);
        if (localStorage.getItem('tb_theme') === null) localStorage.setItem('tb_theme', theme);
      }, { user, locale, theme });
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname.includes('/api/')) {
          apiCalls.push({ path: url.pathname, method: request.method() });
          const endpoint = url.pathname.split('/').at(-1);
          const failure = failures.get(endpoint);
          if (failure === 'network') return route.abort('failed');
          if (failure === 'malformed') return route.fulfill({ json: {} });
          if (failure) return route.fulfill({ status: failure, json: { message: 'Fixture service unavailable' } });
          let payload = [];
          if (url.pathname.endsWith('/users/me')) payload = user;
          else if (/\/sessions\/42$/.test(url.pathname)) payload = { id: 42, name: 'Fixture results', status: 'terminee' };
          else if (endpoint === 'results') payload = { data: resultRows };
          else if (endpoint === 'participation-rate') payload = { data: { rate: 0, total_invited: 2 } };
          else if (endpoint === 'kpis') payload = { data: { answer_submissions: resultRows.length, total_invited: 2 } };
          return route.fulfill({ json: payload });
        }
        if (url.origin === new URL(baseUrl).origin) return route.continue();
        return route.abort();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseUrl}/${locale}/preferences`);
      await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
      const checkboxes = page.getByRole('checkbox');
      assert.equal(await checkboxes.count(), 4);
      assert.ok(await checkboxes.nth(0).isDisabled());
      assert.ok(await checkboxes.nth(1).isDisabled());
      assert.equal(await checkboxes.nth(0).isChecked(), false);
      await page.getByText(preferences.notificationsUnavailable, { exact: true }).waitFor();
      const navHeight = () => page.locator('.top-nav').evaluate((element) => element.getBoundingClientRect().height);
      const secondaryColors = () => page.getByText(preferences.highContrastBody, { exact: true }).evaluate((element) => ({
        foreground: getComputedStyle(element).color,
        background: getComputedStyle(element.closest('.preferences-toggle')).backgroundColor,
      }));
      const initialHeight = await navHeight();
      const initialColors = await secondaryColors();
      await checkboxes.nth(2).locator('xpath=ancestor::label').click();
      await checkboxes.nth(3).locator('xpath=ancestor::label').click();
      await page.getByRole('button', { name: preferences.save, exact: true }).click();
      await page.getByText(preferences.saved, { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), DISPLAY_PREFERENCES_KEY), { compactNavigation: true, highContrast: true });
      await page.waitForFunction(({ text, color }) => [...document.querySelectorAll('.preferences-toggle small')]
        .some((element) => element.textContent === text && getComputedStyle(element).color === color), {
        text: preferences.highContrastBody,
        color: theme === 'dark' ? 'rgb(241, 245, 255)' : 'rgb(36, 48, 71)',
      });
      const savedColors = await secondaryColors();
      const ratio = contrastRatio(savedColors.foreground, savedColors.background);
      const initialRatio = contrastRatio(initialColors.foreground, initialColors.background);
      assert.ok(ratio >= 4.5 && ratio > initialRatio, `Contrast did not improve: ${initialRatio} -> ${ratio}`);
      const compactHeight = await navHeight();
      assert.ok(compactHeight < initialHeight, `Navigation not smaller: ${initialHeight} -> ${compactHeight}`);
      await page.reload();
      await page.getByRole('heading', { name: preferences.title, exact: true }).waitFor();
      assert.ok(await checkboxes.nth(2).isChecked());
      assert.ok(await checkboxes.nth(3).isChecked());
      assert.equal(await navHeight(), compactHeight);
      await page.goto(`${baseUrl}/${locale}/account?tab=security`);
      await page.locator('#account-security').waitFor();
      assert.equal(await page.locator('html').getAttribute('data-high-contrast'), 'true');
      assert.equal(await page.locator('html').getAttribute('data-compact-navigation'), 'true');
      const anotherPage = await context.newPage();
      await anotherPage.goto(`${baseUrl}/${locale}/preferences`);
      await anotherPage.getByRole('heading', { name: preferences.title, exact: true }).waitFor();
      assert.ok(await anotherPage.getByRole('checkbox').nth(3).isChecked());
      await anotherPage.close();

      await page.goto(`${baseUrl}/${locale}/preferences`);
      await page.getByRole('heading', { name: preferences.title, exact: true }).waitFor();
      await page.evaluate((key) => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (name === key) throw new DOMException('Fixture storage denied', 'SecurityError');
          return original.call(this, name, value);
        };
      }, DISPLAY_PREFERENCES_KEY);
      await checkboxes.nth(3).locator('xpath=ancestor::label').click();
      await page.getByRole('button', { name: preferences.save, exact: true }).click();
      await page.getByText(preferences.saveError, { exact: true }).waitFor();
      assert.equal(await page.getByText(preferences.saved, { exact: true }).count(), 0);
      assert.equal(await page.locator('html').getAttribute('data-high-contrast'), 'true');
      assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).highContrast, DISPLAY_PREFERENCES_KEY), true);
      assert.ok(apiCalls.every((call) => call.method === 'GET'));

      const errorTitle = locale === 'fr' ? 'Impossible de charger les résultats' : 'Unable to load results';
      const emptyTitle = locale === 'fr' ? 'Aucun résultat enregistré' : 'No results recorded';
      for (const endpoint of endpoints) {
        failures.set(endpoint, 503);
        await page.goto(`${baseUrl}/${locale}/session-results/42`);
        await page.getByRole('heading', { name: errorTitle, exact: true }).waitFor();
        assert.match(await page.locator('p[role="alert"]').textContent(), /HTTP 503/);
        assert.equal(await page.getByRole('heading', { name: emptyTitle, exact: true }).count(), 0);
        assert.equal(await page.locator('.session-results-stats-grid').count(), 0);
        failures.clear();
        const beforeRetry = apiCalls.length;
        await page.getByRole('button', { name: locale === 'fr' ? 'Réessayer' : 'Retry', exact: true }).click();
        await page.getByRole('heading', { name: emptyTitle, exact: true }).waitFor();
        assert.equal(apiCalls.length - beforeRetry, 4);
      }
      for (const failure of ['malformed', 'network']) {
        failures.set('results', failure);
        await page.reload();
        await page.getByRole('heading', { name: errorTitle, exact: true }).waitFor();
        assert.equal(await page.getByRole('heading', { name: emptyTitle, exact: true }).count(), 0);
        failures.clear();
        resultRows = [{ id: 9, participant_id: 1, participant_name: 'Real fixture player', challenge_id: 7, challenge: { id: 7, name: 'Fixture Quiz' }, status: 'completed', score: 5 }];
        await page.getByRole('button', { name: locale === 'fr' ? 'Réessayer' : 'Retry', exact: true }).click();
        await page.getByText('Real fixture player', { exact: true }).waitFor();
        await page.getByText('5 pts', { exact: true }).first().waitFor();
        assert.equal(await page.getByRole('heading', { name: errorTitle, exact: true }).count(), 0);
        assert.equal(await page.getByRole('heading', { name: emptyTitle, exact: true }).count(), 0);
      }
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  console.log('TEST_PREFERENCES_RESULTS_UX_OK');
} finally {
  await browser.close();
}
