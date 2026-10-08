import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const require = createRequire(import.meta.url);
const runtime = (engine) => require(`../../backend/src/challenges/engines/${engine}/server-runtime.js`);
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const noWebgl = process.argv.includes('--no-webgl');
const timer = { status: 'running', enabled: true, duration_seconds: 600, remaining_seconds: 590 };
const config = { chat: { enabled: true }, timer: { enabled: true, duration_seconds: 600 }, grid: { rows: 4, cols: 4 }, nombreJoueurs: 2, nombreIndices: 4 };
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

async function open(engineKey, state, { locale = 'en', role = 'participant', width = 390, disableWebgl = false, setup } = {}) {
  const fixture = await createRealtimeFixture(browser, { baseUrl, locale, role, engineKey, state, viewport: { width, height: 1000 } });
  if (disableWebgl) {
    await fixture.context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return String(type).toLowerCase().includes('webgl') ? null : getContext.call(this, type, ...args);
      };
    });
  }
  if (setup) await setup(fixture.context);
  const page = await fixture.context.newPage();
  const errors = [];
  const nestingWarnings = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/cannot.*descendant|validateDOMNesting|nested.*button/i.test(message.text())) nestingWarnings.push(message.text());
  });
  await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
  await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
  return { ...fixture, page, errors, nestingWarnings };
}

async function finish(fixture) {
  assert.deepEqual(fixture.errors, []);
  assert.deepEqual(fixture.nestingWarnings, []);
  assert.ok(await fixture.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
  await fixture.close();
}

async function eventCount(fixture, type, count) {
  const deadline = Date.now() + 5000;
  while (fixture.receivedEvents.filter((entry) => entry.type === type).length < count && Date.now() < deadline) {
    await fixture.page.waitForTimeout(50);
  }
  assert.equal(fixture.receivedEvents.filter((entry) => entry.type === type).length, count, type);
}

async function testPhrase(locale, width) {
  const engineKey = 'phrase_collaborative_v1';
  const phrase = runtime(engineKey).buildPhraseRuntime(config);
  const fixture = await open(engineKey, { config, timer, phrase }, { locale, width });
  const { page } = fixture;
  await page.getByRole('heading', { name: locale === 'en' ? 'Available words' : 'Mots disponibles', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: locale === 'en' ? 'Discover a word (4)' : 'Découvrir un mot (4)', exact: true }).isEnabled(), true);
  if (locale === 'en') {
    const body = await page.locator('body').innerText();
    for (const text of ['Mots disponibles', 'Assignée', 'Sélectionnez ou glissez']) assert.ok(!body.includes(text), text);
  }
  await page.getByText(locale === 'en' ? /The team has 4/ : /L’équipe dispose de 4/).waitFor();
  await page.locator('[class*="wordChip"]').first().click();
  await page.locator('[class*="slotMine"]').first().click();
  await eventCount(fixture, 'phrase.place', 1);
  assert.equal(await page.locator('[class*="wordChipSelected"]').count(), 1, 'Keep the word while awaiting confirmation');
  fixture.broadcast('phrase.state', { phrase });
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[class*="wordChipSelected"]').count(), 1, 'An unrelated state is not confirmation');
  fixture.broadcastError('Placement rejected');
  await page.getByRole('alert').filter({ hasText: 'Placement rejected' }).first().waitFor();
  assert.equal(await page.locator('[class*="wordChipSelected"]').count(), 1, 'Keep rejected selection');
  const retry = page.getByRole('button', { name: locale === 'en' ? 'Retry' : 'Réessayer', exact: true });
  await retry.click();
  await eventCount(fixture, 'phrase.place', 2);
  const placement = fixture.receivedEvents.find((event) => event.type === 'phrase.place').payload;
  fixture.broadcast('phrase.state', { phrase: { ...phrase, slots: phrase.slots.map((slot) => Number(slot.index) === placement.index ? { ...slot, current_word: placement.word } : slot) } });
  await page.waitForFunction(() => !document.querySelector('[class*="wordChipSelected"]'));
  await page.getByRole('status').filter({ hasText: locale === 'en' ? 'Action confirmed by the server.' : 'Action confirmée par le serveur.' }).waitFor();
  fixture.broadcast('phrase.state', { phrase: { ...phrase, hint_budget: 0 } });
  await page.getByRole('button', { name: locale === 'en' ? 'Discover a word (0)' : 'Découvrir un mot (0)', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: locale === 'en' ? 'Discover a word (0)' : 'Découvrir un mot (0)', exact: true }).isDisabled(), true);
  await finish(fixture);
}

