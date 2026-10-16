import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});
const user = { id: 1, role: 'admin', first_name: 'Admin', email: 'admin@example.test' };
const challenge = {
  id: 101, name: 'Theme fixture', type: 'equipe', status: 'actif', source: 'local',
  category: 'logique-reflexion', objectives: 'cohesion, communication, collaboration',
  engine_key: 'local_page_v1', duration: '15 min', description: 'Theme contrast fixture',
  engine_config: {},
};

async function checkContrast(form, label, dark) {
  const result = await form.evaluate((element) => {
    const rgba = (value) => {
      const numbers = value.match(/[\d.]+/g)?.map(Number) || [];
      return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1];
    };
    const blend = (front, back) => front.slice(0, 3).map((value, i) =>
      value * front[3] + back[i] * (1 - front[3]));
    const backgrounds = (node) => {
      if (!node) return [[255, 255, 255]];
      const style = getComputedStyle(node);
      const base = backgrounds(node.parentElement).map((color) => blend(rgba(style.backgroundColor), color));
      const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
      return stops ? stops.flatMap((stop) => base.map((color) => blend(rgba(stop), color))) : base;
    };
    const luminance = (color) => color.slice(0, 3).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    const nodes = [...element.querySelectorAll('label, input, select, textarea, .session-meta, .admin-objective-chip')]
      .filter((node) => node.getClientRects().length && !['checkbox', 'radio', 'hidden'].includes(node.type));
    return {
      background: getComputedStyle(element).backgroundImage,
      lightness: Math.max(...backgrounds(element).map(luminance)),
      text: nodes.map((node) => {
        const style = getComputedStyle(node);
        const ratios = backgrounds(node).map((background) => {
          const text = luminance(blend(rgba(style.color), background));
          const surface = luminance(background);
          return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
        });
        return { name: node.textContent.trim().slice(0, 32) || node.tagName, ratio: Math.min(...ratios), opacity: style.opacity };
      }),
    };
  });
  if (dark) assert.ok(result.lightness < 0.1, `${label}: form must not retain a light background`);
  else assert.ok(result.lightness > 0.8, `${label}: light form must stay light`);
  for (const text of result.text) {
    assert.ok(text.ratio >= 4.5, `${label}: ${text.name} contrast ${text.ratio.toFixed(2)} < 4.5`);
    assert.equal(text.opacity, '1', `${label}: ${text.name} must not fade its text`);
  }
  return result.background;
}

try {
  for (const locale of ['fr', 'en']) {
    for (const width of [390, 1440]) {
      let lightBackground;
      for (const [theme, colorScheme] of [['light', 'light'], ['dark', 'light'], ['system', 'dark'], ['light', 'dark']]) {
        const label = `${locale}/${width}px/${theme}/${colorScheme}`;
        const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme });
        try {
          await context.addInitScript(({ locale, theme, user }) => {
            sessionStorage.setItem('jwt', 'local-admin-theme-fixture');
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('tb_locale_preference', locale);
            localStorage.setItem('tb_theme', theme);
          }, { locale, theme, user });
          const writes = [];
          await context.route('**/*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.pathname.includes('/api/')) {
              if (!['GET', 'HEAD'].includes(request.method())) {
                writes.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
              }
              let data = [];
              if (url.pathname.endsWith('/users/me')) data = user;
              else if (url.pathname.endsWith('/auth/csrf-token')) data = { csrfToken: 'local-admin-csrf' };
              else if (url.pathname.endsWith('/challenges')) data = [challenge];
              else if (url.pathname.endsWith(`/challenges/${challenge.id}`)) data = challenge;
              else if (url.pathname.endsWith('/users')) data = [user];
              return route.fulfill({ json: data });
            }
            if (url.origin !== new URL(baseUrl).origin) return route.abort();
            return route.continue();
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(`${baseUrl}/${locale}/admin?tab=challenges`);
          const item = page.locator('.session-item').filter({ hasText: challenge.name });
          await item.waitFor();
          const rejectCookies = page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true });
          if (await rejectCookies.isVisible()) await rejectCookies.click();
          await item.getByRole('button', { name: locale === 'en' ? 'Edit challenge' : 'Modifier challenge', exact: true }).click();
          const form = page.locator('.admin-console-layout form.auth-form');
          await form.waitFor();
          const background = await checkContrast(form, `${label}/edit`, theme !== 'light');
          if (theme === 'light') {
            if (colorScheme === 'light') lightBackground = background;
            else assert.equal(background, lightBackground, `${label}: explicit light must override dark system`);
          }
          const chips = form.locator('.admin-objective-chip');
          assert.equal(await form.locator('.admin-objective-chip[aria-pressed="true"]').count(), 3);
          assert.equal(await form.locator('.admin-objective-chip:disabled').count(), 5);
          await chips.first().focus();
          await chips.first().press('Space');
          assert.equal(await form.locator('.admin-objective-chip:disabled').count(), 0);
          await checkContrast(form, `${label}/available`, theme !== 'light');
          await form.getByRole('button', { name: locale === 'en' ? 'Save' : 'Enregistrer', exact: true }).click();
          await form.waitFor({ state: 'detached' });
          const saved = writes.find((write) => write.path.endsWith(`/challenges/${challenge.id}`) && write.method === 'PUT');
          assert.ok(saved, `${label}: save must reach the API`);
          assert.equal(saved.body.objectives, 'communication, collaboration');
          assert.equal(saved.body.name, challenge.name);
          await page.getByRole('button', { name: locale === 'en' ? 'Add challenge' : 'Ajouter un challenge', exact: true }).click();
          await form.waitFor();
          assert.equal(await form.locator('.admin-objective-chip[aria-pressed="true"]').count(), 0);
          await checkContrast(form, `${label}/create`, theme !== 'light');
          for (let i = 0; i < 3; i += 1) await chips.nth(i).click();
          assert.equal(await form.locator('.admin-objective-chip[aria-pressed="true"]').count(), 3);
          assert.equal(await form.locator('.admin-objective-chip:disabled').count(), 5);
          await checkContrast(form, `${label}/limit`, theme !== 'light');
          assert.deepEqual(errors, [], `${label}: runtime errors`);
          console.log(`PASS admin theme: ${label}, contrast >= 4.5:1, creation/editing, three-objective limit and save`);
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
