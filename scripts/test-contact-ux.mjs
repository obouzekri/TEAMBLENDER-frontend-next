import assert from 'node:assert/strict';
import path from 'node:path';
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
        await context.addCookies([{ name: 'tb_csrf', value: 'contact-ux-token', url: baseUrl }]);
        const submissions = [];
        let responseStatus = 429;
        let releaseResponse;
        let requestReceived;
        await context.route('**/*', async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.pathname.endsWith('/api/contact') && request.method() === 'POST') {
            submissions.push({ body: request.postDataJSON(), headers: request.headers() });
            requestReceived();
            await new Promise((resolve) => { releaseResponse = resolve; });
            if (responseStatus === 0) return route.abort('failed');
            return route.fulfill({ status: responseStatus, json: { success: responseStatus === 200 } });
          }
          if (url.pathname.includes('/api/')) return route.fulfill({ json: {} });
          if (url.origin !== new URL(baseUrl).origin) return route.abort();
          return route.continue();
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/contact`);
        const form = page.locator('.contact-form');
        await form.waitFor();
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        assert.equal(await page.locator('main form').count(), 1);
        assert.equal(await page.locator('.contact-panel').count(), 1);
        assert.equal(await page.locator('.contact-layout, .contact-info-card').count(), 0);
        const emailLink = page.getByRole('link', { name: 'contact@teamblender.io', exact: true });
        assert.equal(await emailLink.getAttribute('href'), 'mailto:contact@teamblender.io');
        const contrast = await emailLink.evaluate((element) => {
          const luminance = (color) => {
            const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
              const channel = Number(value) / 255;
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const foreground = luminance(getComputedStyle(element).color);
          const background = luminance(getComputedStyle(element.closest('.contact-panel')).backgroundColor);
          return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        });
        assert.ok(contrast >= 4.5, `Contact email must meet WCAG AA contrast: ${contrast}`);
        assert.equal(await form.locator('a').getAttribute('href'), `/${locale}/confidentialite`);
        const name = page.getByRole('textbox', { name: locale === 'en' ? 'Full name *' : 'Nom complet *', exact: true });
        const email = page.getByRole('textbox', { name: locale === 'en' ? 'Work email *' : 'Email professionnel *', exact: true });
        const company = page.getByRole('textbox', { name: locale === 'en' ? 'Company (optional)' : 'Entreprise (facultatif)', exact: true });
        const companySize = form.locator('select').first();
        const need = form.locator('select').last();
        const message = page.getByRole('textbox', { name: 'Message *', exact: true });
        const submit = form.locator('button[type="submit"]');
        assert.equal(await submit.textContent(), locale === 'en' ? 'Send my request' : 'Envoyer ma demande');
        assert.equal(await name.getAttribute('autocomplete'), 'name');
        assert.equal(await email.getAttribute('autocomplete'), 'email');
        assert.equal(await company.getAttribute('autocomplete'), 'organization');
        assert.equal(await company.getAttribute('required'), null);
        assert.equal(await companySize.getAttribute('required'), null);
        assert.equal(await form.locator('.contact-form__hp input').getAttribute('tabindex'), '-1');

        for (const width of [320, 390, 640, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const layout = await form.evaluate((element) => {
            const panel = element.closest('.contact-panel').getBoundingClientRect();
            const fields = [...element.querySelectorAll('input:not([tabindex="-1"]), select, textarea, button')];
            return {
              overflow: document.documentElement.scrollWidth > window.innerWidth,
              columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
              mainHeight: element.closest('main').getBoundingClientRect().height,
              panelHeight: panel.height,
              controls: fields.map((field) => {
                const bounds = field.getBoundingClientRect();
                return { height: bounds.height, inside: bounds.left >= panel.left && bounds.right <= panel.right + 1 };
              }),
            };
          });
          assert.equal(layout.overflow, false, `${locale}/${theme}/${width}: horizontal overflow`);
          assert.equal(layout.columns, width <= 640 ? 1 : 2);
          assert.ok(layout.controls.every((control) => control.inside && control.height >= 44), 'Controls must fit and remain touch accessible');
          if (width === 1440) {
            assert.ok(layout.mainHeight < 1110, `Compact page exceeds height budget: ${layout.mainHeight}`);
            assert.ok(layout.panelHeight < 820, `Contact panel exceeds height budget: ${layout.panelHeight}`);
            console.log(`${locale}/${theme}: main ${Math.round(layout.mainHeight)}px, panel ${Math.round(layout.panelHeight)}px`);
          }
          if (process.env.UX_SCREENSHOT_DIR && [390, 1440].includes(width)) {
            await page.screenshot({ path: path.join(process.env.UX_SCREENSHOT_DIR, `contact-${locale}-${theme}-${width}.png`), fullPage: true });
          }
        }
        await emailLink.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        assert.ok(await emailLink.evaluate((element) => element.matches(':focus-visible')));
        await page.keyboard.press('Tab');
        assert.ok(await name.evaluate((element) => element === document.activeElement), 'Name must follow contact email in keyboard order');
        await submit.click();
        assert.equal(submissions.length, 0, 'Empty required fields must prevent submission');
        await name.fill('Sarah Martin');
        await email.fill('not-an-email');
        await need.selectOption({ index: 1 });
        await message.fill('A workshop for our team.');
        await submit.click();
        assert.equal(submissions.length, 0, 'Invalid email must prevent submission');
        await email.fill('sarah@example.com');
        await name.fill('   ');
        await submit.click();
        await form.getByRole('alert').waitFor();
        assert.equal(submissions.length, 0, 'Whitespace-only required fields must prevent submission');
        await name.fill('Sarah Martin');

        for (const status of [429, 500, 0, 200]) {
          responseStatus = status;
          if (status === 200) {
            await company.fill('Example company');
            await companySize.selectOption({ index: 2 });
          }
          const previousCount = submissions.length;
          const received = new Promise((resolve) => { requestReceived = resolve; });
          await submit.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('.contact-form button[aria-busy="true"]'));
          assert.ok(await submit.isDisabled(), 'Disable duplicate submissions while sending');
          await received;
          assert.equal(submissions.length, previousCount + 1);
          const request = submissions.at(-1);
          assert.deepEqual(request.body, {
            name: 'Sarah Martin', email: 'sarah@example.com',
            company: status === 200 ? 'Example company' : '',
            companySize: status === 200 ? await companySize.inputValue() : '',
            need: locale === 'en' ? 'Request a demo' : 'Demander une démonstration',
            message: 'A workshop for our team.', website: '', locale,
          });
          assert.equal(request.headers['x-csrf-token'], 'contact-ux-token');
          assert.ok(request.headers.cookie.includes('tb_csrf=contact-ux-token'));
          releaseResponse();
          if (status === 200) {
            await page.locator('.contact-success[role="status"]').waitFor();
            assert.equal(await form.count(), 0);
            assert.ok(await emailLink.isVisible(), 'Direct email remains available after success');
          } else {
            const alert = form.getByRole('alert');
            await alert.waitFor();
            assert.match(await alert.textContent(), status === 429 ? (locale === 'en' ? /hour/ : /heure/) : /contact@teamblender\.io/);
            assert.equal(await name.inputValue(), 'Sarah Martin');
            assert.equal(await message.inputValue(), 'A workshop for our team.');
            assert.ok(await submit.isEnabled(), 'Errors must allow retry without losing the draft');
          }
        }
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    }
  }
  console.log('Contact UX passed: FR/EN, light/dark/system, 320-1440px, keyboard, validation, payload, CSRF, pending, errors and success.');
} finally {
  await browser.close();
}
