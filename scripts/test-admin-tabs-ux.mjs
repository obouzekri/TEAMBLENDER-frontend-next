// Console admin : chaque onglet s'affiche, ouvre son formulaire d'édition et l'enregistre
// vers la bonne route ; supprimer un participant n'envoie qu'un DELETE sur ce participant.
// Garde-fou du découpage d'AdminClient.js en composants d'onglet (app/admin/tabs/).
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';
import { dismissCookieBanner } from './helpers/cookie-banner.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const dictionaries = { fr: fr.adminConsole, en: en.adminConsole };

const admin = { id: 1, role: 'admin', first_name: 'Admin', last_name: 'Root', email: 'admin@example.test', approval_status: 'approved', email_verified: true };
const users = [
  admin,
  { id: 2, role: 'user', first_name: 'Nora', last_name: 'Diallo', email: 'nora@example.test', approval_status: 'approved', email_verified: false, pricing_plan_id: 11, disabled: false },
  { id: 3, role: 'user', first_name: 'Paul', last_name: 'Martin', email: 'paul@example.test', approval_status: 'pending', email_verified: true, disabled: true },
];
const participants = [
  { id: 21, firstname: 'Ana', first_name: 'Ana', last_name: 'Code', email: 'ana@example.test', created_by: 2, approval_status: 'approved', disabled: false },
  { id: 22, firstname: 'Bob', first_name: 'Bob', last_name: 'Code', email: 'bob@example.test', created_by: 2, approval_status: 'approved', disabled: false },
  { id: 23, firstname: 'Cid', first_name: 'Cid', last_name: 'Code', email: 'cid@example.test', created_by: 2, approval_status: 'approved', disabled: false },
];
const sessions = [{ id: 31, name: 'Atelier cohésion', status: 'preparee', owner_id: 2, date: '2026-12-01', time: '10:00', modality: 'remote', code: 'AB12' }];
const challenges = [{
  id: 101, name: 'Quiz fixture', type: 'equipe', status: 'actif', source: 'local', category: 'logique-reflexion',
  objectives: 'cohesion', engine_key: 'the_quiz_v1', duration: '20 min', description: 'Quiz', engine_config: {},
}];
const pricingPlans = [{ id: 11, name: 'Essentiel', slug: 'essentiel', plan_code: 'team', price: 39, price_cents: 3900, currency: 'EUR', billing_cycle: 'monthly', is_active: true, highlighted: true, features: ['40 participants'], display_order: 2, localized_content: {} }];
const landingBlocks = [{ block_key: 'hero_main', title: 'Titre', subtitle: 'Sous-titre', body: 'Texte', cta_label: 'Essayer', cta_href: '/signup', is_active: true, display_order: 1 }];

function apiData(pathname) {
  if (pathname.endsWith('/users/me')) return admin;
  if (pathname.endsWith('/auth/csrf-token')) return { csrfToken: 'admin-tabs' };
  if (pathname.endsWith('/users/pending')) return [users[2]];
  if (pathname.endsWith('/users')) return users;
  if (pathname.endsWith('/sessions')) return sessions;
  if (pathname.endsWith('/challenges')) return challenges;
  if (pathname.endsWith('/participants')) return participants;
  if (pathname.endsWith('/pricing-plans/admin')) return pricingPlans;
  if (pathname.endsWith('/landing-content/admin')) return landingBlocks;
  if (pathname.endsWith('/admin-analytics/overview')) return { configured: true, lookbackDays: 30, users: { totalActive: 4 } };
  if (pathname.endsWith('/admin-analytics/visits/summary')) return { totalVisits: 0, uniqueUsers: 0, recentVisits: [] };
  if (pathname.endsWith('/admin-analytics/visits')) return { visits: [] };
  return [];
}

// [tab label key, edit button (aria-label key or text key), expected write path pattern]
const EDITS = [
  ['users', 'editUser', /^\/users\/\d+$/],
  ['participants', 'editParticipant', /^\/participants\/2\d$/],
  ['sessions', 'edit', /^\/sessions\/31$/],
  ['pricing', 'editPlan', /^\/pricing-plans\/11$/],
  ['landingCms', 'editLandingBlock', /^\/landing-content\/hero_main$/],
];

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const locale of ['fr', 'en']) {
    const copy = dictionaries[locale];
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    try {
      await context.addInitScript(({ locale, admin }) => {
        sessionStorage.setItem('jwt', 'admin-tabs');
        sessionStorage.setItem('currentUser', JSON.stringify(admin));
        localStorage.setItem('tb_locale_preference', locale);
      }, { locale, admin });
      const writes = [];
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname.includes('/api/')) {
          if (!['GET', 'HEAD'].includes(request.method()) && !url.pathname.includes('/admin-analytics/')) {
            writes.push({ method: request.method(), path: url.pathname.replace(/^.*\/api/, '') });
          }
          return route.fulfill({ json: apiData(url.pathname) });
        }
        if (url.origin !== new URL(baseUrl).origin) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('dialog', (dialog) => dialog.accept());
      await page.goto(`${baseUrl}/${locale}/admin`);
      const nav = page.locator('.admin-sidebar__nav');
      await nav.getByRole('button').first().waitFor();
      await dismissCookieBanner(page);

      const openTab = async (key) => {
        await nav.getByRole('button', { name: new RegExp(`^${copy[key] || key}`) }).click();
        await page.locator('.admin-main-shell h1').first().waitFor();
      };

      for (const tab of ['analytics', 'users', 'participants', 'sessions', 'pricing', 'landingCms']) {
        await openTab(tab);
        assert.ok(await page.locator('.admin-main-shell h1').count(), `${locale}/${tab}: title missing`);
      }
      await openTab('Challenges');
      assert.ok(await page.getByText('Quiz fixture', { exact: true }).count(), `${locale}: challenge list missing`);

      for (const [tab, editKey, expectedPath] of EDITS) {
        await openTab(tab);
        const label = copy[editKey];
        const byLabel = page.locator(`.admin-main-shell button[aria-label="${label}"]`);
        const editButton = (await byLabel.count()) ? byLabel.first() : page.locator('.admin-main-shell button').filter({ hasText: new RegExp(`^${label}$`) }).first();
        await editButton.click();
        const before = writes.length;
        await page.getByRole('button', { name: copy.save, exact: true }).first().click();
        await page.waitForTimeout(400);
        const write = writes.slice(before).find((entry) => expectedPath.test(entry.path));
        assert.ok(write, `${locale}/${tab}: expected a write to ${expectedPath}, got ${JSON.stringify(writes.slice(before))}`);
        assert.ok(['PUT', 'PATCH'].includes(write.method), `${locale}/${tab}: unexpected method ${write.method}`);
      }

      await openTab('participants');
      const before = writes.length;
      await page.locator(`.admin-main-shell button[aria-label="${copy.deleteParticipant}"]`).nth(1).click();
      await page.waitForTimeout(400);
      assert.deepEqual(writes.slice(before), [{ method: 'DELETE', path: '/participants/22' }], `${locale}: delete must target one participant`);

      assert.deepEqual(errors, [], `${locale}: page errors`);
      console.log(`PASS admin tabs ${locale}: 8 tabs, edit and save (${EDITS.length} forms), single participant delete`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
