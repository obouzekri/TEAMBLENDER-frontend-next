import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const require = createRequire(import.meta.url);
const { SECRET_ROOM_II_ENIGMES } = require('../../backend/data/secret-room-ii');
const { interactiveAnswerKey } = require('../../backend/src/challenges/engines/escape_room_v1/interactive-answers');
const engine = require('../../backend/src/challenges/engines/escape_room_v1');
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const path = ['a', 'b', 'c', 'd', 'e', 'b', 'd', 'a', 'c'];

async function createFixture({ locale, role, width, theme }) {
  const config = engine.buildRuntimeConfig({
    locale, name: 'Salle Secrète II',
    engine_config: { title: 'Salle Secrète II', enigmes: SECRET_ROOM_II_ENIGMES, chat: { enabled: false } }
  });
  let index = 0;
  let status = 'in_progress';
  let forcedError = false;
  const submissions = [];
  const snapshot = () => ({
    status,
    current_enigme_index: index,
    total_enigmes: 3,
    current_enigme: engine.sanitizeForClient(config).enigmes[index],
    timer: { status: status === 'paused' ? 'paused' : 'running', duration_seconds: 1200, remaining_seconds: 1100 },
    submission_status: { total: 1, responded: 0, responded_ids: [] }
  });
  const fixture = await createRealtimeFixture(browser, {
    baseUrl, locale, role, engineKey: 'escape_room_v1', theme,
    state: { ...snapshot(), config: engine.sanitizeForClient(config) }, viewport: { width, height: 1050 }
  });
  await fixture.context.route('**/api/**/escape-room/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').pop();
    if (action === 'participants') return route.fulfill({ json: { participants: [{ id: 1, first_name: 'Test' }] } });
    if (action === 'state') return route.fulfill({ json: snapshot() });
    if (action === 'submit') {
      const payload = route.request().postDataJSON();
      submissions.push(payload);
      if (forcedError) return route.fulfill({ status: 503, json: { error: 'Test service unavailable' } });
      const enigme = config.enigmes[index];
      const key = enigme.ui_type === 'letter_sequence'
        ? payload.answer.trim().toUpperCase()
        : interactiveAnswerKey(payload.answer, enigme);
      const outcome = key === enigme.expected_answer ? (index === 2 ? 'escaped' : 'correct') : 'wrong';
      if (outcome === 'correct') index += 1;
      if (outcome === 'escaped') status = 'escaped';
      return route.fulfill({ json: { submitted: true, validation: { outcome, attempts: 1, max_attempts: 3 } } });
    }
    return route.fulfill({ json: { ok: true } });
  });
  const page = await fixture.context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const challengePath = '/challenges/escape_room_v1?sessionId=42';
  const localizedResponse = await page.goto(`${baseUrl}/${locale}${challengePath}`, { waitUntil: 'domcontentloaded' });
  if (localizedResponse && localizedResponse.status() === 404) {
    await page.goto(`${baseUrl}${challengePath}`, { waitUntil: 'domcontentloaded' });
  }
  await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
  await page.getByText(config.enigmes[0].description, { exact: true }).waitFor();
  return {
    ...fixture, page, errors, config, submissions,
    setPaused: (paused) => {
      status = paused ? 'paused' : 'in_progress';
      fixture.replaceState({ ...snapshot(), config: engine.sanitizeForClient(config) });
    },
    setIndex: (next) => {
      index = next;
      fixture.replaceState({ ...snapshot(), config: engine.sanitizeForClient(config) });
    },
    setForcedError: (value) => { forcedError = value; }
  };
}

function submitButton(page, isEn) {
  return page.getByRole('button', { name: isEn ? '✓ Submit' : '✓ Soumettre', exact: true });
}

async function draw(fixture, { keyboard = false, touch = false } = {}) {
  const { page } = fixture;
  if (keyboard) {
    for (const id of path) {
      const corner = page.getByRole('button', { name: new RegExp(`^(Sommet|Corner) ${id.toUpperCase()}$`) });
      await corner.focus();
      await corner.press('Enter');
    }
    return;
  }
  const board = page.locator('[class*="houseBoard"]');
  await board.scrollIntoViewIfNeeded();
  const bounds = await board.boundingBox();
  const nodes = fixture.config.enigmes[0].ui_data.nodes;
  const point = (id) => {
    const node = nodes.find((item) => item.id === id);
    return { x: bounds.x + node.x * bounds.width / 300, y: bounds.y + node.y * bounds.height / 300 };
  };
  if (touch) {
    for (const [i, id] of path.entries()) {
      const { x, y } = point(id);
      await board.dispatchEvent(i === 0 ? 'pointerdown' : 'pointermove', { pointerId: 4, pointerType: 'touch', clientX: x, clientY: y, button: 0 });
    }
    const end = point(path[path.length - 1]);
    await board.dispatchEvent('pointerup', { pointerId: 4, pointerType: 'touch', clientX: end.x, clientY: end.y, button: 0 });
  } else {
    const start = point(path[0]);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const id of path.slice(1)) {
      const next = point(id);
      await page.mouse.move(next.x, next.y, { steps: 15 });
    }
    await page.mouse.up();
  }
}

