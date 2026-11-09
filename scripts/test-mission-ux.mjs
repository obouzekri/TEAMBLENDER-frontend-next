import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'mission_critique_v1';
const tasks = [
  { id: 't1', label: 'Préparer les supports' },
  { id: 't2', label: 'Valider le périmètre', critical: true },
  { id: 't3', label: 'Lancer la mission' },
  { id: 't4', label: 'Clore la mission', dependencies: ['t3'] },
];
const mission = {
  tasks, timeline: ['t1'], phases: { t1: 'preparation' },
  facilitator_board: [
    { participant_id: '1', first_name: 'sophie', last_name: 'bourger', timeline: ['t1', 't2'], phases: { t1: 'preparation', t2: 'cadrage' }, submitted: false, errors_count: 0 },
    { participant_id: '2', display_name: 'anne MARTIN', timeline: ['t2', 't3', 't4'], phases: {}, submitted: true, errors_count: 2 },
  ],
  team: {
    placements: {
      t1: [{ name: 'Moi Même', phase: 'preparation', self: true }, { name: 'anne MARTIN', phase: 'cadrage', self: false }],
      t2: [{ name: 'anne MARTIN', phase: 'cadrage', self: false }],
    },
    placed_count: 2,
    duplicate_count: 1,
    missing_critical_count: 0,
    dependency_issues: { t1: ['t3'] },
  },
};
const refuseCookiesLabel = { fr: 'Refuser les cookies de mesure', en: 'Refuse analytics cookies' };
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
    await page.getByRole('button', { name: refuseCookiesLabel[locale], exact: true }).click({ timeout: 60000 });
    if (role === 'manager') {
      await page.getByRole('heading', { name: locale === 'fr' ? 'Tableau de bord facilitateur' : 'Facilitator dashboard', exact: true }).waitFor();
      const cards = page.locator('[class*="facilitatorCard"]');
      const sophie = cards.filter({ has: page.getByRole('heading', { name: 'Sophie Bourger', exact: true }) });
      await sophie.waitFor();
      const progress = sophie.getByRole('progressbar');
      assert.equal(await progress.getAttribute('value'), '2');
      assert.equal(await progress.getAttribute('max'), '4');
      assert.ok((await sophie.textContent()).includes('50%'));
      assert.ok((await sophie.textContent()).includes(locale === 'fr' ? 'Sur le plan d’équipe actuel' : 'In the current team plan'));
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
      const tabs = page.getByRole('tab');
      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      assert.equal(await tabs.nth(1).getAttribute('tabindex'), '0');
      assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), await tabs.nth(1).getAttribute('id'));
      const summary = page.locator('[class*="teamSummary"]').first();
      for (const text of ['Plan d’équipe', '2/4 tâches placées', '1 doublon', '0 tâches critiques à placer']) {
        assert.ok((await summary.textContent()).includes(text), `Team summary: ${text}`);
      }
      const panelText = await page.getByRole('tabpanel').textContent();
      assert.ok(panelText.includes('Doublon : aussi placée par Anne M.'), panelText);
      assert.ok(panelText.includes('Prérequis absent ou placé trop tard : Lancer la mission'), panelText);
      const rows = page.locator('[class*="backlogList"] > button');
      assert.match(await rows.nth(0).getAttribute('class'), /taskRowDuplicate/);
      assert.match(await rows.nth(1).getAttribute('class'), /taskRowTaken/);
      assert.ok((await rows.nth(1).textContent()).includes('Critique'));
      assert.ok((await rows.nth(1).textContent()).includes('Anne M. · Cadrage'));
      assert.ok((await rows.nth(3).textContent()).includes('Après : Lancer la mission'));
      const filters = page.getByRole('group', { name: 'Filtrer le backlog' });
      await filters.getByRole('button', { name: /Libres/ }).click();
      assert.equal(await rows.count(), 2);
      await filters.getByRole('button', { name: /Prises par d’autres/ }).click();
      assert.equal(await rows.count(), 2);
      await filters.getByRole('button', { name: /Les miennes/ }).click();
      assert.equal(await rows.count(), 1);
      await filters.getByRole('button', { name: /Toutes/ }).click();
      assert.equal(await rows.count(), 4);
      await tabs.nth(1).focus();
      const controls = page.getByRole('tabpanel').locator('button');
      for (const control of await controls.all()) {
        const bounds = await control.boundingBox();
        assert.ok(bounds.width >= 44 && bounds.height >= 44, `Touch target ${JSON.stringify(bounds)}`);
      }
      const taskLabel = page.getByRole('tabpanel').locator('[class*="timelineItemLabel"]');
      assert.equal(await taskLabel.evaluate((item) => getComputedStyle(item).whiteSpace), 'normal');
      await page.keyboard.press('End');
      assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
      const task = page.getByRole('button', { name: /Préparer les supports/ });
      await task.click();
      const modal = page.getByRole('dialog', { name: 'Préparer les supports' });
      await modal.waitFor();
      assert.ok((await modal.textContent()).includes('Déjà placée par Anne M.'));
      const closeButton = modal.getByRole('button', { name: 'Fermer', exact: true });
      const closeBounds = await closeButton.boundingBox();
      assert.ok(closeBounds.width >= 44 && closeBounds.height >= 44);
      await closeButton.focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await modal.locator('button').last().evaluate((item) => document.activeElement === item), true);
      await page.keyboard.press('Tab');
      assert.equal(await closeButton.evaluate((item) => document.activeElement === item), true);
      const titleBounds = await modal.getByRole('heading', { name: 'Préparer les supports' }).boundingBox();
      assert.ok(closeBounds.x > titleBounds.x + titleBounds.width);
      assert.ok(Math.abs(closeBounds.y - titleBounds.y) < 5);
      const selected = modal.getByRole('button', { name: 'Planification Sélectionnée', exact: true });
      assert.equal(await selected.getAttribute('aria-pressed'), 'true');
      assert.equal(await modal.locator('button[aria-pressed="true"]').count(), 1);
      const selectedColor = await selected.evaluate((item) => getComputedStyle(item).backgroundColor);
      const otherColor = await modal.getByRole('button', { name: 'Cadrage', exact: true }).evaluate((item) => getComputedStyle(item).backgroundColor);
      assert.notEqual(selectedColor, otherColor);
      await selected.click();
      await modal.waitFor({ state: 'hidden' });
      assert.equal(await task.evaluate((item) => document.activeElement === item), true, 'Modal must restore focus');
      await task.click();
      await modal.getByRole('button', { name: 'Jour J', exact: true }).click();
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

  const completedMission = {
    ...mission,
    result: null,
    submitted: true,
    submitted_count: 2,
    participant_count: 2,
    collective_result: {
      score: 84,
      strengths: ['Bon séquencement'],
      weaknesses: ['Quelques dépendances à revoir'],
      errors: [],
      timeline: ['t1', 't2', 't3', 't4'],
      timeline_phases: ['cadrage', 'preparation', 'execution', 'cloture'],
    },
  };
  const { context, close } = await createRealtimeFixture(browser, {
    baseUrl,
    locale: 'fr',
    role: 'participant',
    theme: 'dark',
    engineKey,
    state: {
      challengeKey: engineKey,
      config: {},
      mission: completedMission,
      summary: {
        collective_score: 84,
        mission_debrief: {
          indicators: {
            time_management: { score: 72, components: { quick_start: 90, steady_pace: 25, finished_in_time: 100 } },
            communication: { score: 64, components: { participation: 100, chat_balance: 42, responsiveness: 50 } },
            coordination: { score: 85, components: { coverage: 100, no_duplicates: 100, handoffs: 80, workload_balance: 60 } },
            rigor: { score: 90, components: { dependencies: 88, critical_tasks: 92 } },
            shared_leadership: { score: null, components: { early_engagement: null, activity_balance: null, role_clarity: null } },
          },
          facts: {
            participant_count: 2, duration_seconds: 1200, time_used_seconds: 1080, first_action_seconds: 42, late_actions_percent: 38,
            message_count: 12, chat_authors: 2, top_speaker_percent: 61, tasks_total: 4, tasks_placed: 4, duplicates: 0,
            handoffs_total: 5, handoffs_respected: 4, dependencies_total: 8, dependencies_respected: 7, critical_total: 2, critical_placed: 2, revisions: 3,
          },
          moments: [
            { key: 'first_message', t: 12 },
            { key: 'first_action', t: 42 },
            { key: 'end', t: 1080, reason: 'all_submitted' },
          ],
        },
      },
      timer: { status: 'completed', duration_seconds: 1200, remaining_seconds: 120 },
    },
    viewport: { width: 390, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/fr/challenges/${engineKey}?sessionId=42`);
  await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
  await page.getByRole('heading', { name: "Débrief de l'équipe", exact: true }).waitFor();
  assert.equal(await page.getByRole('tab').count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'Backlog mission', exact: true }).count(), 0);
  assert.equal(await page.getByText('Plan d’équipe', { exact: true }).count(), 1);
  await page.getByRole('heading', { name: 'Indicateurs d’équipe', exact: true }).waitFor();
  assert.equal(await page.locator('[class*="indicatorCard"]').count(), 5);
  assert.equal(await page.getByText('Non mesuré', { exact: true }).first().isVisible(), true);
  assert.equal(await page.getByText('Relais entre coéquipiers respectés : 4/5', { exact: true }).count(), 1);
  assert.equal(await page.getByText('Plan validé par toute l’équipe', { exact: true }).count(), 1);
  const questions = page.locator('[class*="questionList"] li');
  assert.equal(await questions.count(), 2);
  assert.ok((await questions.first().textContent()).startsWith('Communication'));
  assert.equal(await page.locator('[class*="resultTimelineItem"]').count(), 4);
  assert.equal(await page.getByText('Bon séquencement', { exact: true }).count(), 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Horizontal overflow in debrief');
  await close();
  console.log('TEST_MISSION_UX_OK');
} finally {
  await browser.close();
}