async function testCopuzzle(locale, role, width) {
  const engineKey = 'copuzzle_live_v1';
  const pieces = runtime(engineKey).buildPieces({ ...config, participants: { expected_count: 2 } });
  const fixture = await open(engineKey, { config, timer, puzzle: { pieces } }, { locale, role, width });
  const { page } = fixture;
  await page.locator('[class*="boardPanel"]').waitFor();
  const board = await page.locator('[class*="boardPanel"]').boundingBox();
  const side = await page.locator('[class*="sidePanel"]').boundingBox();
  assert.ok(board.width >= (width < 500 ? 300 : 500), `Board width ${board.width}`);
  if (width < 500) assert.ok(side.y >= board.y + board.height - 1, 'Sidebar overlaps board');
  if (role === 'participant') {
    const piece = pieces.find((item) => Number(item.assigned_slot) === 1);
    await page.locator('[class*="trayPiece"]').first().click();
    await page.getByRole('button', { name: /^(Cell|Case) 1, 1$/ }).click();
    await eventCount(fixture, 'puzzle.place', 1);
    assert.equal(await page.locator('[class*="trayPieceSelected"]').count(), 1, 'Keep the piece while awaiting confirmation');
    if (locale === 'en') {
      await page.getByRole('alert').filter({ hasText: 'No confirmation received.' }).waitFor({ timeout: 15000 });
      assert.equal(await page.locator('[class*="trayPieceSelected"]').count(), 1, 'Keep the piece after timeout');
      fixture.broadcast('puzzle.state', { pieces: pieces.map((item) => item.id === piece.id ? { ...item, assigned_slot: 2 } : item) });
      await page.getByRole('button', { name: 'Retry', exact: true }).waitFor({ state: 'detached' });
      fixture.broadcast('puzzle.state', { pieces });
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await eventCount(fixture, 'puzzle.place', 2);
    }
    fixture.broadcast('puzzle.state', { pieces: pieces.map((item) => item.id === piece.id ? { ...item, current: { x: 0, y: 0 }, placed: true } : item) });
    const occupied = page.getByRole('button', { name: /^(Cell|Case) 1, 1, / });
    await occupied.waitFor();
    await page.getByRole('status').filter({ hasText: locale === 'en' ? 'Action confirmed by the server.' : 'Action confirmée par le serveur.' }).waitFor();
    assert.equal(await page.locator('[class*="trayPieceSelected"]').count(), 0, 'Clear only the confirmed selection');
    assert.equal(await page.locator('button button').count(), 0);
    await occupied.click();
    await eventCount(fixture, 'puzzle.unplace', 1);
    assert.equal(fixture.receivedEvents.find((item) => item.type === 'puzzle.unplace').payload.pieceId, piece.id);
  }
  await finish(fixture);
}

