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
    { locale: 'fr', width: 320, theme: 'light' },
    { locale: 'en', width: 320, theme: 'dark' },
  ]) {
    console.log(`Checking preferences/results: ${locale}, ${width}, ${theme}`);
    const dictionary = locale === 'fr' ? fr : en;
    const preferences = dictionary.preferencesPage;
    const context = await browser.newContext({ locale, viewport: { width, height: 1000 } });
    const failures = new Map();
    let resultRows = [];
    let notificationPreferences = { session_reminders: false, activity_summaries: true };
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
          if (endpoint === 'notification-preferences') {
            if (request.method() === 'PATCH') notificationPreferences = request.postDataJSON();
            payload = notificationPreferences;
          }
          else if (url.pathname.endsWith('/auth/csrf-token')) payload = { csrfToken: 'fixture-csrf' };
          else if (url.pathname.endsWith('/users/me')) payload = user;
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
      await page.getByRole('button', { name: preferences.save, exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.preferences-toggle input')?.disabled);
      assert.equal(await checkboxes.nth(0).isDisabled(), false);
      assert.equal(await checkboxes.nth(1).isDisabled(), false);
      assert.equal(await checkboxes.nth(0).isChecked(), false);
      assert.equal(await checkboxes.nth(1).isChecked(), true);
      await page.getByText(preferences.accountStorage, { exact: true }).waitFor();
      const main = page.locator('.preferences-page');
      assert.equal(await main.getByRole('heading', { level: 1, name: preferences.title, exact: true }).count(), 1);
      assert.equal(await main.getByText(preferences.title, { exact: true }).count(), 1);
      for (const title of [preferences.notificationsTitle, preferences.appearanceTitle]) {
        assert.equal(await main.getByRole('heading', { level: 2, name: title, exact: true }).count(), 1);
        assert.equal(await main.getByText(title, { exact: true }).count(), 1);
      }
      assert.equal(await main.getByText(preferences.languageTitle, { exact: true }).count(), 0);
      assert.equal(await main.getByText(preferences.personalizationTitle, { exact: true }).count(), 0);
      assert.equal(await main.locator(':scope > section').count(), 4);
      const languageRow = main.locator('.preferences-language-row');
      const languageLayout = await languageRow.evaluate((row) => {
        const heading = row.querySelector('h2').getBoundingClientRect();
        const switcher = row.querySelector('.lang-switch').getBoundingClientRect();
        return {
          centerDifference: Math.abs((heading.top + heading.bottom - switcher.top - switcher.bottom) / 2),
          separated: heading.right <= switcher.left,
          fits: row.scrollWidth <= row.clientWidth,
        };
      });
      assert.ok(languageLayout.centerDifference <= 1 && languageLayout.separated && languageLayout.fits,
        `Language controls must fit on one row: ${JSON.stringify(languageLayout)}`);
      await languageRow.getByRole('button', { name: new RegExp(dictionary.language.switcherAria) }).click();
      await page.getByRole('menuitemradio').filter({ hasText: locale === 'fr' ? 'English' : 'Fran\u00e7ais' }).click();
      await page.waitForURL(`**/${locale === 'fr' ? 'en' : 'fr'}/preferences`);
      assert.equal(await page.evaluate(() => localStorage.getItem('tb_locale_preference')), locale === 'fr' ? 'en' : 'fr');
      await languageRow.getByRole('button').click();
      await page.getByRole('menuitemradio').filter({ hasText: locale === 'fr' ? 'Fran\u00e7ais' : 'English' }).click();
      await page.waitForURL(`**/${locale}/preferences`);
      await main.getByRole('heading', { level: 1, name: preferences.title, exact: true }).waitFor();
      const checkPreferencesSpacing = async () => {
        const layout = await page.locator('.preferences-page').evaluate((main) => {
          const nav = document.querySelector('.top-nav').getBoundingClientRect();
          const cards = [...main.querySelectorAll(':scope > section')].map((card) => card.getBoundingClientRect());
          return {
            navigationGap: cards[0].top - nav.bottom,
            sectionGaps: cards.slice(1).map((card, index) => card.top - cards[index].bottom),
            widths: cards.map((card) => card.width),
          };
        });
        assert.ok(layout.navigationGap >= 32 && layout.navigationGap <= 40,
          `Expected 32-40px below navigation, got ${layout.navigationGap}px`);
        return layout;
      };
      const initialLayout = await checkPreferencesSpacing();
      const previousSpacing = await page.addStyleTag({
        content: '.shell.preferences-page { margin-top: 0; padding-top: 0.6rem; }',
      });
      const previousLayout = await page.locator('.preferences-page').evaluate((main) => {
        const cards = [...main.querySelectorAll(':scope > section')].map((card) => card.getBoundingClientRect());
        return {
          sectionGaps: cards.slice(1).map((card, index) => card.top - cards[index].bottom),
          widths: cards.map((card) => card.width),
        };
      });
      await previousSpacing.evaluate((element) => element.remove());
      assert.deepEqual(initialLayout.sectionGaps, previousLayout.sectionGaps);
      assert.deepEqual(initialLayout.widths, previousLayout.widths);
      const navHeight = () => page.locator('.top-nav').evaluate((element) => element.getBoundingClientRect().height);
      const secondaryColors = () => page.getByText(preferences.highContrastBody, { exact: true }).evaluate((element) => ({
        foreground: getComputedStyle(element).color,
        background: getComputedStyle(element.closest('.preferences-toggle')).backgroundColor,
      }));
      const initialHeight = await navHeight();
      const initialColors = await secondaryColors();
      await checkboxes.nth(0).locator('xpath=ancestor::label').click();
      await checkboxes.nth(1).locator('xpath=ancestor::label').click();
      await checkboxes.nth(2).locator('xpath=ancestor::label').click();
      await checkboxes.nth(3).locator('xpath=ancestor::label').click();
      await page.getByRole('button', { name: preferences.save, exact: true }).click();
      await page.getByText(preferences.saved, { exact: true }).waitFor();
      assert.deepEqual(notificationPreferences, { session_reminders: true, activity_summaries: false });
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
      assert.ok(await checkboxes.nth(0).isChecked());
      assert.equal(await checkboxes.nth(1).isChecked(), false);
      assert.equal(await navHeight(), compactHeight);
      await checkPreferencesSpacing();
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
      assert.ok(apiCalls.filter((call) => call.method === 'PATCH')
        .every((call) => call.path.endsWith('/users/me/notification-preferences')));

      failures.set('notification-preferences', 503);
      await page.reload();
      await page.getByText(preferences.notificationsLoadError, { exact: true }).waitFor();
      assert.ok(await checkboxes.nth(0).isDisabled());
      assert.ok(await page.getByRole('button', { name: preferences.save, exact: true }).isDisabled());
      failures.clear();
      await page.getByRole('button', { name: preferences.retry, exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('.preferences-toggle input')?.disabled);
      assert.ok(await checkboxes.nth(0).isChecked());
      failures.set('notification-preferences', 503);
      await checkboxes.nth(0).locator('xpath=ancestor::label').click();
      await page.getByRole('button', { name: preferences.save, exact: true }).click();
      await page.getByText(preferences.saveError, { exact: true }).waitFor();
      assert.equal(notificationPreferences.session_reminders, true);
      assert.equal(await page.getByText(preferences.saved, { exact: true }).count(), 0);
      failures.clear();

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
