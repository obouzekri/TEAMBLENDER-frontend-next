import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});

try {
  for (const role of ['manager', 'admin', 'participant']) {
    for (const locale of ['fr', 'en']) {
      for (const mobile of [false, true]) {
        console.log(`Checking account security: ${role}, ${locale}, ${mobile ? 'mobile' : 'desktop'}`);
        const account = (locale === 'fr' ? fr : en).account;
        const user = {
          id: 1,
          role,
          first_name: 'Security',
          last_name: 'Fixture',
          email: 'security-fixture@example.test',
          two_factor_enabled: true,
          mfa_enabled: true,
          city: 'Casablanca',
          country: 'MA',
        };
        const context = await browser.newContext({
          locale,
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
          isMobile: mobile,
          hasTouch: mobile,
        });
        try {
          await context.addInitScript(({ user, locale }) => {
            sessionStorage.setItem('jwt', 'local-account-fixture');
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('tb_locale_preference', locale);
          }, { user, locale });
          const writes = [];
          const passwordPath = role === 'participant' ? '/participants/me/password' : '/users/me/password';
          await context.route('**/*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.pathname.includes('/api/')) {
              if (!['GET', 'HEAD'].includes(request.method())) {
                writes.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
              }
              let data = [];
              if (/\/(users|participants)\/me$/.test(url.pathname)) data = user;
              else if (url.pathname.endsWith('/auth/csrf-token')) data = { csrfToken: 'local-csrf-fixture' };
              else if (url.pathname.endsWith(passwordPath)) data = { message: 'Password updated' };
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
          await page.goto(`${baseUrl}/${locale}/account?tab=security`);
          const panel = page.locator('#account-security');
          const twoFactor = panel.getByRole('button', { name: account.enableTwoFactor, exact: true });
          const signOut = panel.getByRole('button', { name: account.signOutOtherDevices, exact: true });
          for (let pass = 0; pass < 2; pass += 1) {
            await twoFactor.waitFor();
            assert.ok(await twoFactor.isDisabled());
            assert.ok(await signOut.isDisabled());
            assert.equal(await twoFactor.getAttribute('aria-describedby'), 'account-two-factor-unavailable');
            assert.equal(await signOut.getAttribute('aria-describedby'), 'account-sessions-unavailable');
            assert.equal(await panel.locator('#account-two-factor-unavailable').textContent(), account.twoFactorUnavailable);
            assert.equal(await panel.locator('#account-sessions-unavailable').textContent(), account.sessionsUnavailable);
            assert.equal(await panel.locator('.account-2fa-status strong').textContent(), account.unavailable);
            assert.equal(await panel.locator('.account-session-item').count(), 0);
            assert.doesNotMatch(await panel.innerText(), /iPhone Safari|Casablanca|Navigateur desktop/);
            assert.ok(await panel.getByRole('button', { name: account.changePassword, exact: true }).isEnabled());
            // Native disabled controls must not dispatch the previous fake success actions.
            await twoFactor.evaluate((button) => button.click());
            await signOut.evaluate((button) => button.click());
            assert.deepEqual(writes, []);
            assert.equal(await panel.getByText(account.enabled, { exact: true }).count(), 0);
            assert.deepEqual(errors, []);
            if (pass === 0) await page.reload();
          }

          await panel.locator('#account-current-password').fill('Old-fixture-123!');
          await panel.locator('#account-new-password').fill('New-fixture-123!');
          await panel.locator('#account-confirm-password').fill('New-fixture-123!');
          const passwordResponse = page.waitForResponse((response) =>
            response.url().endsWith(passwordPath) && response.request().method() === 'PATCH');
          await panel.getByRole('button', { name: account.changePassword, exact: true }).click();
          assert.ok((await passwordResponse).ok());
          await page.getByText(account.passwordUpdated, { exact: true }).waitFor();
          assert.deepEqual(writes, [{
            path: `/api${passwordPath}`,
            method: 'PATCH',
            body: { current_password: 'Old-fixture-123!', new_password: 'New-fixture-123!' },
          }]);
          assert.equal(await panel.locator('#account-new-password').inputValue(), '');
          assert.deepEqual(errors, []);
        } finally {
          await context.close();
        }
      }
    }
  }
  console.log('TEST_ACCOUNT_SECURITY_UX_OK');
} finally {
  await browser.close();
}