async function fillExpression(page, isEn, { drag = false, expression = ['5', '*', '(', '5', '-', '(', '1', '/', '5', ')', ')'] } = {}) {
  let five = 0;
  const signs = { '*': '×', '/': '÷', '-': '−', '+': '+', '(': '(', ')': ')' };
  for (const [i, value] of expression.entries()) {
    let name;
    if (value === '5') name = `${isEn ? 'Number' : 'Chiffre'} 5 (${++five})`;
    else if (value === '1') name = `${isEn ? 'Number' : 'Chiffre'} 1 (4)`;
    else name = `${isEn ? 'Symbol' : 'Signe'} ${signs[value]}`;
    const token = page.getByRole('button', { name, exact: true });
    const slot = page.getByRole('button', { name: `${isEn ? 'Slot' : 'Case'} ${i + 1}`, exact: true });
    if (drag) await token.dragTo(slot);
    else {
      await token.focus();
      await token.press('Enter');
      await slot.focus();
      await slot.press('Enter');
    }
  }
}

try {
  for (const scenario of [
    { locale: 'fr', role: 'participant', width: 1440, theme: 'light' },
    { locale: 'fr', role: 'participant', width: 375, theme: 'dark', keyboard: true },
    { locale: 'en', role: 'participant', width: 375, theme: 'light', keyboard: true },
    { locale: 'en', role: 'manager', width: 1440, theme: 'dark' }
  ]) {
    const fixture = await createFixture(scenario);
    try {
      const { page, config } = fixture;
      const isEn = scenario.locale === 'en';
      const submit = submitButton(page, isEn);
      assert.equal(await page.getByRole('heading', { name: 'Salle Secrète II', exact: true }).count(), 1);
      if (scenario.role === 'manager') {
        assert.equal(await submit.count(), 0);
        for (const index of [0, 1, 2]) {
          fixture.setIndex(index);
          await page.getByText(config.enigmes[index].description, { exact: true }).waitFor();
          if (index === 2) {
            assert.equal(await page.locator('[class*="slot"]').count(), 11);
            assert.equal(await page.locator('[class*="token"]:enabled').count(), 0);
          }
        }
      } else {
        assert.ok(await submit.isDisabled(), 'Cannot submit an incomplete drawing');
        const first = page.getByRole('button', { name: isEn ? 'Corner A' : 'Sommet A', exact: true });
        await first.click();
        await page.getByText(isEn ? 'Stroke interrupted. Restart to draw without lifting.' : 'Trait interrompu. Recommencez pour tracer sans lever le doigt.', { exact: true }).waitFor();
        assert.ok(await submit.isDisabled(), 'Lifting early must not produce an answer');
        await page.getByRole('button', { name: isEn ? 'Restart drawing' : 'Recommencer le dessin', exact: true }).click();
        await draw(fixture, { keyboard: scenario.keyboard });
        assert.ok(await submit.isEnabled());
        await submit.click();
        await page.getByText(config.enigmes[1].description, { exact: true }).waitFor();
        const answer = page.getByRole('textbox', { name: isEn ? 'Your proposal' : 'Votre proposition', exact: true });
        await answer.fill('m');
        assert.equal(await answer.inputValue(), 'M');
        await submit.click();
        await page.getByText(config.enigmes[2].description, { exact: true }).waitFor();
        assert.equal(await page.locator('[class*="slot"]').count(), 11);
        assert.ok(await submit.isDisabled(), 'Cannot submit an incomplete expression');
        await fillExpression(page, isEn, { drag: !scenario.keyboard, expression: ['(', '5', '*', '5', ')', '-', '(', '5', '/', '1', ')'] });
        await submit.click();
        await page.getByRole('button', { name: isEn ? 'Clear expression' : 'Effacer le calcul', exact: true }).waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.querySelector('button[class*="primaryBtn"]')?.disabled);
        assert.equal(fixture.submissions.at(-1).answer, '(5*5)-(5/1)');
        await page.getByRole('button', { name: isEn ? 'Clear expression' : 'Effacer le calcul', exact: true }).click();
        await fillExpression(page, isEn, { drag: !scenario.keyboard });
        assert.ok(await submit.isEnabled());
        fixture.setPaused(true);
        await page.waitForFunction(() => document.querySelector('button[class*="slot"]')?.disabled);
        assert.ok(await submit.isDisabled(), 'Pause blocks submission and editing');
        fixture.setPaused(false);
        await page.waitForFunction(() => !document.querySelector('button[class*="slot"]')?.disabled);
        fixture.setForcedError(true);
        await submit.click();
        await page.getByText('Test service unavailable', { exact: true }).waitFor();
        await page.waitForFunction(() => !document.querySelector('button[class*="primaryBtn"]')?.disabled);
        assert.equal(await page.locator('[class*="slot"] > span').count(), 0, 'Retain filled slots after network failure');
        fixture.setForcedError(false);
        await submit.click();
        await page.getByRole('heading', { name: isEn ? 'Team debrief' : "Débrief de l'équipe", exact: true }).waitFor();
        assert.equal(fixture.submissions.at(-1).answer, '5*(5-(1/5))');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
      assert.deepEqual(fixture.errors, []);
      console.log(`ESCAPE_ROOM_II_UX_OK ${JSON.stringify(scenario)}`);
    } finally {
      await fixture.close();
    }
  }
} finally {
  await browser.close();
}
