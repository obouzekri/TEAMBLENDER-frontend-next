import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const sessions = [
  { id: 42, name: 'Session live', status: 'en_cours', session_date: '2026-10-13T14:00:00Z' },
  { id: 43, name: 'Session prepared', status: 'preparee', session_date: '2026-10-14T14:00:00Z' },
  { id: 44, name: 'Session completed', status: 'terminee' },
  { id: 45, name: 'Session avec un titre tres long '.repeat(8), status: 'preparee' },
];

async function readStyles(card) {
  return card.evaluate((element) => {
    const pick = (target, properties) => {
      const style = getComputedStyle(target);
      return Object.fromEntries(properties.map((property) => [property, style[property]]));
    };
    return {
      card: pick(element, ['backgroundImage', 'borderTopColor', 'borderRadius', 'boxShadow']),
      title: pick(element.querySelector('.session-title'), ['fontSize', 'fontWeight', 'lineHeight']),
      badge: pick(element.querySelector('.status-pill'), ['color', 'backgroundColor', 'borderColor', 'fontSize', 'padding']),
      footer: pick(element.querySelector('.session-card-actions'), ['backgroundImage', 'backgroundColor', 'borderTopColor']),
    };
  });
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});
try {
  for (const locale of ['fr', 'en']) {
    for (const theme of ['light', 'dark', 'system']) {
      for (const width of [390, 1440]) {
        const contexts = [];
        try {
          const pages = [];
          for (const role of ['user', 'participant']) {
            const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark' });
            contexts.push(context);
            await context.addInitScript(({ role, locale, theme }) => {
              sessionStorage.setItem('currentUser', JSON.stringify({ id: 123, role, name: 'Card UX', email: 'cards@example.test' }));
              localStorage.setItem('tb_locale_preference', locale);
              localStorage.setItem('tb_theme', theme);
            }, { role, locale, theme });
            await context.route('**/*', async (route) => {
              const url = new URL(route.request().url());
              if (!url.pathname.includes('/api/')) {
                if (url.origin === new URL(baseUrl).origin) await route.continue();
                else await route.abort();
                return;
              }
              let data = [];
              if (url.pathname.endsWith('/sessions')) data = sessions;
              if (url.pathname.endsWith('/users/me')) data = { id: 123, role, name: 'Card UX' };
              await route.fulfill({ json: data });
            });
            const page = await context.newPage();
            pages.push(page);
            await page.goto(`${baseUrl}/${locale}/${role === 'user' ? 'home' : 'participant'}`);
            await page.locator('.session-card').first().waitFor();
            await page.evaluate((value) => {
              if (value === 'system') document.documentElement.removeAttribute('data-theme');
              else document.documentElement.dataset.theme = value;
            }, theme);
          }
          const [home, participant] = pages;
          for (let index = 0; index < 3; index += 1) {
            const reference = home.locator('.session-card').filter({ hasText: sessions[index].name });
            const card = participant.locator('.participant-session-card').nth(index);
            assert.deepEqual(await readStyles(card), await readStyles(reference), `${locale}/${theme}/${width}: shared card styles (${sessions[index].status})`);
          }
          assert.equal(await participant.locator('.participant-session-card__cta').count(), 1);
          assert.equal(await participant.locator('.participant-session-card__waiting-status').count(), 3);
          const join = participant.locator('.participant-session-card__cta');
          await join.waitFor({ state: 'visible' });
          assert.equal(await join.isEnabled(), true);
          assert.equal(await join.textContent().then((text) => text.trim()), locale === 'fr' ? 'Rejoindre' : 'Join');
          const box = await join.boundingBox();
          assert.ok(box.height >= 44, 'Join target must be at least 44px tall');
          assert.equal(await participant.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
          assert.equal(await participant.locator('.participant-session-card__name').last().evaluate((element) => element.scrollWidth > element.clientWidth), false, 'Long titles wrap');
          console.log(`PASS participant session cards ${locale}/${theme}/${width}`);
        } finally {
          for (const context of contexts) await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
