import assert from 'node:assert/strict';
import path from 'node:path';
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
      let totalPages = 1;
      const queries = [];
      await fixture.context.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        if (!url.pathname.endsWith('/sessions')) return route.fallback();
        const page = Number(url.searchParams.get('page') || 1);
        queries.push(Object.fromEntries(url.searchParams));
        return route.fulfill({
          json: {
            items: [{ id: 42, name: 'Workshop', status: 'preparee' }],
            pagination: {
              page, totalPages, total: totalPages, limit: 12,
              hasNextPage: page < totalPages, hasPrevPage: page > 1,
            },
          },
        });
      });
      const page = await fixture.context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseUrl}/${locale}/home`);
      const controls = page.locator('input.home-sessions-control, select.home-sessions-control');
      await controls.first().waitFor();
      await page.locator('.manager-onboarding-close').click();
      await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
      const period = page.locator('.home-sessions-period-toggle');
      const dateFilters = page.locator('#home-sessions-period');
      assert.equal(await period.getAttribute('aria-expanded'), 'false');
      assert.equal(await dateFilters.isVisible(), false);
      if (process.env.UX_SCREENSHOT_DIR) {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.screenshot({ path: path.join(process.env.UX_SCREENSHOT_DIR, `home-${locale}-light.png`), fullPage: true });
      }
      assert.equal(await page.locator('.home-sessions-pagination').count(), 0);
      assert.equal(await page.locator('.home-sessions-clear').count(), 0);
      await period.focus();
      await page.keyboard.press('Enter');
      assert.equal(await period.getAttribute('aria-expanded'), 'true');
      for (const width of [320, 390, 640, 768, 960, 1024, 1440, 1755]) {
        await page.setViewportSize({ width, height: 1000 });
        const layout = await page.locator('.home-sessions-controls').evaluate((grid) => {
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
        assert.equal(
          await page.locator('.home-sessions-controls').evaluate((element) => getComputedStyle(element).borderTopWidth),
          '0px',
          'Filters must not have an outer frame',
        );
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
      const periodResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname.endsWith('/sessions') && url.searchParams.get('to') === '2026-10-31';
      });
      await controls.nth(3).fill('2026-10-31');
      await periodResponse;
      assert.equal(await controls.nth(0).inputValue(), 'Workshop');
      assert.equal(await controls.nth(2).inputValue(), '2026-10-01');
      assert.equal(await controls.nth(3).inputValue(), '2026-10-31');
      assert.match(await period.innerText(), /2026/);
      await period.click();
      assert.equal(await dateFilters.isVisible(), false);
      assert.equal(await controls.nth(2).inputValue(), '2026-10-01', 'Collapsing dates preserves the filter');
      assert.ok(queries.some((query) => query.from === '2026-10-01' && query.to === '2026-10-31'));
      await page.getByRole('button', { name: locale === 'en' ? 'Reset filters' : /initialiser les filtres/ }).click();
      assert.equal(await controls.nth(0).inputValue(), '');
      assert.equal(await controls.nth(1).inputValue(), 'all');
      assert.equal(await controls.nth(2).inputValue(), '');
      assert.equal(await controls.nth(3).inputValue(), '');
      assert.equal(await page.locator('.home-sessions-clear').count(), 0);
      totalPages = 2;
      await controls.nth(0).fill('Workshop');
      const pagination = page.locator('.home-sessions-pagination');
      await pagination.waitFor();
      const previous = pagination.getByRole('button', { name: locale === 'en' ? 'Previous' : 'Précédent' });
      const next = pagination.getByRole('button', { name: locale === 'en' ? 'Next' : 'Suivant' });
      assert.equal(await previous.isDisabled(), true);
      await next.click();
      await page.waitForFunction(() => document.querySelector('.home-sessions-pagination')?.textContent.includes('2 / 2'));
      assert.equal(await next.isDisabled(), true);
      assert.equal(await previous.isDisabled(), false);
      await previous.click();
      await page.waitForFunction(() => document.querySelector('.home-sessions-pagination')?.textContent.includes('1 / 2'));
      for (const colorTheme of ['light', 'dark', 'system']) {
        await page.emulateMedia({ colorScheme: colorTheme === 'light' ? 'light' : 'dark' });
        await page.evaluate((value) => {
          localStorage.setItem('tb_theme', value);
          window.dispatchEvent(new Event('storage'));
        }, colorTheme);
        const visual = await page.locator('.manager-home').evaluate((main) => ({
          titles: [...main.querySelectorAll('.home-section-title')].map((heading) => getComputedStyle(heading).backgroundImage),
          backgrounds: [...main.querySelectorAll('.session-card')].map((card) => getComputedStyle(card).backgroundImage),
          innerScroll: [...main.querySelectorAll('.sessions-panel, .participants-panel')].some((panel) => getComputedStyle(panel).overflowY === 'auto'),
          canvas: getComputedStyle(document.documentElement).backgroundColor,
        }));
        assert.ok(visual.titles.every((image) => image.includes('gradient')), 'Section titles retain product colors');
        assert.ok(visual.backgrounds.every((image) => image === 'none'), 'Cards retain neutral surfaces');
        assert.equal(visual.innerScroll, false, 'Use one natural page scroll');
        assert.equal(visual.canvas === 'rgb(255, 255, 255)', colorTheme === 'light');
      }
      assert.deepEqual(errors, [], 'No browser runtime errors');
    } finally {
      await fixture.close();
    }
  }
} finally {
  await browser.close();
}
