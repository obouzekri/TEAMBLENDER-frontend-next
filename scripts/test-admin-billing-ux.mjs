import assert from 'node:assert/strict';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});
const admin = { id: 1, role: 'admin', first_name: 'Admin', email: 'admin@example.test' };
const plans = [
  { id: 1, name: 'Free', slug: 'free', price_cents: 0, price_mad_cents: 0 },
  { id: 2, name: 'Pro', slug: 'pro', price_cents: 39000, price_mad_cents: 39000 },
];
const users = Array.from({ length: 8 }, (_, index) => ({
  ...admin,
  id: index + 1,
  first_name: index === 0 ? '' : `Account ${index + 1}`,
  email: index === 0 ? 'long-account-address-for-layout-check@example.test' : `account-${index}@example.test`,
  pricing_plan_id: 2,
  subscriptions: [{
    pricing_plan_id: 2, pricing_plan: plans[1], status: index === 0 ? 'canceled' : 'incomplete',
    payment_status: 'none', provider: index === 0 ? 'manual' : 'none',
    current_period_end: '2026-11-01T10:00:00Z',
  }],
  invoices: index === 0 ? [{
    id: 101, invoice_number: 'INV-2026-ADMIN-001', pricing_plan_id: 2,
    amount_cents: 39000, status: 'paid', createdAt: '2026-10-01T10:00:00Z',
  }] : [],
}));

async function checkLayout(page, label) {
  const result = await page.evaluate(() => {
    const gap = (first, second) => second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
    const cards = [...document.querySelectorAll('.admin-billing-grid > .admin-billing-card')];
    const actions = document.querySelector('.admin-billing-actions');
    const buttons = actions.querySelectorAll('button');
    const firstRow = document.querySelector('.user-row');
    const headings = cards.map((card) => gap(card.querySelector('h2'), card.querySelector('h2').nextElementSibling));
    const invoicesHeading = cards[1].querySelector('h3');
    return {
      headings,
      summaryToActions: gap(document.querySelector('.selected-user-summary'), actions),
      actionsToInvoices: gap(actions, invoicesHeading),
      selectToButtons: gap(actions.querySelector('select'), buttons[0]),
      buttonGap: parseFloat(getComputedStyle(actions).gap),
      cardGap: parseFloat(getComputedStyle(document.querySelector('.admin-billing-users')).gap),
      rowGap: parseFloat(getComputedStyle(firstRow).gap),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      clipped: [...document.querySelectorAll('.user-row, .selected-user-summary, .admin-billing-actions, .invoice-row')]
        .some((node) => node.scrollWidth > node.clientWidth + 1),
      clippedAccounts: [...document.querySelectorAll('.user-row')]
        .some((node) => node.scrollHeight > node.clientHeight + 1),
    };
  });
  for (const spacing of [...result.headings, result.summaryToActions, result.actionsToInvoices]) {
    assert.ok(spacing >= 20, `${label}: section spacing ${spacing}px < 20px`);
  }
  assert.ok(result.selectToButtons >= 12, `${label}: plan selector needs spacing before buttons`);
  assert.ok(result.buttonGap >= 12, `${label}: action buttons need spacing`);
  assert.ok(result.cardGap >= 12, `${label}: account cards need spacing`);
  assert.ok(result.rowGap >= 8, `${label}: account card content needs spacing`);
  assert.equal(result.overflow, false, `${label}: horizontal page overflow`);
  assert.equal(result.clipped, false, `${label}: clipped card content`);
  assert.equal(result.clippedAccounts, false, `${label}: account card content overflows vertically`);
}

async function checkAdmin(page, locale) {
  const en = locale === 'en';
  await page.goto(`${baseUrl}/${locale}/admin`);
  await page.getByRole('heading', { name: en ? 'Dashboard' : 'Tableau de bord', exact: true }).waitFor();
  assert.ok(await page.getByText(en ? 'Recent admin activity' : 'Activité admin récente', { exact: true }).isVisible());
  const tabCases = [
    ['users', en ? 'Users' : 'Utilisateurs', en ? 'Create user' : 'Créer un utilisateur', en ? 'Role' : 'Rôle'],
    ['participants', 'Participants', en ? 'Create participant' : 'Créer un participant', en ? 'Department' : 'Département'],
    ['sessions', 'Sessions', en ? 'Create session' : 'Créer une session', en ? 'Duration (minutes)' : 'Durée (minutes)'],
    ['challenges', 'Challenges', en ? 'Add challenge' : 'Ajouter un challenge', en ? 'Category' : 'Catégorie'],
    ['pricing', en ? 'Pricing' : 'Tarification', en ? 'Create pricing plan' : 'Créer une formule', en ? 'Offer name' : 'Nom de l’offre'],
    ['landing', en ? 'Landing CMS' : 'Contenu d’accueil', en ? 'Create block' : 'Créer un bloc', en ? 'Image URL' : 'URL de l’image'],
  ];
  for (const [, tabName, createName, fieldName] of tabCases) {
    const navigation = page.locator('.admin-sidebar__nav:visible, .admin-mobile-tabs:visible');
    await navigation.getByRole('button').filter({ hasText: tabName }).click();
    await page.getByRole('button', { name: createName, exact: true }).click();
    await page.getByLabel(fieldName).first().waitFor();
    if (!en && tabName === 'Challenges') {
      await page.getByRole('option', { name: 'Logique & Réflexion', exact: true }).waitFor({ state: 'attached' });
      await page.locator('form.auth-form button').filter({ hasText: /^Cohésion$/ }).waitFor();
    }
    if (!en && tabName === 'Tarification') {
      assert.ok(await page.getByLabel('Jours d’essai', { exact: true }).isVisible());
      assert.ok(await page.getByLabel('Ordre d’affichage', { exact: true }).isVisible());
    }
  }
}

