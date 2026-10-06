import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'labyrinthe_live_v1';
const cells = Array.from({ length: 10 }, (_, row) => Array.from({ length: 10 }, (_, col) => ({
  n: row > 0, e: col < 9, s: row < 9, w: col > 0,
})));
const state = {
  challengeKey: engineKey,
  config: { chat: { enabled: false } },
  timer: { status: 'running', duration_seconds: 1200, remaining_seconds: 1100 },
  labyrinthe: {
    phase: 'active', level: 1, levels_total: 3, cfg: { rows: 10, cols: 10 },
    maze: { cells, start: [0, 0], start_points: [[0, 0]], end: [9, 9], traps: { '1,1': true }, safe_path: [[0, 0], [0, 1]] },
    parts: {
      '1': { name: 'élodie DUPONT', lives_remaining: 3, slot: 1, solo: { ss: true, pos: [0, 0], path: [[0, 0]] } },
      '2': { name: 'jean-pierre martin', lives_remaining: 2, slot: 2, solo: { ss: true, pos: [0, 0], path: [[0, 0]] } },
    },
  },
};

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const { locale, role } of [
    { locale: 'fr', role: 'manager' },
    { locale: 'fr', role: 'participant' },
    { locale: 'en', role: 'participant' },
  ]) {
    const { context, broadcast, close } = await createRealtimeFixture(browser, { baseUrl, locale, role, engineKey, state });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
    if (role === 'manager') {
      await page.getByRole('heading', { name: 'Tableau de bord facilitateur', exact: true }).waitFor();
      assert.ok(await page.getByText('Élodie Dupont', { exact: true }).count());
      assert.ok(await page.getByText('Jean-Pierre Martin', { exact: true }).count());
      const hearts = page.locator('[class*="playerHearts"]').first();
      assert.equal(await hearts.textContent(), '❤️❤️❤️');
      assert.ok(await hearts.evaluate((item) => Number.parseFloat(getComputedStyle(item).fontSize)) >= 18);
      const bomb = page.locator('[class*="cellTrapKnownIcon"]').first();
      assert.ok(await bomb.count());
      assert.ok(await bomb.evaluate((item) => item.getBoundingClientRect().width / item.parentElement.getBoundingClientRect().width) < 0.7);
    } else {
      await page.locator('[class*="gameGrid"]').waitFor();
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'move', position: [0, 1] });
      await page.getByText('Déplacement validé. Continuez vers la sortie.', { exact: true }).waitFor();
      assert.equal(await page.getByText('✨ Bien joué', { exact: true }).count(), 0);
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'wall', position: [0, 1] });
      await page.getByText('🚧 Impasse', { exact: true }).waitFor();
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'level_complete', level: 2, levels_total: 3 });
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.getByRole('heading', { name: locale === 'fr' ? 'Félicitations, niveau franchi !' : 'Congratulations, level cleared!', exact: true }).waitFor();
      await dialog.getByText(locale === 'fr' ? 'Vous accédez désormais au niveau 2 sur 3. Choisissez votre prochain point de départ.' : 'You now advance to level 2 of 3. Choose your next starting point.', { exact: true }).waitFor();
      assert.equal(await dialog.getByText(locale === 'fr' ? 'Victoire collective' : 'Collective victory', { exact: true }).count(), 0);
      await dialog.getByRole('button', { name: locale === 'fr' ? 'Continuer' : 'Continue', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'trap', remaining_lives: 0, position: [1, 1] });
      await dialog.getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true }).waitFor();
      await dialog.getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true }).click();
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'trap', remaining_lives: 0, all_lost: true, position: [1, 1] });
      const failureTitle = locale === 'fr' ? 'Challenge non réussi' : 'Challenge not completed';
      const failureBody = locale === 'fr'
        ? "Votre équipe n'a pas réussi à atteindre l'objectif avant l'épuisement des vies ou du temps imparti."
        : 'Your team did not reach the objective before running out of lives or allotted time.';
      await dialog.getByRole('heading', { name: failureTitle, exact: true }).waitFor();
      await dialog.getByText(failureBody, { exact: true }).waitFor();
      await dialog.getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true }).click();
      broadcast('laby.state', { state: { ...state.labyrinthe, phase: 'done', result: { status: 'failure', reason: 'timeout' } } });
      await dialog.getByRole('heading', { name: failureTitle, exact: true }).waitFor();
      await dialog.getByText(failureBody, { exact: true }).waitFor();
    }
    assert.deepEqual(errors, []);
    await close();
  }
  console.log('TEST_LABYRINTHE_UX_OK');
} finally {
  await browser.close();
}
