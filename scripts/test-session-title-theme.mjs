import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const session = { id: 42, owner_id: 1, name: 'Session title theme', status: 'en_cours', challenges: [], assigned_participants: [] };
const cases = [
  { theme: 'light', system: 'light', color: 'rgb(15, 23, 42)' },
  { theme: 'light', system: 'dark', color: 'rgb(15, 23, 42)' },
  { theme: 'dark', system: 'light', color: 'rgb(203, 216, 242)' },
  { theme: 'dark', system: 'dark', color: 'rgb(203, 216, 242)' },
  { theme: 'system', system: 'light', color: 'rgb(15, 23, 42)' },
  { theme: 'system', system: 'dark', color: 'rgb(203, 216, 242)' },
  { theme: 'system', system: 'light', cssFallback: true, color: 'rgb(15, 23, 42)' },
  { theme: 'system', system: 'dark', cssFallback: true, color: 'rgb(242, 246, 255)' },
];

async function titleColor(page, title, { theme, system, cssFallback = false }) {
  await page.emulateMedia({ colorScheme: system });
  await page.evaluate((value) => {
    localStorage.setItem('tb_theme', value);
    window.dispatchEvent(new Event('storage'));
  }, theme);
  assert.equal(await title.count(), 1, `Title must remain visible at ${page.url()}: ${await page.locator('body').innerText()}`);
  return title.evaluate((element, fallback) => {
    if (fallback) document.documentElement.removeAttribute('data-theme');
    return getComputedStyle(element).color;
  }, cssFallback);
}

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const width of [390, 1440]) {
    const fixture = await createRealtimeFixture(browser, {
      baseUrl, locale: 'fr', role: 'user', engineKey: 'copuzzle_live_v1',
      viewport: { width, height: 900 }, state: { config: {}, timer: { status: 'idle' } },
    });
    try {
      await fixture.context.route('**/api/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/sessions')) return route.fulfill({ json: [session] });
        if (path.endsWith('/sessions/42')) return route.fulfill({ json: session });
        if (path.endsWith('/participant-management')) {
          return route.fulfill({ json: { participants: [], active_challenge_id: null, can_remove_current: false } });
        }
        if (path.endsWith('/sessions/42/state')) {
          return route.fulfill({ json: { status: 'en_cours', active_challenge_id: null, challenges: [] } });
        }
        return route.fallback();
      });
      const page = await fixture.context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseUrl}/fr/home`);
      const homeTitle = page.locator('.session-card-body .session-title').filter({ hasText: session.name });
      await homeTitle.waitFor();
      const reference = [];
      for (const testCase of cases) {
        const color = await titleColor(page, homeTitle, testCase);
        assert.equal(color, testCase.color, `Home ${width}/${testCase.theme}/${testCase.system}`);
        reference.push(color);
      }
      const live = await fixture.context.newPage();
      live.on('pageerror', (error) => errors.push(error.message));
      await live.goto(`${baseUrl}/fr/session-live/42`);
      const liveTitle = live.locator('strong[title]').filter({ hasText: session.name });
      await liveTitle.waitFor();
      for (const [index, testCase] of cases.entries()) {
        assert.equal(await titleColor(live, liveTitle, testCase), reference[index],
          `Live title must match home ${width}/${testCase.theme}/${testCase.system}/${testCase.cssFallback ? 'CSS' : 'controller'}`);
        process.stdout.write(`PASS session title ${width}/${testCase.theme}/${testCase.system}/${testCase.cssFallback ? 'CSS' : 'controller'}\n`);
      }
      assert.deepEqual(errors, [], 'No browser runtime errors');
    } finally {
      await fixture.close();
    }
  }
} finally {
  await browser.close();
}
