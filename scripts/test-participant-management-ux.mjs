import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  for (const locale of ['fr', 'en']) {
    for (const width of [390, 1440]) {
      const en = locale === 'en';
      const fixture = await createRealtimeFixture(browser, {
        baseUrl, locale, role: 'user', engineKey: 'copuzzle_live_v1',
        viewport: { width, height: 900 }, state: { config: {}, timer: { status: 'idle' } },
      });
      let session = { id: 42, owner_id: 1, name: 'Participant control UX', code: 'CONTROL',
        expected_participant_count: 8, objective: 'collaboration', challenges: [], assigned_participants: [{ id: 10 }, { id: 20 }] };
      let management = { active_challenge_id: 7, can_remove_current: true, participants: [
        { id: 10, name: 'Alice Offline', presence: 'offline', removed_from_future: false },
        { id: 20, name: 'Bob Connected', presence: 'connected', removed_from_future: false },
      ] };
      const removals = [];
      let denyNext = false;
      let denyContext = false;
      let unavailable = false;
      await fixture.context.route('**/api/sessions/42**', async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/state')) return route.fulfill({ json: { status: 'en_cours', active_challenge_id: null, challenges: [] } });
        if (path.endsWith('/participant-management')) {
          if (unavailable) return route.fulfill({ status: 503, json: { error: en ? 'Presence service unavailable' : 'Service de présence indisponible' } });
          return route.fulfill({ json: management });
        }
        if (path.endsWith('/remove')) {
          if (denyNext) {
            denyNext = false;
            return route.fulfill({ status: 403, json: { code: 'FORBIDDEN', error: en ? 'Permission denied' : 'Permission refusée' } });
          }
          const body = request.postDataJSON();
          removals.push(body);
          assert.equal(body.active_challenge_id, 7);
          const participant = management.participants.find((item) => path.includes(`/${item.id}/`));
          participant.removed_from_future = true;
          if (body.scope === 'current_and_future') participant.presence = 'removed';
          return route.fulfill({ json: { removed: true, scope: body.scope } });
        }
        if (path.endsWith('/42')) {
          if (request.method() === 'PUT') {
            if (denyContext) return route.fulfill({ status: 403, json: { error: en ? 'Permission denied' : 'Permission refusée' } });
            const body = request.postDataJSON();
            assert.deepEqual(Object.keys(body).sort(), ['expected_participant_count', 'objective']);
            session = { ...session, ...body };
          }
          return route.fulfill({ json: session });
        }
        return route.fallback();
      });
      const page = await fixture.context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const info = () => page.getByRole('button', { name: en ? 'Session info' : 'Infos de session', exact: true });
      const manage = () => page.getByRole('button', { name: en ? 'Manage participants' : 'Gérer les participants', exact: true });
      const modal = () => page.getByRole('dialog', { name: en ? 'Manage participants' : 'Gérer les participants', exact: true });
      await page.goto(`${baseUrl}/${locale}/session-live/42`);
      await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
      await info().click();
      await page.getByText('1 / 8', { exact: true }).waitFor();
      await page.getByText(en ? 'Registered : 2' : 'Inscrits : 2', { exact: true }).waitFor();
      await manage().click();
      await modal().waitFor();
      assert.ok(await modal().evaluate((node) => node.contains(document.activeElement)));
      const controls = modal().locator('button:enabled');
      await controls.first().focus();
      await page.keyboard.press('Shift+Tab');
      assert.ok(await controls.last().evaluate((node) => node === document.activeElement), 'Modal reverse tab escaped');
      await page.keyboard.press('Tab');
      assert.ok(await controls.first().evaluate((node) => node === document.activeElement), 'Modal tab escaped');
      await page.keyboard.press('Escape');
      await modal().waitFor({ state: 'hidden' });
      await info().evaluate((node) => new Promise((resolve, reject) => {
        const started = performance.now();
        function check() {
          if (node === document.activeElement) resolve();
          else if (performance.now() - started > 3000) reject(new Error('Info focus not restored'));
          else requestAnimationFrame(check);
        }
        check();
      }));
      await info().click();
      await manage().click();
      const alice = () => modal().getByRole('listitem').filter({ hasText: 'Alice Offline' });
      await alice().getByRole('button', { name: en ? 'Remove and reassign' : 'Retirer et redistribuer', exact: true }).click();
      assert.equal(removals.length, 0, 'Removal happened before confirmation');
      await modal().getByRole('button', { name: en ? 'Cancel' : 'Annuler', exact: true }).click();
      assert.equal(removals.length, 0);
      await alice().getByRole('button', { name: en ? 'Remove and reassign' : 'Retirer et redistribuer', exact: true }).click();
      denyNext = true;
      await modal().getByRole('button', { name: en ? 'Confirm removal' : 'Confirmer le retrait', exact: true }).click();
      await modal().getByRole('alert').filter({ hasText: en ? 'Permission denied' : 'Permission refusée' }).waitFor();
      assert.equal(removals.length, 0);
      await modal().getByRole('button', { name: en ? 'Confirm removal' : 'Confirmer le retrait', exact: true }).click();
      await alice().getByText(en ? 'Removed' : 'Retiré', { exact: true }).waitFor();
      assert.equal(removals[0].scope, 'current_and_future');
      const bob = () => modal().getByRole('listitem').filter({ hasText: 'Bob Connected' });
      await bob().getByRole('button', { name: en ? 'Future challenges only' : 'Prochains challenges uniquement', exact: true }).click();
      await modal().getByText(en ? /Their current assignment stays unchanged/ : /Son attribution actuelle reste inchangée/).waitFor();
      await modal().getByRole('button', { name: en ? 'Confirm removal' : 'Confirmer le retrait', exact: true }).click();
      await bob().getByText(en ? /Connected · Removed from future/ : /Connecté · Retiré des prochains/).waitFor();
      assert.equal(removals[1].scope, 'future');
      await page.reload();
      await info().click();
      await manage().click();
      await alice().getByText(en ? 'Removed' : 'Retiré', { exact: true }).waitFor();
      assert.equal(await alice().getByRole('button').count(), 0, 'Removed participant can rejoin via UI');
      await modal().getByRole('button', { name: en ? 'Close' : 'Fermer', exact: true }).click();
      management.can_remove_current = false;
      await page.reload();
      await info().click();
      await manage().click();
      assert.equal(await modal().getByRole('button', { name: en ? 'Remove and reassign' : 'Retirer et redistribuer', exact: true }).count(), 0);
      await modal().getByText(en ? /Other engines support future challenges only/ : /Pour les autres moteurs, seul le retrait des prochains/).waitFor();
      await modal().getByRole('button', { name: en ? 'Close' : 'Fermer', exact: true }).click();
      await info().click();
      await page.getByRole('button', { name: en ? 'Edit session info' : 'Modifier les infos', exact: true }).click();
      const editor = page.getByRole('dialog', { name: en ? 'Edit session info' : 'Modifier les infos', exact: true });
      await editor.getByRole('spinbutton').fill('11');
      await editor.getByRole('combobox').selectOption('leadership');
      denyContext = true;
      await editor.getByRole('button', { name: en ? 'Save' : 'Enregistrer', exact: true }).click();
      await editor.getByRole('alert').waitFor();
      assert.equal(session.expected_participant_count, 8);
      denyContext = false;
      await editor.getByRole('button', { name: en ? 'Save' : 'Enregistrer', exact: true }).click();
      await editor.waitFor({ state: 'hidden' });
      assert.equal(session.expected_participant_count, 11);
      assert.equal(session.objective, 'leadership');
      await page.reload();
      await info().click();
      await page.getByText('1 / 11', { exact: true }).waitFor();
      await page.getByRole('dialog', { name: en ? 'Session info' : 'Infos de session', exact: true }).getByText('Leadership', { exact: true }).waitFor();
      session.expected_participant_count = null;
      unavailable = true;
      await page.reload();
      await info().click();
      await page.getByText('— / —', { exact: true }).waitFor();
      await page.getByText(en ? 'Expected attendance not specified' : 'Nombre attendu non précisé', { exact: true }).waitFor();
      await manage().click();
      await modal().getByRole('alert').waitFor();
      assert.equal(await modal().getByRole('listitem').count(), 0);
      await modal().getByRole('button', { name: en ? 'Close' : 'Fermer', exact: true }).click();
      unavailable = false;
      session.owner_id = 99;
      await page.reload();
      await info().click();
      assert.equal(await manage().count(), 0, 'Unrelated owner sees facilitator actions');
      assert.equal(await page.getByRole('button', { name: en ? 'Edit session info' : 'Modifier les infos', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await fixture.close();
      console.log(`PARTICIPANT_MANAGEMENT_UX_OK ${locale} ${width}`);
    }
  }
  for (const locale of ['fr', 'en']) {
    const en = locale === 'en';
    const fixture = await createRealtimeFixture(browser, {
      baseUrl, locale, role: 'participant', engineKey: 'mission_critique_v1',
      viewport: { width: 390, height: 900 },
      state: { config: { chat: { enabled: false } },
        timer: { enabled: true, status: 'running', duration_seconds: 1200, remaining_seconds: 1100 },
        mission: { tasks: [{ id: 'task', label: 'Permission fixture' }], timeline: [], phases: {} } },
    });
    let managementRequests = 0;
    await fixture.context.route('**/api/sessions/42/participant-management', async (route) => {
      managementRequests += 1;
      await route.fulfill({ status: 403, json: { error: 'Forbidden' } });
    });
    await fixture.context.route('**/api/sessions/42', (route) => route.fulfill({
      json: { id: 42, owner_id: 1, name: 'Participant permission UX', code: 'CONTROL',
        expected_participant_count: 9, objective: 'collaboration', assigned_participants: [{ id: 1 }] },
    }));
    const page = await fixture.context.newPage();
    await page.goto(`${baseUrl}/${locale}/challenges/mission_critique_v1?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
    await page.getByRole('button', { name: en ? 'Session info' : 'Infos de session', exact: true }).click();
    const info = page.getByRole('dialog', { name: en ? 'Session info' : 'Infos de session', exact: true });
    await info.getByText(/\/ 9$/).waitFor();
    await info.getByText('Collaboration', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: en ? 'Manage participants' : 'Gérer les participants', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: en ? 'Edit session info' : 'Modifier les infos', exact: true }).count(), 0);
    assert.equal(managementRequests, 0, 'Participant queried private facilitator roster');
    await fixture.close();
    console.log(`PARTICIPANT_PERMISSION_UX_OK ${locale} 390`);
  }
} finally {
  await browser.close();
}
