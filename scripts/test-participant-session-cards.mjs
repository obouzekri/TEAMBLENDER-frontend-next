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
      title: pick(element.querySelector('.session-title'), ['color', 'fontSize', 'fontWeight', 'lineHeight']),
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
    for (const [theme, colorScheme] of [['light', 'light'], ['dark', 'dark'], ['system', 'light'], ['system', 'dark']]) {
      for (const width of [320, 390, 1440]) {
        const contexts = [];
        try {
          const pages = [];
          for (const role of ['user', 'participant']) {
            const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
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
          const headingStyles = (heading) => heading.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              color: style.color,
              backgroundImage: style.backgroundImage,
              backgroundClip: style.backgroundClip,
              textFillColor: style.webkitTextFillColor,
            };
          });
          const heading = participant.locator('.participant-sessions-title');
          assert.equal(await heading.textContent(), locale === 'fr' ? 'Sessions assignées' : 'Assigned sessions');
          for (const reference of await home.locator('.home-section-title').all()) {
            assert.deepEqual(await headingStyles(heading), await headingStyles(reference), 'Assigned sessions heading matches home headings');
          }
          const accents = [];
          for (let index = 0; index < 3; index += 1) {
            const reference = home.locator('.session-card').filter({ hasText: sessions[index].name });
            const card = participant.locator('.participant-session-card').nth(index);
            const actual = await readStyles(card);
            const expected = await readStyles(reference);
            assert.deepEqual(actual.title, expected.title, 'Shared session title styles');
            assert.deepEqual(actual.badge, expected.badge, 'Shared session status styles');
            assert.equal(actual.card.borderRadius, expected.card.borderRadius, 'Shared card shape');
            accents.push(await card.evaluate((element) => getComputedStyle(element, '::before').backgroundImage));
          }
          assert.equal(new Set(accents).size, 3, 'Each session status has a distinct accent');
          assert.ok(accents.every((accent) => accent.includes('linear-gradient')), 'Status accents are visible');
          assert.equal(await participant.locator('.participant-session-card__cta').count(), 1);
          assert.equal(await participant.locator('.participant-session-card__waiting-status').count(), 3);
          const join = participant.locator('.participant-session-card__cta');
          await join.waitFor({ state: 'visible' });
          assert.equal(await join.isEnabled(), true);
          assert.equal(await join.textContent().then((text) => text.trim()), locale === 'fr' ? 'Rejoindre' : 'Join');
          const box = await join.boundingBox();
          assert.ok(box.height >= 44, 'Join target must be at least 44px tall');
          assert.ok(box.height <= 45, `Join button stays compact: ${box.height}px`);
          assert.equal(await participant.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
          assert.equal(await participant.locator('.participant-session-card__name').last().evaluate((element) => element.scrollWidth > element.clientWidth), false, 'Long titles wrap');
          await participant.emulateMedia({ forcedColors: 'active' });
          const forcedHeading = await headingStyles(heading);
          assert.equal(forcedHeading.backgroundImage, 'none', 'Forced colors remove the heading gradient');
          assert.notEqual(forcedHeading.textFillColor, 'rgba(0, 0, 0, 0)', 'Forced colors keep the heading readable');
          console.log(`PASS participant session cards ${locale}/${theme}/${colorScheme}/${width}`);
        } finally {
          for (const context of contexts) await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
