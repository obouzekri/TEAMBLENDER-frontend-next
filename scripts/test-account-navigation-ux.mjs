import assert from 'node:assert/strict';
import { join } from 'node:path';
import { chromium } from 'playwright';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});
const plans = [
  { id: 1, slug: 'free', name: 'Free', price_cents: 0, price_mad_cents: 0 },
  { id: 2, slug: 'session', name: 'Session', price_cents: 4900, price_mad_cents: 4900 },
  { id: 3, slug: 'pro', name: 'Pro', price_cents: 39000, price_mad_cents: 39000 },
  { id: 4, slug: 'pro-plus', name: 'Pro+', price_cents: 69600, price_mad_cents: 69600 },
].map((plan) => ({
  ...plan,
  description: 'Account navigation fixture',
  features: ['Sessions illimitées', '30 participants par session', 'Support prioritaire'],
}));
const history = Array.from({ length: 15 }, (_, index) => ({
  id: `navigation-${index}`,
  at: '2026-10-01T12:00:00.000Z',
  to: 'Pro',
  to_plan_id: 3,
  amount_label: '390 DH HT',
}));

async function check({ role, locale, width, theme, colorScheme = 'light' }) {
  console.log(`Account navigation: ${role}, ${locale}, ${width}px, ${theme}/${colorScheme}`);
  const account = (locale === 'fr' ? fr : en).account;
  let user = {
    id: 1, role, first_name: 'Navigation', last_name: 'Fixture',
    email: 'navigation@example.test', pricing_plan_id: 1, pricing_plan: plans[0],
    job_title: '', department: '',
  };
  const context = await browser.newContext({
    viewport: { width, height: width < 640 ? 844 : 1000 }, locale, colorScheme,
  });
  try {
    await context.addInitScript(({ user, locale, theme }) => {
      sessionStorage.setItem('jwt', 'local-navigation-fixture');
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('tb_locale_preference', locale);
      localStorage.setItem('tb_theme', theme);
    }, { user, locale, theme });
    const writes = [];
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        let data = [];
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes.push({ path: url.pathname, body: request.postDataJSON() });
        }
        if (/\/(users|participants)\/me$/.test(url.pathname)) {
          if (request.method() === 'PATCH') user = { ...user, ...request.postDataJSON() };
          data = user;
        } else if (url.pathname.endsWith('/pricing-plans')) data = plans;
        else if (url.pathname.endsWith('/auth/csrf-token')) data = { csrfToken: 'local-csrf-fixture' };
        await route.fulfill({ json: data });
      } else if (url.origin === new URL(baseUrl).origin) {
        await route.continue();
      } else await route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/account?tab=invoices&source=navigation-test`);
    await page.locator('.account-panel.is-active').waitFor();
    const rejectCookies = page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true });
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    await page.evaluate(() => document.fonts.ready);
    const accountHeaderPadding = await page.locator('.account-page-header').evaluate((element) => {
      const styles = getComputedStyle(element);
      return [Number.parseFloat(styles.paddingLeft), Number.parseFloat(styles.paddingRight)];
    });
    assert.ok(accountHeaderPadding.every((padding) => padding >= 20),
      `Account header side padding is too small: ${accountHeaderPadding.join(', ')}`);
    if (role === 'participant') {
      assert.equal(await page.getByRole('tab').count(), 1);
      assert.ok(await page.locator('#account-security').isVisible());
      assert.equal(new URL(page.url()).searchParams.get('tab'), 'security');
      assert.equal(await page.locator('#account-invoices').count(), 0);
      assert.equal(await page.locator('#account-pricing').count(), 0);
      await page.getByRole('tab').press('End');
      assert.equal(new URL(page.url()).searchParams.get('tab'), 'security');
      assert.deepEqual(errors, []);
      return;
    }
    assert.equal(await page.getByRole('tab').count(), 4);
    await page.getByRole('heading', { name: account.noInvoices, exact: true }).waitFor();
    const tabs = ['profile', 'security', 'pricing', 'invoices'];
    for (const tab of tabs) {
      await page.locator(`#account-tab-${tab}`).click();
      assert.equal(await page.locator(`#account-tab-${tab}`).getAttribute('aria-selected'), 'true');
      assert.equal(await page.getByRole('tabpanel').count(), 1);
      assert.equal(new URL(page.url()).searchParams.get('tab'), tab);
      assert.equal(new URL(page.url()).searchParams.get('source'), 'navigation-test');
      if (process.env.ACCOUNT_SCREENSHOT_DIR && role === 'manager' && locale === 'fr' && theme === 'light' && width !== 768) {
        await page.screenshot({ path: join(process.env.ACCOUNT_SCREENSHOT_DIR, `account-${tab}-${width}.png`), fullPage: true });
      }
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        panel: document.querySelector('.account-panel.is-active').scrollWidth >
          document.querySelector('.account-panel.is-active').clientWidth + 1,
        panelY: ['auto', 'scroll'].includes(
          getComputedStyle(document.querySelector('.account-panel.is-active')).overflowY
        ),
      }));
      assert.deepEqual(overflow, { page: false, panel: false, panelY: false });
    }
    await page.goBack();
    await page.locator('#account-pricing.is-active').waitFor();
    await page.goForward();
    await page.locator('#account-invoices.is-active').waitFor();
    await page.reload();
    await page.locator('#account-invoices.is-active').waitFor();
    await page.locator('#account-tab-invoices').press('Home');
    await page.locator('#account-profile.is-active').waitFor();
    await page.locator('#account-job-title').fill('Navigation draft');
    await page.locator('#account-tab-profile').press('ArrowLeft');
    await page.locator('#account-invoices.is-active').waitFor();
    await page.locator('#account-tab-invoices').press('ArrowRight');
    await page.locator('#account-profile.is-active').waitFor();
    assert.equal(await page.locator('#account-job-title').inputValue(), 'Navigation draft');
    await page.getByRole('button', { name: account.saveChanges, exact: true }).click();
    await page.getByText(account.profileUpdated, { exact: true }).waitFor();
    assert.deepEqual(writes, [{ path: '/api/users/me', body: { job_title: 'Navigation draft', department: null } }]);
    await page.locator('#account-tab-profile').press('End');
    await page.locator('#account-invoices.is-active').waitFor();
    await page.evaluate((history) => {
      localStorage.setItem('accountPlanChangeHistory', JSON.stringify(history));
    }, history);
    await page.reload();
    await page.locator('#account-invoices tbody tr').first().waitFor();
    assert.equal(await page.locator('#account-invoices tbody tr').count(), 15);
    assert.equal(await page.locator('#account-pricing table').count(), 0);
    assert.equal(await page.locator('#account-invoices th').allTextContents().then((items) => items[1]), account.invoicePlan);
    const invoicePanel = page.locator('#account-invoices');
    assert.equal(await invoicePanel.evaluate((element) => getComputedStyle(element).overflowY), 'visible');
    await invoicePanel.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    assert.equal(await invoicePanel.evaluate((element) => element.scrollTop), 0);
    const downloadPromise = page.waitForEvent('download');
    await invoicePanel.getByRole('button', { name: account.downloadPdf, exact: true }).last().click();
    assert.match((await downloadPromise).suggestedFilename(), /^invoice-navigation-\d+\.pdf$/);
    await page.locator('#account-tab-pricing').click();
    await page.getByRole('button', { name: account.annual, exact: false }).click();
    await page.locator('.account-pricing-control-group select').selectOption('EUR');
    await page.locator('.account-plan-card-actions__primary').first().click();
    await page.getByRole('dialog', { name: 'Finaliser le paiement', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Finaliser le paiement', exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await page.locator('#account-tab-invoices').click();
    assert.equal(await invoicePanel.evaluate((element) => element.scrollTop), 0);
    await page.locator('#account-tab-pricing').click();
    assert.equal(await page.locator('.account-pricing-control-group select').inputValue(), 'EUR');
    assert.ok(await page.getByRole('button', { name: account.annual, exact: false }).evaluate((element) => element.classList.contains('is-active')));
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

try {
  for (const locale of ['fr', 'en']) {
    for (const width of [320, 768, 1440]) {
      for (const theme of ['light', 'dark']) await check({ role: 'manager', locale, width, theme });
    }
    for (const colorScheme of ['light', 'dark']) {
      await check({ role: 'manager', locale, width: 390, theme: 'system', colorScheme });
    }
    for (const role of ['admin', 'participant']) {
      for (const width of [320, 1440]) await check({ role, locale, width, theme: 'light' });
    }
  }
  console.log('TEST_ACCOUNT_NAVIGATION_UX_OK');
} finally {
  await browser.close();
}
