import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'mission_critique_v1';
const tasks = [
  { id: 't1', label: 'Préparer les supports' },
  { id: 't2', label: 'Valider le périmètre' },
  { id: 't3', label: 'Lancer la mission' },
  { id: 't4', label: 'Clore la mission' },
];
const mission = {
  tasks, timeline: ['t1'], phases: { t1: 'preparation' },
  facilitator_board: [
    { participant_id: '1', first_name: 'sophie', last_name: 'bourger', timeline: ['t1', 't2'], phases: { t1: 'preparation', t2: 'cadrage' }, submitted: false, errors_count: 0 },
    { participant_id: '2', display_name: 'anne MARTIN', timeline: ['t2', 't3', 't4'], phases: {}, submitted: true, errors_count: 2 },
  ],
};
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const { locale, role, theme, width } of [
    { locale: 'fr', role: 'manager', theme: 'light', width: 1680 },
    { locale: 'fr', role: 'manager', theme: 'dark', width: 390 },
    { locale: 'en', role: 'manager', theme: 'light', width: 1440 },
    { locale: 'fr', role: 'participant', theme: 'light', width: 1440 },
    { locale: 'fr', role: 'participant', theme: 'dark', width: 390 },
  ]) {
    const state = { challengeKey: engineKey, config: {}, mission, timer: { status: 'running', duration_seconds: 1200, remaining_seconds: 1190 } };
    const { context, broadcast, close, receivedEvents } = await createRealtimeFixture(browser, {
      baseUrl, locale, role, theme, engineKey, state, viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
    if (role === 'manager') {
      await page.getByRole('heading', { name: locale === 'fr' ? 'Tableau de bord facilitateur' : 'Facilitator dashboard', exact: true }).waitFor();
      const cards = page.locator('[class*="facilitatorCard"]');
      const sophie = cards.filter({ has: page.getByRole('heading', { name: 'Sophie Bourger', exact: true }) });
      await sophie.waitFor();
      const progress = sophie.getByRole('progressbar');
      assert.equal(await progress.getAttribute('value'), '2');
      assert.equal(await progress.getAttribute('max'), '4');
      assert.ok((await sophie.textContent()).includes('50%'));
      assert.ok((await sophie.textContent()).includes(locale === 'fr' ? 'Non évalué' : 'Not evaluated yet'));
      const metrics = page.locator('[class*="dashboardMetrics"] article');
      assert.equal(await metrics.nth(1).locator('strong').textContent(), '4/4');
      assert.equal(await metrics.nth(2).locator('strong').textContent(), '1/2');
      assert.equal(await metrics.nth(3).locator('strong').textContent(), '2');
      await sophie.locator('summary').click();
      assert.equal(await sophie.locator('details').getAttribute('open'), null);
      await sophie.locator('summary').click();
      assert.notEqual(await sophie.locator('details').getAttribute('open'), null);
      if (width > 1000) {
        const bounds = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().toJSON()));
        assert.ok(Math.abs(bounds[0].y - bounds[1].y) < 1);
      }
      const updated = { ...mission, facilitator_board: [
        { ...mission.facilitator_board[0], timeline: ['t1', 't2', 't3', 't4'], submitted: true, errors_count: 1 },
        mission.facilitator_board[1],
      ] };
      broadcast('mission.state', { mission: updated });
      await page.waitForFunction(() => document.querySelector('[class*="participantProgress"] progress')?.value === 4);
      assert.equal(await metrics.nth(2).locator('strong').textContent(), '2/2');
      assert.equal(await metrics.nth(3).locator('strong').textContent(), '3');
      assert.ok((await sophie.textContent()).includes(locale === 'fr' ? 'Soumis' : 'Submitted'));
    } else {
      const task = page.getByRole('button', { name: /Préparer les supports/ });
      await task.click();
      const modal = page.getByRole('dialog', { name: 'Préparer les supports' });
      await modal.waitFor();
      const closeButton = modal.getByRole('button', { name: 'Fermer', exact: true });
      const closeBounds = await closeButton.boundingBox();
      const titleBounds = await modal.getByRole('heading', { name: 'Préparer les supports' }).boundingBox();
      assert.ok(closeBounds.x > titleBounds.x + titleBounds.width);
      assert.ok(Math.abs(closeBounds.y - titleBounds.y) < 5);
      const selected = modal.getByRole('button', { name: 'Préparation Sélectionnée', exact: true });
      assert.equal(await selected.getAttribute('aria-pressed'), 'true');
      assert.equal(await modal.locator('button[aria-pressed="true"]').count(), 1);
      const selectedColor = await selected.evaluate((item) => getComputedStyle(item).backgroundColor);
      const otherColor = await modal.getByRole('button', { name: 'Cadrage', exact: true }).evaluate((item) => getComputedStyle(item).backgroundColor);
      assert.notEqual(selectedColor, otherColor);
      await selected.click();
      await modal.waitFor({ state: 'hidden' });
      await task.click();
      await modal.getByRole('button', { name: 'Exécution', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      await page.waitForTimeout(150);
      assert.ok(receivedEvents.some((event) => event.type === 'mission.task.remove' && event.payload.taskId === 't1'));
      assert.ok(receivedEvents.some((event) => event.type === 'mission.task.add' && event.payload.phase === 'execution'));
      await task.click();
      await page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: /Valider le périmètre/ }).click();
      const unassignedModal = page.getByRole('dialog', { name: 'Valider le périmètre' });
      assert.equal(await unassignedModal.locator('button[aria-pressed="true"]').count(), 0);
      await unassignedModal.getByRole('button', { name: 'Fermer', exact: true }).click();
      await unassignedModal.waitFor({ state: 'hidden' });
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Horizontal overflow');
    assert.deepEqual(errors, []);
    await close();
  }
  console.log('TEST_MISSION_UX_OK');
} finally {
  await browser.close();
}
