import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});
const participant = { id: 7, first_name: 'Alice', last_name: 'Martin', email: 'alice@example.com' };

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
      const channel = Number(value) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

try {
  for (const locale of ['fr', 'en']) {
    for (const theme of ['light', 'dark', 'system']) {
      const fixture = await createRealtimeFixture(browser, {
        baseUrl, locale, theme, role: 'user', engineKey: 'copuzzle_live_v1', state: { config: {} },
      });
      try {
        let savedSession;
        let rejectCreation = false;
        let creationRequests = 0;
        await fixture.context.route('**/api/**', async (route) => {
          const request = route.request();
          const pathname = new URL(request.url()).pathname;
          if (pathname.endsWith('/participants')) return route.fulfill({ json: [participant] });
          if (pathname.endsWith('/sessions') && request.method() === 'POST') {
            creationRequests += 1;
            if (rejectCreation) return route.fulfill({ status: 500, json: { error: 'Creation unavailable' } });
            savedSession = {
              ...request.postDataJSON(), id: 42, code: 'LAYOUT',
              challenges: [], assigned_participants: [],
            };
            return route.fulfill({ json: savedSession });
          }
          if (/\/sessions\/42(?:\/invite)?$/.test(pathname)) {
            return route.fulfill({ json: { ...savedSession, invite_token: 'layout-fixture' } });
          }
          return route.fallback();
        });
        const page = await fixture.context.newPage();
        await page.emulateMedia({ colorScheme: theme === 'light' ? 'light' : 'dark' });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/session-builder`);
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        const form = page.locator('#create-session-form');
        const name = page.locator('#session-name');
        const submit = form.getByRole('button', { name: locale === 'fr' ? 'Créer la session' : 'Create session', exact: true });
        await name.waitFor();
        assert.equal(await submit.isDisabled(), true);
        assert.equal(await form.locator('[required]').count(), 1);
        assert.equal(await form.locator('details').getAttribute('open'), null);
        assert.equal(await form.locator('#session-objective input').count(), 7);
        assert.equal(await form.locator('input[value="manual"]').isChecked(), true);
        const cancel = form.getByRole('link', { name: locale === 'fr' ? 'Annuler' : 'Cancel', exact: true });
        assert.equal(await cancel.getAttribute('href'), `/${locale}/home`);
        const flowHeading = locale === 'fr'
          ? 'Déroulement (Mode de progression des challenges)'
          : 'Session flow (Challenge progression mode)';
        assert.equal(await page.locator('#creation-flow-heading').innerText(), flowHeading);
        assert.equal(await form.getByRole('group', { name: flowHeading, exact: true }).count(), 1);
        assert.equal(
          await page.locator('#creation-participants-heading').innerText(),
          locale === 'fr' ? 'Participants (facultatif)' : 'Participants (optional)',
        );
        assert.equal(await submit.getAttribute('aria-describedby'), 'creation-next-hint');
        assert.equal(
          await page.locator('#creation-next-hint').innerText(),
          locale === 'fr' ? 'Vous pourrez ensuite choisir vos challenges.' : 'You can choose your challenges next.',
        );
        await name.fill('Premium session');

        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => window.scrollTo(0, 0));
          const layout = await form.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const sections = [...element.children].map((child) => child.getBoundingClientRect());
            const controls = [...element.querySelectorAll('input:not([type="radio"], [type="checkbox"])')];
            const cardStyle = getComputedStyle(element);
            const submit = element.querySelector('button[type="submit"]');
            const hint = element.querySelector('#creation-next-hint');
            const cancel = element.querySelector('footer a');
            const submitBounds = submit.getBoundingClientRect();
            const hintBounds = hint.getBoundingClientRect();
            const cancelBounds = cancel.getBoundingClientRect();
            const cancelStyle = getComputedStyle(cancel);
            return {
              width: bounds.width,
              centered: Math.abs((bounds.left + bounds.right) / 2 - innerWidth / 2) < 2,
              top: bounds.top,
              overflow: document.documentElement.scrollWidth > innerWidth || element.scrollWidth > element.clientWidth,
              singleColumn: sections.every((rect, index) => index === 0 || rect.top >= sections[index - 1].bottom - 1),
              controlsInside: controls.every((input) => {
                const rect = input.getBoundingClientRect();
                return rect.width === 0 || rect.left >= bounds.left && rect.right <= bounds.right + 1;
              }),
              background: cardStyle.backgroundColor,
              backgroundImage: cardStyle.backgroundImage,
              frames: [...element.querySelectorAll('section, fieldset, details')].map((section) => getComputedStyle(section).borderTopWidth),
              headingPadding: element.previousElementSibling.getBoundingClientRect().top - element.closest('main').getBoundingClientRect().top,
              hintBelowSubmit: hintBounds.top >= submitBounds.bottom + 8,
              hintCentered: Math.abs((hintBounds.left + hintBounds.right) / 2 - (submitBounds.left + submitBounds.right) / 2) < 2,
              cancelBorder: cancelStyle.borderTopWidth,
              cancelHeight: cancelBounds.height,
              cancelColor: cancelStyle.color,
              cancelBackground: cancelStyle.backgroundColor,
              hintColor: getComputedStyle(hint).color,
              mobileActions: innerWidth > 600 || (
                cancelBounds.top >= hintBounds.bottom &&
                Math.abs(cancelBounds.width - submitBounds.width) < 2
              ),
            };
          });
          assert.ok(layout.width <= 1040, JSON.stringify(layout));
          assert.ok(layout.centered, JSON.stringify(layout));
          assert.ok(layout.top < 260, 'No oversized empty header above the form');
          assert.equal(layout.overflow, false, `Overflow ${locale}/${theme}/${width}`);
          assert.ok(layout.singleColumn, 'Sections must follow one vertical flow');
          assert.ok(layout.controlsInside, 'Date and text inputs must stay inside the form');
          assert.equal(layout.backgroundImage, 'none');
          assert.equal(layout.background === 'rgb(255, 255, 255)', theme === 'light');
          assert.ok(layout.frames.every((border) => border === '0px'), `No nested section frames: ${layout.frames}`);
          assert.ok(layout.headingPadding >= (width <= 600 ? 32 : 40), `Title needs breathing room below navigation: ${JSON.stringify(layout)}`);
          assert.ok(layout.hintBelowSubmit, 'The next-step hint must sit below the create button');
          assert.ok(layout.hintCentered, 'The next-step hint must align with the create button');
          assert.equal(layout.cancelBorder, '1px', 'Cancel must have a visible secondary-button outline');
          assert.ok(layout.cancelHeight >= 44, 'Cancel must remain an accessible touch target');
          assert.ok(contrastRatio(layout.cancelColor, layout.cancelBackground) >= 4.5, 'Cancel text needs AA contrast');
          assert.ok(contrastRatio(layout.hintColor, layout.background) >= 4.5, 'Next-step hint needs AA contrast');
          assert.ok(layout.mobileActions, 'Mobile actions must stack at full width with cancel below the hint');
          console.log(`PASS session creation layout ${locale}/${theme}/${width}`);
        }

        await submit.focus();
        await page.keyboard.press('Shift+Tab');
        assert.equal(await cancel.evaluate((element) => element === document.activeElement), true);
        assert.equal(await cancel.evaluate((element) => element.matches(':focus-visible')), true);
        assert.equal(await cancel.evaluate((element) => getComputedStyle(element).outlineStyle), 'solid');
        if (theme === 'system') {
          await page.emulateMedia({ colorScheme: 'light' });
          assert.equal(await form.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)');
          await page.emulateMedia({ colorScheme: 'dark' });
          assert.notEqual(await form.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)');
        }

        if (process.env.UX_SCREENSHOT_DIR) {
          await page.screenshot({ path: path.join(process.env.UX_SCREENSHOT_DIR, `creation-${locale}-${theme}.png`), fullPage: true });
        }
        if (theme === 'dark') {
          await form.getByRole('link', { name: locale === 'fr' ? 'Annuler' : 'Cancel', exact: true }).click();
          await page.waitForURL(`**/${locale}/home`);
          assert.equal(creationRequests, 0, 'Cancel must not create a session');
          await page.goto(`${baseUrl}/${locale}/session-builder`);
          await name.waitFor();
          assert.equal(await name.inputValue(), 'Premium session', 'Returning preserves the saved draft');
        }
        if (theme === 'light') {
          await page.locator('#expected-participants').fill('0');
          assert.equal(await submit.isDisabled(), true);
          await page.locator('#expected-participants').fill('8');
          await page.locator('#session-datetime').fill('2026-11-15T10:30');
          await form.locator('input[value="auto"]').check();
          await form.locator('#session-objective').getByLabel('Collaboration', { exact: true }).check();
          await form.locator('#session-objective').getByLabel('Communication', { exact: true }).check();
          const disclosure = form.locator('details');
          await disclosure.locator('summary').click();
          const checkbox = disclosure.getByRole('checkbox').first();
          await checkbox.check();
          assert.match(await disclosure.locator('summary').innerText(), /1/);
          await disclosure.locator('summary').click();
          await disclosure.locator('summary').click();
          assert.equal(await checkbox.isChecked(), true, 'Closing the accordion preserves participants');
          await page.setViewportSize({ width: 320, height: 1000 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          rejectCreation = true;
          await submit.click();
          await page.getByText('The server encountered a temporary error. Try again in a few seconds.', { exact: true }).waitFor();
          assert.equal(await name.inputValue(), 'Premium session', 'API failures preserve entered values');
          assert.equal(await submit.isDisabled(), false);
          rejectCreation = false;
        }
        await submit.click();
        await page.getByRole('heading', { name: 'Premium session', exact: true }).waitFor();
        assert.equal(savedSession.name, 'Premium session');
        if (theme === 'light') {
          assert.equal(savedSession.expected_participant_count, 8);
          assert.equal(savedSession.objective, 'communication,collaboration');
          assert.equal(savedSession.flow_mode, 'auto');
          assert.deepEqual(savedSession.participant_ids, [7]);
          assert.ok(savedSession.session_date);
          assert.equal(creationRequests, 2);
        } else {
          assert.equal(savedSession.expected_participant_count, null);
          assert.equal(savedSession.objective, null);
          assert.equal(savedSession.flow_mode, 'manual');
          assert.equal(savedSession.participant_ids, undefined);
          assert.equal(savedSession.session_date, undefined);
          assert.equal(creationRequests, 1);
        }
        assert.deepEqual(errors, [], 'No browser runtime errors');
      } finally {
        await fixture.close();
      }
    }
  }
} finally {
  await browser.close();
}
