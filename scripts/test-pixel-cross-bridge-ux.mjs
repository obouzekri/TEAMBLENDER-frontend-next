import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const require = createRequire(import.meta.url);
const engine = require('../../backend/src/challenges/engines/pixel_architect_v1');
const { buildInitialPixelState, buildPixelTemplateCells, rebuildPixelCounters } =
  require('../../backend/src/challenges/engines/pixel_architect_v1/server-runtime');
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const artifactDir = process.env.PIXEL_UX_ARTIFACT_DIR;
if (artifactDir) await mkdir(artifactDir, { recursive: true });

async function testCrossBridge(locale, width, disableWebgl, templateId = 'pont_croise') {
  const config = engine.buildRuntimeConfig({ engine_config: { replication: { templateId } } });
  const pixel = buildInitialPixelState(config);
  pixel.phase = 'building';
  const timer = { enabled: true, status: 'running', duration_seconds: 900, remaining_seconds: 890 };
  const fixture = await createRealtimeFixture(browser, {
    baseUrl, locale, role: 'participant', engineKey: 'pixel_architect_v1',
    state: { config, timer, pixel }, viewport: { width, height: 1000 },
    theme: disableWebgl ? 'dark' : 'light'
  });
  const page = await fixture.context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await fixture.context.route('**/runtime-challenge', (route) => route.fulfill({ json: {
      engine_key: 'pixel_architect_v1', challenge_id: 7, session_id: 42, config,
      context: { role: 'participant', participantId: '1', locale }
    } }));
    if (disableWebgl) {
      await fixture.context.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return String(type).toLowerCase().includes('webgl') ? null : getContext.call(this, type, ...args);
        };
      });
    }
    await page.goto(`${baseUrl}/${locale}/challenges/pixel_architect_v1?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
    const navigation = page.getByRole('group', { name: locale === 'en' ? 'Layer navigation' : 'Navigation des couches' });
    await navigation.waitFor();
    const layers = page.locator('[data-active-layer]');
    const serverKeys = new Set(buildPixelTemplateCells(pixel.selected_template));
    const expectedCount = templateId === 'pont_croise' ? 48 : 24;
    const usedLayers = [...new Set([...serverKeys].map((key) => Number(key.split(':')[1])))].sort((a, b) => a - b);
    assert.equal(await layers.count(), usedLayers.length);
    assert.equal(await navigation.locator('option').count(), usedLayers.length);
    assert.equal(await navigation.locator('option').last().getAttribute('value'), templateId === 'pont_croise' ? '4' : '3');
    assert.equal(await navigation.getByRole('button').count(), 0, 'Layer navigation uses the selector only');
    assert.equal(serverKeys.size, expectedCount);
    const renderedKeys = new Set();
    await navigation.locator('select').selectOption(String(usedLayers[1]));
    assert.equal(await navigation.locator('select').inputValue(), String(usedLayers[1]));
    await navigation.locator('select').selectOption(String(usedLayers[0]));
    assert.equal(await navigation.locator('select').inputValue(), String(usedLayers[0]));

    for (const [index, y] of usedLayers.entries()) {
      await navigation.locator('select').selectOption(String(y));
      assert.equal(await navigation.locator('[aria-live="polite"]').innerText(), `${index + 1} / ${usedLayers.length}`);
      const card = layers.nth(index);
      assert.ok(await card.isVisible(), `Layer ${y + 1} must be accessible`);
      const buttons = card.getByRole('grid').getByRole('button');
      assert.equal(await buttons.count(), pixel.grid.x * pixel.grid.z);
      const labels = await buttons.evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')));
      for (const label of labels.filter((item) => /, (target|cible)$/.test(item))) {
        const [, x, z] = label.match(/x(\d+) z(\d+)/);
        renderedKeys.add(`${Number(x) - 1}:${y}:${Number(z) - 1}`);
      }
      if (width < 640) {
        for (let other = 0; other < usedLayers.length; other += 1) {
          assert.equal(await layers.nth(other).isVisible(), other === index);
        }
      }
    }
    assert.equal(await next.isDisabled(), true);
    assert.deepEqual(renderedKeys, serverKeys, 'Every frontend target must match server evaluation');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');

    if (disableWebgl) {
      await page.getByText(locale === 'en' ? /You can keep playing with the layer grids below/ : /Vous pouvez continuer à jouer avec les grilles/).waitFor();
      assert.equal(await page.locator('canvas').count(), 0);
    } else {
      assert.ok(await page.locator('canvas').count() > 0, '3D rendering must be available');
      if (width < 640) {
        await page.getByRole('button', { name: locale === 'en' ? 'Open model map' : 'Ouvrir la carte modele' }).click();
        const dialog = page.getByRole('dialog', { name: locale === 'en' ? 'Model map' : 'Carte modele' });
        await dialog.locator('canvas').waitFor();
        if (artifactDir) await dialog.screenshot({ path: path.join(artifactDir, `cross-bridge-${locale}-${width}-model.png`) });
        await dialog.getByRole('button', { name: locale === 'en' ? 'Close' : 'Fermer', exact: true }).click();
      } else if (artifactDir) {
        await page.locator('[class*="modelSidebarViewport"]').screenshot({ path: path.join(artifactDir, `cross-bridge-${locale}-${width}-model.png`) });
      }
    }
    if (artifactDir) await page.screenshot({ path: path.join(artifactDir, `${templateId}-${locale}-${width}-${disableWebgl ? '2d' : '3d'}.png`), fullPage: true });

    for (const [index, y] of usedLayers.entries()) {
      await navigation.locator('select').selectOption(String(y));
      for (const key of serverKeys) {
        const [x, layer, z] = key.split(':').map(Number);
        if (layer !== y) continue;
        const label = locale === 'en'
          ? `Layer ${y + 1}, cell x${x + 1} z${z + 1}, target`
          : `Couche ${y + 1}, case x${x + 1} z${z + 1}, cible`;
        await layers.nth(index).getByRole('button', { name: label, exact: true }).click();
      }
    }
    const expectedPlacements = expectedCount;
    const deadline = Date.now() + 5000;
    while (fixture.receivedEvents.filter((event) => event.type === 'pixel.cube.place').length < expectedPlacements && Date.now() < deadline) {
      await page.waitForTimeout(50);
    }
    const placements = fixture.receivedEvents.filter((event) => event.type === 'pixel.cube.place');
    assert.equal(placements.length, expectedPlacements);
    for (const { payload: cube } of placements) pixel.cubes[`${cube.x}:${cube.y}:${cube.z}`] = cube;
    rebuildPixelCounters(pixel);
    assert.equal(pixel.evaluation.perfect_match, true);
    assert.equal(pixel.remaining_cubes, pixel.max_cubes - expectedCount);
    fixture.replaceState({ config, timer, pixel });
    await page.locator('[class*="layerQuickCellCorrect"]').first().waitFor({ state: 'attached' });
    assert.equal(await page.locator('[class*="layerQuickCellCorrect"]').count(), expectedCount);

    // Existing mistakes on otherwise unused layers must remain removable.
    const extraLayer = pixel.grid.y - 1;
    pixel.cubes[`0:${extraLayer}:0`] = { x: 0, y: extraLayer, z: 0, color: pixel.palette[0] };
    rebuildPixelCounters(pixel);
    fixture.replaceState({ config, timer, pixel });
    await navigation.locator(`option[value="${extraLayer}"]`).waitFor({ state: 'attached' });
    await navigation.locator('select').selectOption(String(extraLayer));
    assert.equal(await navigation.locator('select').inputValue(), String(extraLayer));
    await layers.last().getByRole('button', { name: /x1 z1,/ }).click();
    const removalDeadline = Date.now() + 5000;
    while (!fixture.receivedEvents.some((event) => event.type === 'pixel.cube.remove') && Date.now() < removalDeadline) {
      await page.waitForTimeout(50);
    }
    assert.ok(fixture.receivedEvents.some((event) => event.type === 'pixel.cube.remove' && event.payload.y === extraLayer));
    delete pixel.cubes[`0:${extraLayer}:0`];
    rebuildPixelCounters(pixel);
    fixture.replaceState({ config, timer, pixel });
    await navigation.locator(`option[value="${extraLayer}"]`).waitFor({ state: 'detached' });
    assert.equal(await navigation.locator('select').inputValue(), String(usedLayers[0]));

    pixel.mode = 'creatif';
    fixture.replaceState({ config, timer, pixel });
    await navigation.locator(`option[value="${extraLayer}"]`).waitFor({ state: 'attached' });
    assert.equal(await layers.count(), pixel.grid.y);
    assert.deepEqual(errors, []);
    console.log(`PASS ${templateId} ${locale} ${width}px ${disableWebgl ? 'without WebGL' : '3D'}: ${expectedCount} targets, useful layers, navigation, cleanup and creative mode`);
  } catch (error) {
    console.error(`FAIL ${locale} ${width}px: ${page.url()}`, errors);
    console.error((await page.locator('body').innerText()).slice(0, 2500));
    throw error;
  } finally {
    await fixture.close();
  }
}

try {
  for (const [locale, width] of [['fr', 1440], ['en', 390]]) {
    await testCrossBridge(locale, width, false);
    await testCrossBridge(locale, width, true);
    await testCrossBridge(locale, width, true, 'tour_signal');
  }
} finally {
  await browser.close();
}
