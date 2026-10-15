import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  for (const locale of ['fr', 'en']) {
    for (const theme of ['light', 'dark', 'system']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        colorScheme: theme === 'light' ? 'light' : 'dark',
      });
      try {
        await context.addInitScript(({ language, colorTheme }) => {
          localStorage.setItem('tb_locale_preference', language);
          localStorage.setItem('tb_theme', colorTheme);
        }, { language: locale, colorTheme: theme });
        await context.route('**/*', async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname.endsWith('/pricing-plans')) {
            return route.fulfill({ json: [{
              id: 1, name: 'Pro', slug: 'pro', billing_cycle: 'monthly',
              price_mad_cents: 39000, annual_price_mad_cents: 374400,
            }] });
          }
          if (url.pathname.includes('/api/')) return route.fulfill({ json: {} });
          if (url.origin !== new URL(baseUrl).origin) return route.abort();
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/pricing`);
        await page.locator('.pricing-controls').waitFor();
        await page.waitForFunction(() => document.querySelector('.pricing-price')?.textContent.includes('390 DH'));
        assert.equal(await page.locator('.pricing-hero .eyebrow, .pricing-hero__lede').count(), 0);
        assert.equal(await page.locator('.pricing-hero h1').count(), 1);
        assert.equal(await page.locator('.pricing-hero__context').count(), 1);

        for (const width of [320, 390, 640, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const layout = await page.locator('.pricing-controls').evaluate((element) => {
            const nodes = [...element.querySelectorAll('.pricing-controls__label, .toggle-btn, label, select')];
            return {
              overflow: document.documentElement.scrollWidth > window.innerWidth,
              centers: nodes.map((node) => {
                const box = node.getBoundingClientRect();
                return box.y + box.height / 2;
              }),
              controlsFit: [...element.querySelectorAll('button, select')].every((node) => {
                const box = node.getBoundingClientRect();
                return box.left >= 0 && box.right <= window.innerWidth && box.height >= 44;
              }),
              surfaces: [element, element.querySelector('.pricing-controls__row'), element.querySelector('.toggle-group')].map((node) => {
                const style = getComputedStyle(node);
                return { border: style.borderWidth, background: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow };
              }),
            };
          });
          const label = `${locale}/${theme}/${width}`;
          assert.equal(layout.overflow, false, `${label}: horizontal overflow`);
          assert.ok(layout.controlsFit, `${label}: controls must fit and remain touch accessible`);
          if (width >= 768) {
            assert.ok(Math.max(...layout.centers) - Math.min(...layout.centers) < 2, `${label}: controls must share one line`);
          }
          if (theme !== 'light') {
            for (const surface of layout.surfaces) {
              assert.equal(surface.border, '0px', `${label}: unwanted frame`);
              assert.equal(surface.background, 'rgba(0, 0, 0, 0)', `${label}: unwanted background`);
              assert.equal(surface.image, 'none');
              assert.equal(surface.shadow, 'none', `${label}: unwanted shadow`);
            }
          }
        }
        const monthly = page.getByRole('button', { name: locale === 'en' ? 'Monthly' : 'Mensuel', exact: true });
        const annual = page.getByRole('button', { name: locale === 'en' ? 'Yearly -20%' : 'Annuel -20%', exact: true });
        await annual.click();
        assert.equal(await annual.getAttribute('aria-pressed'), 'true');
        assert.equal(await monthly.getAttribute('aria-pressed'), 'false');
        assert.match(await page.locator('.pricing-price').textContent(), /3744 DH\s*\/(an|year)/);
        const currency = page.getByRole('combobox', { name: locale === 'en' ? 'Currency' : 'Devise', exact: true });
        await currency.selectOption('EUR');
        assert.match(await page.locator('.pricing-price').textContent(), /344 €/);
        await monthly.click();
        assert.match(await page.locator('.pricing-price').textContent(), /36 €\s*\/(mois|month)/);
        await currency.selectOption('MAD');
        assert.match(await page.locator('.pricing-price').textContent(), /390 DH/);
        assert.deepEqual(errors, []);
        console.log(`PASS pricing controls: ${locale}/${theme}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
