import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  for (const locale of ['fr', 'en']) {
    const fixture = await createRealtimeFixture(browser, {
      baseUrl, locale, role: 'user', engineKey: 'copuzzle_live_v1', state: { config: {} },
    });
    try {
      const page = await fixture.context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseUrl}/${locale}/home`);
      const controls = page.locator('.home-sessions-control');
      await controls.first().waitFor();
      await page.locator('.manager-onboarding-close').click();
      await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
      for (const width of [320, 390, 640, 768, 960, 1024, 1440, 1755]) {
        await page.setViewportSize({ width, height: 1000 });
        const layout = await page.locator('.home-sessions-filters').evaluate((grid) => {
          const bounds = grid.getBoundingClientRect();
          return {
            gap: parseFloat(getComputedStyle(grid).columnGap),
            overflow: grid.scrollWidth > grid.clientWidth,
            controls: [...grid.querySelectorAll('input, select')].map((control) => {
              const rect = control.getBoundingClientRect();
              const field = control.parentElement.getBoundingClientRect();
              const style = getComputedStyle(control);
              return {
                inside: rect.left >= bounds.left && rect.right <= bounds.right + 1
                  && rect.left >= field.left && rect.right <= field.right + 1,
                paddingLeft: parseFloat(style.paddingLeft),
                paddingRight: parseFloat(style.paddingRight),
                height: rect.height,
              };
            }),
          };
        });
        assert.equal(layout.controls.length, 4);
        assert.ok(layout.gap >= 16, 'Keep space between adjacent filters');
        assert.equal(layout.overflow, false, 'Filters must not overflow');
        for (const control of layout.controls) {
          assert.ok(control.inside, 'Control must stay inside its field and filter frame');
          assert.ok(control.paddingLeft >= 16 && control.paddingRight >= 16, 'Text and date icons need inner spacing');
          assert.ok(control.height >= 42);
        }
        process.stdout.write(`PASS home session filters ${locale}/${width}\n`);
      }
      await controls.nth(0).fill('Workshop');
      await controls.nth(1).selectOption('preparee');
      await controls.nth(2).fill('2026-10-01');
      await controls.nth(3).fill('2026-10-31');
      assert.equal(await controls.nth(0).inputValue(), 'Workshop');
      assert.equal(await controls.nth(2).inputValue(), '2026-10-01');
      assert.equal(await controls.nth(3).inputValue(), '2026-10-31');
      await page.getByRole('button', { name: locale === 'en' ? 'Reset filters' : /initialiser les filtres/ }).click();
      assert.equal(await controls.nth(0).inputValue(), '');
      assert.equal(await controls.nth(1).inputValue(), 'all');
      assert.equal(await controls.nth(2).inputValue(), '');
      assert.equal(await controls.nth(3).inputValue(), '');
      assert.deepEqual(errors, [], 'No browser runtime errors');
    } finally {
      await fixture.close();
    }
  }
} finally {
  await browser.close();
}
