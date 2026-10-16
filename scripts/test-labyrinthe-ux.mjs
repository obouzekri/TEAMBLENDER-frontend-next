import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'labyrinthe_live_v1';
const cells = Array.from({ length: 10 }, (_, row) => Array.from({ length: 10 }, (_, col) => ({
  n: row > 0, e: col < 9, s: row < 9, w: col > 0,
})));
for (let row = 2; row < 10; row += 1) {
  for (let col = 0; col < 10; col += 1) {
    if (col === (row % 2 ? 0 : 9)) continue;
    cells[row][col].n = false;
    cells[row - 1][col].s = false;
  }
}
cells[2][2].e = false;
cells[2][3].w = false;
cells[2][2].s = false;
cells[3][2].n = false;
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
  for (const { locale, role, theme = 'light', width = 1440, size = 10 } of [
    { locale: 'fr', role: 'manager', theme: 'light' },
    { locale: 'fr', role: 'manager', theme: 'dark' },
    { locale: 'fr', role: 'manager', theme: 'dark', width: 375, size: 20 },
    { locale: 'fr', role: 'manager', theme: 'light', width: 375 },
    { locale: 'fr', role: 'participant' },
    { locale: 'en', role: 'participant' },
  ]) {
    const fixtureState = structuredClone(state);
    if (size === 20) {
      fixtureState.labyrinthe.cfg = { rows: size, cols: size };
      fixtureState.labyrinthe.maze.cells = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => ({
        n: row > 0, e: col < size - 1, s: row < size - 1, w: col > 0,
      })));
    }
    const { context, broadcast, replaceState, broadcastError, receivedEvents, close } = await createRealtimeFixture(browser, {
      baseUrl, locale, role, engineKey, state: fixtureState, theme, viewport: { width, height: 1000 },
    });
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
      const lives = page.locator('[class*="playerLives"]').first();
      assert.equal(await lives.evaluate((item) => getComputedStyle(item).borderTopWidth), '0px');
      const miniGrid = page.locator('[class*="miniGridCard"] > [class*="miniGrid"]').first();
      const geometry = await miniGrid.evaluate((grid) => {
        const cells = [...grid.children];
        const first = cells[0].getBoundingClientRect();
        const second = cells[1].getBoundingClientRect();
        const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        const nextRow = cells[columns].getBoundingClientRect();
        return {
          horizontalGap: second.left - first.right,
          verticalGap: nextRow.top - first.bottom,
          squareError: first.width - first.height,
          overflow: grid.scrollWidth - grid.clientWidth,
          firstRight: getComputedStyle(cells[0]).borderRightWidth,
          lastRight: getComputedStyle(cells[columns - 1]).borderRightWidth,
        };
      });
      assert.ok(Math.abs(geometry.horizontalGap) < 0.1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.verticalGap) < 0.1, JSON.stringify(geometry));
      assert.ok(Math.abs(geometry.squareError) < 0.1, JSON.stringify(geometry));
      assert.ok(geometry.overflow <= 1, JSON.stringify(geometry));
      assert.equal(geometry.firstRight, '0px');
      assert.equal(geometry.lastRight, '2px');
      if (size === 10) {
        assert.equal(await miniGrid.locator('[aria-label="Case 3-3"]').evaluate((cell) => getComputedStyle(cell).borderRightWidth), '0px');
        assert.equal(await miniGrid.locator('[aria-label="Case 3-4"]').evaluate((cell) => getComputedStyle(cell).borderLeftWidth), '2px');
        assert.equal(await miniGrid.locator('[aria-label="Case 4-3"]').evaluate((cell) => getComputedStyle(cell).borderTopWidth), '2px');
      }
      assert.equal(await page.locator('[class*="cellPlayerDot"]').count(), 2, 'Facilitator sees each participant marker');
      const bomb = page.locator('[class*="cellTrapKnownIcon"]').first();
      assert.ok(await bomb.count());
      assert.ok(await bomb.evaluate((item) => item.getBoundingClientRect().width / item.parentElement.getBoundingClientRect().width) < 0.7);
      if (process.env.LABY_SCREENSHOT_DIR) {
        await page.screenshot({ path: `${process.env.LABY_SCREENSHOT_DIR}\\maze-${theme}-${width}.png`, fullPage: true });
      }
    } else {
      await page.locator('[class*="gameGrid"]').waitFor();
      const startCell = page.getByRole('button', { name: locale === 'fr' ? /Case 1-1, départ, votre position, visitée/ : /Cell 1-1, start, your position, visited/ });
      await startCell.waitFor();
      const hiddenTrap = page.getByRole('button', { name: locale === 'fr' ? /^Case 2-2$/ : /^Cell 2-2$/ });
      assert.ok(await hiddenTrap.count(), 'Hidden trap must not be announced');
      await page.getByText(locale === 'fr' ? 'Légende et commandes' : 'Legend and controls', { exact: true }).click();
      await page.getByText(locale === 'fr' ? /Avancez d’une case voisine/ : /Move one adjacent cell/).waitFor();
      const ownMarker = page.locator('[class*="gameGrid"] [class*="cellPlayerDot"][aria-label="Élodie Dupont"]');
      const waitForPosition = async (row, col) => {
        await page.waitForFunction(({ row, col }) => {
          const marker = document.querySelector('[class*="gameGrid"] [class*="cellPlayerDot"][aria-label="Élodie Dupont"]');
          const grid = document.querySelector('[class*="gameGrid"]');
          return marker?.parentElement === grid?.children[row * 10 + col];
        }, { row, col }, { timeout: 1000 });
      };
      // No server replies: both key presses and the adjacent-cell click must render locally.
      const movementLatency = await page.evaluate(async (label) => {
        const button = document.querySelector(`button[aria-label="${label}"]`);
        const started = performance.now();
        button.click();
        while (performance.now() - started < 500) {
          await new Promise(requestAnimationFrame);
          const marker = document.querySelector('[class*="gameGrid"] [class*="cellPlayerDot"][aria-label="Élodie Dupont"]');
          if (marker?.parentElement === document.querySelector('[class*="gameGrid"]').children[1]) return performance.now() - started;
        }
        return 500;
      }, locale === 'fr' ? 'Aller à droite' : 'Move right');
      assert.ok(movementLatency < 100, `Local arrow-button response: ${movementLatency.toFixed(1)}ms`);
      console.log(`LABY_MOVE_LATENCY_${locale}: ${movementLatency.toFixed(1)}ms`);
      await waitForPosition(0, 1);
      await page.keyboard.press('ArrowRight');
      await waitForPosition(0, 2);
      await page.getByRole('button', { name: locale === 'fr' ? /^Case 1-4$/ : /^Cell 1-4$/ }).click();
      await waitForPosition(0, 3);
      assert.equal(receivedEvents.filter((event) => event.type === 'laby.solo.move').length, 3);
      replaceState({ ...state, timer: { ...state.timer, remaining_seconds: 1099 } });
      await page.waitForTimeout(150);
      await waitForPosition(0, 3);
      const confirmPosition = (col) => replaceState({
        ...state,
        labyrinthe: {
          ...state.labyrinthe,
          parts: { ...state.labyrinthe.parts, '1': { ...state.labyrinthe.parts['1'], solo: {
            ss: true, pos: [0, col], path: Array.from({ length: col + 1 }, (_, index) => [0, index]),
          } } },
        },
      });
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'free', position: [0, 1] });
      confirmPosition(1);
      await page.waitForTimeout(150);
      await waitForPosition(0, 3);
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'free', position: [0, 3] });
      confirmPosition(3);
      await page.waitForTimeout(150);
      await waitForPosition(0, 3);
      for (let sample = 0; sample < 3; sample += 1) {
        const offset = await ownMarker.evaluate((marker) => {
          const dot = marker.getBoundingClientRect();
          const cell = marker.parentElement.getBoundingClientRect();
          return { x: dot.left + dot.width / 2 - cell.left - cell.width / 2, y: dot.top + dot.height / 2 - cell.top - cell.height / 2 };
        });
        assert.ok(Math.abs(offset.x) < 0.1 && Math.abs(offset.y) < 0.1, JSON.stringify(offset));
        await page.waitForTimeout(120);
      }
      await page.keyboard.press('ArrowDown');
      await waitForPosition(1, 3);
      broadcast('laby.solo.resolved', { participant_id: '1', outcome: 'backtrack', position: [0, 3] });
      await waitForPosition(0, 3);
      await page.keyboard.press('ArrowDown');
      await waitForPosition(1, 3);
      broadcastError('Deplacement indisponible pour le moment');
      await page.getByText('Deplacement indisponible pour le moment', { exact: true }).waitFor();
      await waitForPosition(0, 3);
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
