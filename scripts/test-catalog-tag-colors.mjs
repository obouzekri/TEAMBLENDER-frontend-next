import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const challenges = [{
  id: 101,
  name: 'Catalog color fixture',
  category: 'culture-decouverte',
  objectives: 'collaboration,communication,intelligence-collective',
  duration: 20,
  recommended_team_size: 4,
  description: 'A collaborative challenge.',
}];
const session = {
  id: 42,
  name: 'Catalog tags',
  challenges: [],
  assigned_participants: [],
  code: 'UXTEST',
};
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});

try {
  for (const locale of ['fr', 'en']) {
    for (const [theme, colorScheme] of [
      ['light', 'dark'],
      ['dark', 'light'],
      ['system', 'light'],
      ['system', 'dark'],
    ]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        colorScheme,
      });
      await context.addInitScript(({ locale, theme }) => {
        sessionStorage.setItem('jwt', 'local-ux-fixture');
        sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: 'manager' }));
        localStorage.setItem('tb_locale_preference', locale);
        localStorage.setItem('tb_theme', theme);
      }, { locale, theme });
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/api/')) {
          let data = [];
          if (/\/challenges$/.test(url.pathname)) data = challenges;
          else if (/\/sessions\/42(?:\/invite)?$/.test(url.pathname)) data = session;
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
      await page.goto(`${baseUrl}/${locale}/session-builder?sessionId=42`);
      await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
      const card = page.locator('[data-catalog] [class*="card"]').filter({
        has: page.getByRole('heading', { name: challenges[0].name, exact: true }),
      }).filter({ has: page.locator('[class*="cardMeta"]') });
      await card.waitFor();

      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const tags = await card.locator('[class*="playerHint"], [class*="badge"]').evaluateAll((items) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const rgba = (color) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            return [...ctx.getImageData(0, 0, 1, 1).data];
          };
          const composite = (foreground, background) =>
            foreground.slice(0, 3).map((value, i) =>
              value * foreground[3] / 255 + background[i] * (1 - foreground[3] / 255)
            );
          const luminance = (rgb) => rgb.reduce((sum, value, i) => {
            const channel = value / 255;
            return sum + [0.2126, 0.7152, 0.0722][i] *
              (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
          }, 0);
          return items.map((item) => {
            const style = getComputedStyle(item);
            const background = rgba(style.backgroundColor);
            let surface = [255, 255, 255];
            const ancestors = [];
            for (let parent = item.parentElement; parent; parent = parent.parentElement) {
              ancestors.unshift(parent);
            }
            for (const parent of ancestors) {
              surface = composite(rgba(getComputedStyle(parent).backgroundColor), surface);
            }
            const painted = composite(background, surface);
            const text = composite(rgba(style.color), painted);
            const light = luminance(text);
            const dark = luminance(painted);
            const rect = item.getBoundingClientRect();
            return {
              label: item.textContent,
              accent: style.getPropertyValue('--tag-accent').trim(),
              alpha: background[3] / 255,
              contrast: (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05),
              fits: rect.left >= 0 && rect.right <= innerWidth && item.scrollWidth <= item.clientWidth + 1,
              borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
            };
          });
        });
        assert.equal(tags.length, 6, 'Players, duration, category and three objectives are visible');
        assert.equal(new Set(tags.map((tag) => tag.accent)).size, 4, 'Each tag family has its own color');
        for (const tag of tags) {
          const label = `${locale}/${theme}/${colorScheme}/${width}: ${tag.label}`;
          assert.ok(tag.alpha >= 0.08 && tag.alpha <= 0.12, `${label}: translucent fill`);
          assert.ok(tag.contrast >= 4.5, `${label}: text contrast ${tag.contrast.toFixed(2)}`);
          assert.ok(tag.fits, `${label}: fits the viewport without clipping`);
          assert.deepEqual(tag.borders, ['1px', '1px', '1px', '1px'], `${label}: uniform border`);
        }
      }
      await card.getByRole('button', { name: locale === 'fr' ? 'Ajouter' : 'Add', exact: true }).click();
      await card.getByRole('button', { name: locale === 'fr' ? 'Retirer' : 'Remove', exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log(`CATALOG_TAG_COLORS_OK ${locale} ${theme} (${colorScheme})`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
