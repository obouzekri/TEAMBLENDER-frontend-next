import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

async function checkModalSpacing(modal, width) {
  const layout = await modal.evaluate((dialog) => {
    const bounds = dialog.getBoundingClientRect();
    const title = dialog.querySelector('h2').getBoundingClientRect();
    const subtitle = dialog.querySelector('.participant-modal-subtitle').getBoundingClientRect();
    const form = dialog.querySelector('form').getBoundingClientRect();
    const label = dialog.querySelector('.participant-form-grid label').getBoundingClientRect();
    const actions = dialog.querySelector('.participant-form-actions');
    const actionStyle = getComputedStyle(actions);
    const [cancel, save] = [...actions.querySelectorAll('button')].map((button) => button.getBoundingClientRect());
    return {
      titleLeft: title.left - bounds.left,
      titleTop: title.top - bounds.top,
      subtitleLeft: subtitle.left,
      titleX: title.left,
      labelInset: label.left - form.left,
      overflow: dialog.scrollWidth > dialog.clientWidth,
      insideViewport: bounds.left >= 0 && bounds.right <= innerWidth,
      actionBackground: actionStyle.backgroundColor,
      actionBackgroundImage: actionStyle.backgroundImage,
      actionBorder: actionStyle.borderTopWidth,
      actionPosition: actionStyle.position,
      cancelHeight: cancel.height,
      saveHeight: save.height,
      actionAlignment: innerWidth >= 768 ? Math.abs(cancel.top - save.top) : Math.abs(cancel.left - save.left),
    };
  });
  const minInset = width >= 768 ? 32 : 20;
  assert.ok(layout.titleLeft >= minInset, `Title needs breathing room from the left modal border: ${JSON.stringify(layout)}`);
  assert.ok(layout.titleTop >= minInset, 'Title needs breathing room from the top modal border');
  assert.ok(Math.abs(layout.subtitleLeft - layout.titleX) <= 1, 'Title and subtitle must align');
  assert.ok(layout.labelInset >= 16, 'Field labels need inner spacing from the form border');
  assert.equal(layout.overflow, false, 'Modal must not overflow horizontally');
  assert.equal(layout.insideViewport, true, 'Modal must fit the viewport');
  assert.equal(layout.actionBackground, 'rgba(0, 0, 0, 0)', 'Actions must have no background block');
  assert.equal(layout.actionBackgroundImage, 'none', 'Actions must have no gradient');
  assert.equal(layout.actionBorder, '0px', 'Actions must have no separator');
  assert.equal(layout.actionPosition, 'static', 'Actions must not overlay the form');
  assert.ok(Math.abs(layout.cancelHeight - layout.saveHeight) <= 1, 'Action buttons must have the same height');
  assert.ok(layout.cancelHeight >= 44, 'Action buttons must retain a comfortable touch target');
  assert.ok(layout.actionAlignment <= 1, 'Action buttons must align');
}