try {
  for (const locale of ['fr', 'en']) {
    for (const width of [390, 1440]) {
      for (const theme of ['light', 'dark']) {
        const label = `${locale}/${width}px/${theme}`;
        const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
        try {
          await context.addInitScript(({ locale, theme, admin }) => {
            sessionStorage.setItem('jwt', 'local-admin-billing-fixture');
            sessionStorage.setItem('currentUser', JSON.stringify(admin));
            localStorage.setItem('tb_locale_preference', locale);
            localStorage.setItem('tb_theme', theme);
          }, { locale, theme, admin });
          const writes = [];
          await context.route('**/*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (!url.pathname.includes('/api/')) {
              return url.origin === new URL(baseUrl).origin ? route.continue() : route.abort();
            }
            if (!['GET', 'HEAD'].includes(request.method())) {
              writes.push({ path: url.pathname, body: request.postDataJSON() });
            }
            let data = [];
            if (url.pathname.endsWith('/users/me')) data = admin;
            else if (url.pathname.endsWith('/users')) data = users;
            else if (url.pathname.endsWith('/auth/csrf-token')) data = { csrfToken: 'local-admin-csrf' };
            else if (url.pathname.endsWith('/admin-billing/overview')) data = { items: users };
            else if (url.pathname.endsWith('/admin-billing/timeline')) data = { items: [] };
            else if (/\/pricing-plans(\/admin)?$/.test(url.pathname)) data = plans;
            return route.fulfill({ json: data });
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(`${baseUrl}/${locale}/admin/billing`);
          await page.locator('.user-row').first().waitFor();
          const rejectCookies = page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true });
          if (await rejectCookies.isVisible()) await rejectCookies.click();
          await page.evaluate(() => document.fonts.ready);
          await checkLayout(page, label);
          if (process.env.ADMIN_SCREENSHOT_DIR) {
            await page.screenshot({
              path: join(process.env.ADMIN_SCREENSHOT_DIR, `admin-billing-${locale}-${width}-${theme}.png`),
              fullPage: true,
            });
          }
          const en = locale === 'en';
          const copy = await page.locator('.admin-billing-shell').innerText();
          assert.ok(copy.includes(en ? 'Operator actions' : 'Actions opérateur'));
          assert.ok(copy.includes(en ? 'Cancelled' : 'Annulé'));
          assert.ok(copy.includes(en ? 'Payment: None' : 'Paiement : Aucun'));
          assert.ok(copy.includes(en ? 'Recent operational timeline' : 'Historique opérationnel récent'));
          if (en) assert.equal(copy.includes('Aucun'), false);
          else assert.equal(copy.includes('Upgrade/Downgrade'), false);
          const invoiceButton = page.locator('.invoice-actions button').first();
          const colors = await invoiceButton.evaluate((button) => ({
            text: getComputedStyle(button).color,
            background: getComputedStyle(button).backgroundColor,
          }));
          const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map((value) => {
            const channel = Number(value) / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
          const text = luminance(colors.text);
          const background = luminance(colors.background);
          const contrast = (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
          assert.ok(contrast >= 4.5, `${label}: invoice action contrast ${contrast.toFixed(2)} < 4.5:1`);
          await page.getByRole('button', { name: en ? 'Change plan' : 'Changer de formule', exact: true }).click();
          await page.getByText(en ? 'Plan updated.' : 'Formule mise à jour.', { exact: true }).waitFor();
          await page.getByRole('button', { name: en ? 'Record manual payment' : 'Valider le paiement manuel', exact: true }).click();
          await page.getByText(en ? 'Manual payment recorded and subscription synchronized.' : 'Paiement manuel enregistré et abonnement synchronisé.', { exact: true }).waitFor();
          await page.getByRole('button', { name: en ? 'Refund' : 'Rembourser', exact: true }).click();
          await page.getByText(en ? 'Invoice refunded.' : 'Facture remboursée.', { exact: true }).waitFor();
          assert.equal(writes.find((write) => write.path.endsWith('/change-plan')).body.pricing_plan_id, '2');
          assert.equal(writes.find((write) => write.path.endsWith('/manual-payment')).body.amount_cents, 39000);
          assert.ok(writes.some((write) => write.path.endsWith('/invoices/101/refund')));
          await page.locator('.user-row').nth(1).click();
          assert.equal(await page.locator('.user-row[aria-pressed="true"]').count(), 1);
          await page.getByText(en ? 'No invoices.' : 'Aucune facture.', { exact: true }).waitFor();
          await checkLayout(page, `${label}/empty invoices`);
          await page.getByRole('combobox', { name: en ? 'Subscription plan' : 'Formule d’abonnement', exact: true }).selectOption('');
          assert.equal(await page.getByRole('button', { name: en ? 'Change plan' : 'Changer de formule', exact: true }).isDisabled(), true);
          await checkAdmin(page, locale);
          assert.deepEqual(errors, [], `${label}: runtime errors`);
          console.log(`PASS admin billing UX: ${label}, spacing, translations, tabs and billing actions`);
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
