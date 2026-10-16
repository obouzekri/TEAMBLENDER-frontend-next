import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  for (const locale of ['fr', 'en']) {
    for (const theme of ['light', 'dark', 'system']) {
      for (const width of [320, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark' });
        try {
          await context.addInitScript(({ locale, theme }) => {
            localStorage.setItem('tb_locale_preference', locale);
            localStorage.setItem('tb_theme', theme);
          }, { locale, theme });
          await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.pathname.includes('/api/')) return route.fulfill({ json: {} });
            if (url.origin !== new URL(baseUrl).origin) return route.abort();
            return route.continue();
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(`${baseUrl}/${locale}/login?mode=login&source=language-test`);
          const cookies = page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true });
          if (await cookies.isVisible()) await cookies.click();
          if (width < 768) await page.locator('.nav-toggle').click();
          const trigger = page.locator('.lang-switch:visible button[aria-haspopup="menu"]').first();
          const menu = page.getByRole('menu');
          const options = page.getByRole('menuitemradio');
          const label = `${locale}/${theme}/${width}`;

          await trigger.click();
          await menu.waitFor();
          assert.equal(await options.count(), 2, label);
          assert.equal(await options.filter({ hasText: 'Fran\u00e7ais' }).count(), 1, label);
          assert.equal(await options.filter({ hasText: 'English' }).count(), 1, label);
          assert.equal(await page.locator('[role="menuitemradio"][aria-checked="true"]').getAttribute('data-locale'), locale, label);
          assert.equal(await options.filter({ hasText: locale === 'fr' ? 'Fran\u00e7ais' : 'English' }).evaluate((node) => node === document.activeElement), true, label);
          assert.equal(await trigger.getAttribute('aria-expanded'), 'true', label);
          const layout = await menu.evaluate((node) => {
            const box = node.getBoundingClientRect();
            return {
              fits: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
              background: getComputedStyle(node).backgroundColor,
              targetHeights: [...node.querySelectorAll('button')].map((button) => button.getBoundingClientRect().height),
            };
          });
          assert.ok(layout.fits, `${label}: menu must fit viewport`);
          assert.ok(layout.targetHeights.every((height) => height >= 44), `${label}: touch targets`);
          assert.equal(layout.background, theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(17, 26, 46)', `${label}: theme`);
          await page.keyboard.press('End');
          assert.equal(await options.last().evaluate((node) => node === document.activeElement), true, label);
          await page.keyboard.press('ArrowDown');
          assert.equal(await options.first().evaluate((node) => node === document.activeElement), true, label);
          await page.keyboard.press('ArrowUp');
          assert.equal(await options.last().evaluate((node) => node === document.activeElement), true, label);
          await page.keyboard.press('Home');
          await page.keyboard.press('Escape');
          assert.equal(await menu.count(), 0, label);
          assert.equal(await trigger.evaluate((node) => node === document.activeElement), true, label);
          await page.keyboard.press('ArrowDown');
          await menu.waitFor();
          await page.keyboard.press('Tab');
          assert.equal(await menu.count(), 0, label);
          await trigger.focus();
          await page.keyboard.press('Space');
          await menu.waitFor();
          await page.locator('main').click({ position: { x: 5, y: 5 } });
          assert.equal(await menu.count(), 0, label);
          await trigger.click();
          await page.locator(`[role="menuitemradio"][data-locale="${locale}"]`).click();
          assert.equal(await menu.count(), 0, label);
          assert.equal(new URL(page.url()).pathname, `/${locale}/login`, label);

          await trigger.focus();
          await page.keyboard.press('Enter');
          const target = locale === 'fr' ? 'en' : 'fr';
          await page.keyboard.press(target === 'en' ? 'End' : 'Home');
          await page.keyboard.press('Enter');
          await page.waitForURL(`**/${target}/login?mode=login&source=language-test`);
          assert.equal(await page.evaluate(() => localStorage.getItem('tb_locale_preference')), target, label);
          assert.equal(await menu.count(), 0, label);
          assert.deepEqual(errors, [], label);
          console.log(`Passed: ${label}`);
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