async function testLab(locale, width) {
  const engineKey = 'lab_d_innovation_v1';
  const lab = runtime(engineKey).buildLabInnovationRuntime(config);
  const fixture = await open(engineKey, { config, timer, labInnovation: lab }, { locale, width });
  const { page } = fixture;
  const submit = page.getByRole('button', { name: locale === 'en' ? 'Submit' : 'Soumettre', exact: true });
  await submit.waitFor();
  assert.ok(await submit.isDisabled());
  const problemInput = page.getByPlaceholder(locale === 'en' ? 'Describe a problem (200 chars max)' : 'Décrivez une problématique (200 caractères max)');
  await problemInput.fill('   ');
  assert.ok(await submit.isDisabled());
  await problemInput.fill('Improve team communication');
  assert.ok(await submit.isEnabled());
  await submit.click();
  await eventCount(fixture, 'lab.problem.submit', 1);
  assert.equal(await problemInput.inputValue(), 'Improve team communication', 'Draft lost without server confirmation');
  assert.ok(await problemInput.isDisabled(), 'Pending draft must not be editable and then cleared');
  assert.ok(await submit.isDisabled());
  const problem = { id: 'p1', text: 'Improve team communication', participant_id: '1', vote_count: 2 };
  fixture.broadcast('lab.state', { labInnovation: { ...lab, problems: [problem] } });
  await page.waitForFunction(() => document.querySelector('textarea')?.value === '');
  const otherProblem = { id: 'p2', text: 'Other problem', participant_id: '2', vote_count: 1 };
  const solutionPhase = { ...lab, phase: 'solution', problems: [problem, otherProblem], top_problems: [otherProblem] };
  fixture.broadcast('lab.state', { labInnovation: solutionPhase });
  const solutionInput = page.getByPlaceholder(locale === 'en' ? 'Describe a solution (200 chars max)' : 'Décrivez une solution (200 caractères max)');
  await solutionInput.waitFor();
  await solutionInput.fill('A team meeting');
  assert.ok(await submit.isDisabled());
  assert.equal(await page.locator('select option[value="p1"]').count(), 0, 'Only retained problems are eligible');
  await page.locator('select').selectOption('p2');
  assert.ok(await submit.isEnabled());
  await submit.click();
  await eventCount(fixture, 'lab.solution.submit', 1);
  const solution = { id: 's1', text: 'A team meeting', problem_id: 'p2', participant_id: '1', vote_count: 3 };
  const argumentPhase = { ...solutionPhase, phase: 'argument', solutions: [solution], finalist_solutions: [solution] };
  fixture.broadcast('lab.state', { labInnovation: argumentPhase });
  await page.getByPlaceholder(locale === 'en' ? 'Advantage (200 max)' : 'Avantage (200 max)').waitFor();
  await page.locator('select').selectOption('s1');
  await page.getByPlaceholder(locale === 'en' ? 'Advantage (200 max)' : 'Avantage (200 max)').fill('Shared context');
  await page.getByPlaceholder(locale === 'en' ? 'Improvement (200 max)' : 'Amélioration (200 max)').fill('Weekly meeting');
  assert.ok(await submit.isDisabled());
  await page.getByPlaceholder('Impact (200 max)').fill('Fewer misunderstandings');
  assert.ok(await submit.isEnabled());
  await submit.click();
  await eventCount(fixture, 'lab.contribution.submit', 1);
  const finalPhase = { ...argumentPhase, phase: 'final_vote', contributions: [{ id: 'c1', participant_id: '1', ...fixture.receivedEvents.find((item) => item.type === 'lab.contribution.submit').payload }] };
  fixture.broadcast('lab.state', { labInnovation: finalPhase });
  const vote = page.getByRole('button', { name: locale === 'en' ? 'Submit vote' : 'Valider le vote', exact: true });
  await vote.waitFor();
  assert.ok(await vote.isDisabled());
  await page.getByRole('button', { name: locale === 'en' ? 'Select' : 'Sélectionner', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: locale === 'en' ? 'Selected' : 'Sélectionnée', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.ok(await vote.isEnabled());
  await vote.click();
  await eventCount(fixture, 'lab.final.vote', 1);
  fixture.broadcast('lab.state', { labInnovation: { ...finalPhase, final_votes: { '1': 's1' } } });
  await page.getByText(locale === 'en' ? 'Confirmed by the server.' : 'Confirmé par le serveur.', { exact: true }).waitFor();
  assert.ok(await page.getByRole('button', { name: locale === 'en' ? 'Vote recorded' : 'Vote enregistré', exact: true }).isDisabled());
  await finish(fixture);
}

async function testLabMissingConfirmation() {
  const engineKey = 'lab_d_innovation_v1';
  const lab = runtime(engineKey).buildLabInnovationRuntime({ ...config, limits: { text_max_length: 50 } });
  const fixture = await open(engineKey, { config, timer, labInnovation: lab });
  const { page } = fixture;
  const input = page.getByPlaceholder('Describe a problem (50 chars max)');
  await input.waitFor();
  assert.equal(await input.getAttribute('maxlength'), '50');
  await input.fill('A preserved draft');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await eventCount(fixture, 'lab.problem.submit', 1);
  await page.getByText(/No server confirmation received/).waitFor({ timeout: 20000 });
  assert.equal(await input.inputValue(), 'A preserved draft');
  assert.ok(await input.isEnabled());
  assert.equal(await page.getByText('Confirmed by the server.', { exact: true }).count(), 0);
  await finish(fixture);
}

async function testEscape(locale, width) {
  let responseMode = 'healthy';
  let requests = 0;
  const escape = {
    status: 'in_progress', timer, total_enigmes: 2, current_enigme_index: 0,
    current_enigme: { id: 'e1', label: 'Synchronization test', description: 'Question', ui_type: 'text', ui_data: {} },
    submission_status: { total: 2, responded: 0, responded_ids: [] },
  };
  const fixture = await open('escape_room_v1', { config, timer }, { locale, width, role: 'manager',
    setup: async (context) => context.route('**/api/**/escape-room/**', async (route) => {
      if (route.request().url().endsWith('/participants')) return route.fulfill({ json: { participants: [] } });
      requests += 1;
      if (responseMode === 'error') return route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
      if (responseMode === 'invalid') return route.fulfill({ json: {} });
      return route.fulfill({ json: escape });
    }),
  });
  const { page } = fixture;
  await page.getByText('Synchronization test', { exact: true }).first().waitFor();
  await page.getByText(locale === 'en' ? /Pause\/reset are not available/ : /Pause\/Reinitialisation du chrono non disponibles/).waitFor();
  const baselineRequests = requests;
  responseMode = 'error';
  const alert = page.locator('[role="alert"]').filter({ hasText: locale === 'en' ? 'Synchronization interrupted' : 'Synchronisation interrompue' });
  await alert.waitFor({ timeout: 10000 });
  assert.ok(requests > baselineRequests);
  assert.ok(await page.getByText('Synchronization test', { exact: true }).count(), 'Previous state should remain visible');
  await alert.getByText(locale === 'en' ? /Last update/ : /Dernière mise à jour/).waitFor();
  responseMode = 'invalid';
  await alert.getByRole('button', { name: locale === 'en' ? 'Retry' : 'Réessayer', exact: true }).click();
  await alert.getByText(locale === 'en' ? /Incomplete game state/ : /État de la partie incomplet/).waitFor();
  responseMode = 'healthy';
  await alert.getByRole('button', { name: locale === 'en' ? 'Retry' : 'Réessayer', exact: true }).click();
  await alert.waitFor({ state: 'hidden' });
  await finish(fixture);
}

async function testPixel(locale, width, disableWebgl, role = 'participant') {
  const engineKey = 'pixel_architect_v1';
  const pixel = runtime(engineKey).buildInitialPixelState(config);
  pixel.phase = 'building';
  pixel.cubes = { '0:0:0': { x: 0, y: 0, z: 0, color: '#28b3d0', participant_id: '1' } };
  pixel.layer_claims = { '0': { layer: 0, participant_id: '1', display_name: 'Participant' } };
  const fixture = await open(engineKey, { config, timer, pixel }, { locale, width, disableWebgl, role });
  const { page } = fixture;
  const navigation = page.getByRole('group', { name: locale === 'en' ? 'Layer navigation' : 'Navigation des couches' });
  await navigation.waitFor();
  const layers = page.locator('[data-active-layer]');
  const layerCount = await layers.count();
  assert.ok(layerCount >= 2);
  const visibleCount = async () => {
    let count = 0;
    for (const card of await layers.all()) if (await card.isVisible()) count += 1;
    return count;
  };
  assert.equal(await visibleCount(), width < 640 ? 1 : layerCount);
  await navigation.getByRole('button', { name: locale === 'en' ? 'Next layer' : 'Couche suivante', exact: true }).click();
  assert.equal(await navigation.locator('select').inputValue(), '1');
  if (width < 640) assert.ok(await layers.nth(1).isVisible());
  await navigation.locator('select').selectOption('0');
  if (disableWebgl) {
    await page.getByText(locale === 'en' ? /You can keep playing with the layer grids below/ : /Vous pouvez continuer à jouer avec les grilles/).waitFor();
    assert.equal(await page.locator('canvas').count(), 0);
    if (width < 640) {
      await page.getByRole('button', { name: locale === 'en' ? 'Open model map' : 'Ouvrir la carte modele' }).click();
      const dialog = page.getByRole('dialog', { name: locale === 'en' ? 'Model map' : 'Carte modele' });
      await dialog.getByText(locale === 'en' ? /3D preview unavailable/ : /Aperçu 3D indisponible/).waitFor();
      await dialog.getByRole('button', { name: locale === 'en' ? 'Close' : 'Fermer', exact: true }).click();
    }
  }
  if (role === 'participant') {
    await layers.first().getByRole('button', { name: locale === 'en' ? /^Layer 1, cell x2 z1/ : /^Couche 1, case x2 z1/ }).click();
    await eventCount(fixture, 'pixel.cube.place', 1);
    const reset = page.getByRole('button', { name: locale === 'en' ? 'Reset layer' : 'Reinitialiser la couche', exact: true });
    assert.ok(await reset.isEnabled());
    page.once('dialog', async (dialog) => {
      assert.equal(dialog.type(), 'confirm');
      await dialog.dismiss();
    });
    await reset.click();
    await page.waitForTimeout(200);
    assert.equal(fixture.receivedEvents.filter((item) => item.type === 'pixel.cube.remove').length, 0);
    page.once('dialog', (dialog) => dialog.accept());
    await reset.click();
    await eventCount(fixture, 'pixel.cube.remove', 1);
    const allReset = page.getByRole('button', { name: locale === 'en' ? 'Reset cubes' : 'Reinitialiser les cubes', exact: true });
    page.once('dialog', (dialog) => dialog.dismiss());
    await allReset.click();
    await page.waitForTimeout(200);
    assert.equal(fixture.receivedEvents.filter((item) => item.type === 'pixel.cube.remove').length, 1);
  }
  await finish(fixture);
}

try {
  for (const [locale, width] of [['en', 390], ['fr', 1440]]) {
    if (noWebgl) {
      await testPixel(locale, width, true);
      await testPixel(locale, width, true, 'manager');
    } else {
      await testPhrase(locale, width);
      await testCopuzzle(locale, 'participant', width);
      await testCopuzzle(locale, 'manager', width);
      await testLab(locale, width);
      await testEscape(locale, width);
      await testPixel(locale, width, false);
    }
  }
  if (!noWebgl) await testLabMissingConfirmation();
  console.log(noWebgl ? 'TEST_CHALLENGE_NO_WEBGL_UX_OK' : 'TEST_CHALLENGE_DIAGNOSTICS_UX_OK');
} finally {
  await browser.close();
}