async function checkModalThemes(page, modal, width) {
  for (const theme of ['light', 'dark', 'system']) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate((value) => {
      if (value === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', value);
    }, theme);
    await checkModalSpacing(modal, width);
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
}

try {
  for (const locale of ['fr', 'en']) {
    for (const width of [320, 390, 1440]) {
      const en = locale === 'en';
      const fixture = await createRealtimeFixture(browser, {
        baseUrl, locale, role: 'user', engineKey: 'copuzzle_live_v1', viewport: { width, height: 1000 }, state: { config: {} },
      });
      try {
        let participants = [{ id: 42, first_name: 'Sophie', last_name: 'Merini', email: 'sophie.merini@example.com' }];
        let failReset = true;
        let failCreate = true;
        let resetRequests = 0;
        let releaseReset;
        let resetStarted;
        const pendingReset = new Promise((resolve) => { resetStarted = resolve; });
        await fixture.context.route('**/api/**', async (route) => {
          const req = route.request();
          const path = new URL(req.url()).pathname;
          if (path.endsWith('/password-reset-email')) {
            resetRequests += 1;
            assert.equal(req.method(), 'POST');
            assert.ok(path.endsWith('/participants/42/password-reset-email'));
            if (!failReset) await new Promise((resolve) => {
              releaseReset = resolve;
              resetStarted();
            });
            return route.fulfill(failReset
              ? { status: 502, json: { error: en ? 'Email unavailable' : 'Envoi indisponible' } }
              : { json: { success: true, email: participants[0].email } });
          }
          if (path.endsWith('/users/1/participants') && req.method() === 'POST') {
            if (failCreate) return route.fulfill({ status: 400, json: { error: en ? 'Creation unavailable' : 'Création indisponible' } });
            const body = req.postDataJSON();
            participants = [...participants, { id: 43, ...body }];
            return route.fulfill({ status: 201, json: { participantId: 43, email: body.email, login_identifier: 'alice.martin' } });
          }
          if (path.endsWith('/participants/42') && req.method() === 'PATCH') {
            participants[0] = { ...participants[0], ...req.postDataJSON() };
            return route.fulfill({ json: participants[0] });
          }
          if (path.endsWith('/participants')) return route.fulfill({ json: participants });
          return route.fallback();
        });
        const page = await fixture.context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/home`);
        await page.locator('.manager-onboarding-close').click();
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        const card = page.locator('.participant-card').first();
        if (width < 768) {
          await card.getByRole('button', { name: en ? 'Open participant actions' : 'Ouvrir les actions participant', exact: true }).click();
          await card.getByRole('menuitem', { name: en ? 'Edit participant' : 'Modifier le participant', exact: true }).click();
        } else {
          await card.getByRole('button', { name: en ? 'Edit this participant' : 'Modifier ce participant', exact: true }).click();
        }
        const edit = page.getByRole('dialog', { name: en ? 'Edit participant' : 'Modifier le participant', exact: true });
        await edit.waitFor();
        await edit.getByLabel(en ? 'First name *' : 'Prénom *', { exact: true }).waitFor();
        await checkModalThemes(page, edit, width);
        const resetSection = edit.getByRole('region', { name: en ? 'Password reset' : 'Réinitialisation du mot de passe', exact: true });
        assert.equal(await resetSection.locator('strong').textContent(), 'sophie.merini@example.com');
        await resetSection.getByRole('heading', { name: en ? 'Password reset' : 'Réinitialisation du mot de passe', exact: true }).waitFor();
        if (!en) {
          assert.ok((await edit.textContent()).includes('Mettez à jour les informations du participant sélectionné.'));
          assert.ok((await edit.textContent()).includes('Département'));
          assert.ok((await edit.textContent()).includes('Les champs marqués d’un * sont obligatoires.'));
        }
        await edit.getByLabel(en ? 'Email *' : 'E-mail *', { exact: true }).fill('unsaved@example.com');
        assert.equal(await resetSection.locator('strong').textContent(), 'sophie.merini@example.com', 'Destination must remain the saved address');
        const resend = edit.getByRole('button', { name: en ? 'Resend password reset link' : 'Renvoyer le lien de réinitialisation', exact: true });
        await resend.click();
        await edit.getByRole('alert').waitFor();
        assert.equal(await edit.getByRole('status').count(), 0);
        failReset = false;
        await resend.click();
        await pendingReset;
        await page.waitForFunction(() => document.querySelector('[aria-busy="true"]'));
        assert.equal(await edit.getByRole('button', { name: en ? 'Sending...' : 'Envoi en cours...', exact: true }).isDisabled(), true);
        assert.equal(await edit.getByRole('button', { name: en ? 'Cancel' : 'Annuler', exact: true }).isDisabled(), true);
        assert.equal(await edit.getByRole('button', { name: en ? 'Save changes' : 'Enregistrer', exact: true }).isDisabled(), true);
        releaseReset();
        await edit.getByRole('status').filter({ hasText: 'sophie.merini@example.com' }).waitFor();
        assert.equal(resetRequests, 2);
        assert.ok(!(await edit.getByRole('status').textContent()).includes('unsaved@example.com'));
        await edit.getByLabel(en ? 'Email *' : 'E-mail *', { exact: true }).fill('sophie.merini@example.com');
        await edit.getByRole('button', { name: en ? 'Save changes' : 'Enregistrer', exact: true }).click();
        await edit.waitFor({ state: 'hidden' });

        await page.getByRole('button', { name: en ? 'Create participant' : 'Créer un participant', exact: true }).click();
        const create = page.getByRole('dialog', { name: en ? 'Create participant' : 'Créer un participant', exact: true });
        await create.getByLabel(en ? 'First name *' : 'Prénom *', { exact: true }).fill('Alice');
        await checkModalThemes(page, create, width);
        await create.getByLabel(en ? 'Last name' : 'Nom', { exact: true }).fill('Martin');
        await create.getByLabel(en ? 'Email *' : 'E-mail *', { exact: true }).fill('alice@example.com');
        await create.getByRole('button', { name: en ? 'Create participant' : 'Créer un participant', exact: true }).click();
        await create.getByRole('alert').waitFor();
        assert.equal(await page.getByRole('dialog').count(), 1);
        failCreate = false;
        await create.getByRole('button', { name: en ? 'Create participant' : 'Créer un participant', exact: true }).click();
        const success = page.getByRole('dialog', { name: en ? 'Participant created' : 'Participant créé', exact: true });
        await success.waitFor();
        assert.equal(await create.count(), 0);
        assert.equal(await page.getByRole('dialog').count(), 1);
        assert.equal(await success.getByRole('status').textContent(), en
          ? 'Participant created. Login: alice.martin · Password setup link sent to alice@example.com.'
          : 'Participant créé. Identifiant : alice.martin · Lien de création du mot de passe envoyé à alice@example.com.');
        assert.ok(await success.evaluate((node) => node.contains(document.activeElement)));
        await page.keyboard.press('Escape');
        await success.waitFor({ state: 'hidden' });
        await page.locator('.participant-card').filter({ hasText: 'Alice Martin' }).waitFor();
        await page.getByRole('button', { name: en ? 'Create participant' : 'Créer un participant', exact: true }).click();
        assert.equal(await create.getByLabel(en ? 'First name *' : 'Prénom *', { exact: true }).inputValue(), '');
        assert.deepEqual(errors, [], 'No browser runtime errors');
        process.stdout.write(`PASS manager participant form ${locale}/${width}\n`);
      } finally {
        await fixture.close();
      }
    }
  }
} finally {
  await browser.close();
}
