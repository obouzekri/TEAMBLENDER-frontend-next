import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const require = createRequire(import.meta.url);
const runtime = (engine) => require(`../../backend/src/challenges/engines/${engine}/server-runtime.js`);
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const noWebgl = process.argv.includes('--no-webgl');
const escapeOnly = process.argv.includes('--escape-only');
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
  await page.getByRole('button', { name: /^(Refuser les cookies de mesure|Refuse analytics cookies)$/ }).click();
  if (role === 'participant') {
    await page.locator('[class*="challengeContainer"]').waitFor();
    assert.equal(await page.getByText(locale === 'en' ? 'Prepare your session' : 'Préparer votre session', { exact: true }).count(), 0, `${engineKey}: participants must not see the preparation guide`);
  }
  return { ...fixture, page, errors, nestingWarnings };
}

async function finish(fixture) {
  assert.deepEqual(fixture.errors, []);
  assert.deepEqual(fixture.nestingWarnings, []);
  const completionClearance = await fixture.page.evaluate(() => {
    const route = document.querySelector('[class*="challengeRoute"]');
    const challenge = document.querySelector('[class*="challengeContainer"]');
    if (!route || !challenge) return null;

    route.dataset.completionVisible = 'true';
    const clearance = {
      route: Number.parseFloat(getComputedStyle(route).paddingBottom),
      challenge: Number.parseFloat(getComputedStyle(challenge).paddingBottom),
      width: innerWidth,
    };
    delete route.dataset.completionVisible;
    return clearance;
  });
  assert.ok(completionClearance, 'Challenge route should reserve space for the completion banner');
  if (completionClearance.width > 720) {
    assert.ok(completionClearance.route >= 72, 'Desktop content should not sit beneath the completion banner');
  } else {
    assert.ok(completionClearance.challenge >= 88, 'Mobile content should not sit beneath the completion banner');
  }
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
  const testPieces = role === 'manager'
    ? pieces.map((piece, index) => index === 0 ? { ...piece, current: { x: 0, y: 0 }, placed: true } : piece)
    : pieces;
  const fixture = await open(engineKey, { config, timer, puzzle: { pieces: testPieces } }, { locale, role, width });
  const { page } = fixture;
  await page.locator('[class*="boardPanel"]').waitFor();
  const board = await page.locator('[class*="boardPanel"]').boundingBox();
  const side = await page.locator('[class*="sidePanel"]').boundingBox();
  assert.ok(board.width >= (width < 500 ? 300 : 500), `Board width ${board.width}`);
  const boardOverflow = await page.locator('[class*="boardPanel"]').evaluate((panel) => panel.scrollWidth > panel.clientWidth);
  assert.equal(boardOverflow, false, 'Puzzle board must fit inside its panel');
  if (width < 500) assert.ok(side.y >= board.y + board.height - 1, 'Sidebar overlaps board');
  if (role === 'manager') {
    assert.equal(await page.getByText(locale === 'en' ? 'Placed piece' : 'Pièce visible', { exact: true }).count(), 0);
  }
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
  const logic = require('../../backend/src/challenges/engines/lab_d_innovation_v1/game-logic.js');
  const en = locale === 'en';
  const lab = runtime(engineKey).buildLabInnovationRuntime(config);
  logic.syncLabRoster(lab, ['1', '2']);
  logic.startLab(lab, Date.now());
  const view = () => logic.buildLabPayloadForViewer(lab, '1', false);
  const act = (actorId, type, payload = {}) => logic.applyLabAction(lab, { type, actorId, isParticipant: true, payload });
  const fixture = await open(engineKey, { config, timer, labInnovation: view() }, { locale, width });
  const { page } = fixture;

  // 1. Problem selection: flat catalog, each card shows its theme and reference; at most 3 picks.
  await page.getByRole('heading', { name: en ? 'Choose the problems to work on' : 'Choisissez les problèmes à traiter' }).waitFor();
  const firstProblem = page.locator('article[data-category="governance"]').first();
  await firstProblem.getByText(en ? 'Governance and decisions' : 'Gouvernance et décision', { exact: true }).waitFor();
  await firstProblem.getByText(/ISO 37000/).waitFor();
  const pickButtons = page.getByRole('button', { name: en ? 'Choose' : 'Choisir', exact: true });
  assert.equal(await pickButtons.count(), 12, 'Without host configuration, the 12 default problems are offered');
  await pickButtons.first().click();
  await eventCount(fixture, 'lab.problem.toggle', 1);
  const pickedId = fixture.receivedEvents.find((item) => item.type === 'lab.problem.toggle').payload.problem_id;
  assert.equal(pickedId, 'unclear_governance');
  act('1', 'lab.problem.toggle', { problem_id: 'unclear_governance' });
  act('1', 'lab.problem.toggle', { problem_id: 'silos' });
  act('2', 'lab.problem.toggle', { problem_id: 'silos' });
  act('2', 'lab.problem.toggle', { problem_id: 'workload' });
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByText(en ? 'Your selection: 2/3' : 'Votre sélection : 2/3', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: en ? 'Chosen' : 'Choisi', exact: true }).count(), 2);

  // 2. Written arguments: one text per own pick, saved shortly after typing stops.
  logic.advanceLab(lab, Date.now());
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByRole('heading', { name: en ? 'Explain your choices' : 'Expliquez vos choix' }).waitFor();
  const argueFields = page.getByPlaceholder(en ? 'What you see, the impact on the team… (200 characters max)' : 'Ce que vous constatez, l’impact sur l’équipe… (200 caractères max)');
  assert.equal(await argueFields.count(), 2, 'One argument field per picked problem');
  await argueFields.nth(1).fill('Teams never share their plans');
  await eventCount(fixture, 'lab.problem.argue', 1);
  const argued = fixture.receivedEvents.find((item) => item.type === 'lab.problem.argue').payload;
  assert.deepEqual(argued, { problem_id: 'silos', text: 'Teams never share their plans' });
  act('1', 'lab.problem.argue', argued);
  act('2', 'lab.problem.argue', { problem_id: 'workload', text: 'Overtime every single week' });
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByText(en ? /^Arguments written: 1\/2/ : /^Arguments rédigés : 1\/2/).waitFor();

  // 3. Reading: every argument at once, grouped by problem, with its author.
  logic.advanceLab(lab, Date.now());
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByRole('heading', { name: en ? 'Read the team’s arguments' : 'Lisez les arguments de l’équipe' }).waitFor();
  await page.getByText('Overtime every single week', { exact: true }).waitFor();
  await page.getByText('Teams never share their plans', { exact: true }).waitFor();
  await page.getByRole('button', { name: en ? "I've read them" : "J'ai lu", exact: true }).click();
  await eventCount(fixture, 'lab.ready', 1);

  // 4. Point voting on the shortlist.
  logic.advanceLab(lab, Date.now());
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByRole('heading', { name: en ? 'Vote for the problem to work on' : 'Votez pour le problème à traiter' }).waitFor();
  const submitVote = page.getByRole('button', { name: en ? 'Submit my vote' : 'Valider mon vote', exact: true });
  assert.ok(await submitVote.isDisabled(), 'An empty vote cannot be submitted');
  const silosTitle = en ? 'Working in silos' : 'Travail en silos';
  const addPoint = page.getByRole('button', { name: `${en ? 'Add a point' : 'Ajouter un point'} : ${silosTitle}` });
  for (let i = 0; i < 3; i += 1) await addPoint.click();
  assert.ok(await addPoint.isDisabled(), 'No more than 3 points');
  await submitVote.click();
  await eventCount(fixture, 'lab.vote.submit', 1);
  assert.deepEqual(fixture.receivedEvents.find((item) => item.type === 'lab.vote.submit').payload.allocation, { silos: 3 });

  // 5. Anonymous solutions on the chosen problem, each with an optional reason.
  act('1', 'lab.vote.submit', { allocation: { silos: 3 } });
  act('2', 'lab.vote.submit', { allocation: { silos: 2, workload: 1 } });
  act('2', 'lab.solution.submit', { text: 'Monthly cross-team demo' });
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByRole('heading', { name: en ? 'Propose your solutions' : 'Proposez vos solutions' }).waitFor();
  await page.getByText(silosTitle, { exact: true }).first().waitFor();
  await page.getByText(en ? 'Anonymous' : 'Anonyme', { exact: true }).waitFor();
  const solutionInput = page.getByPlaceholder(en ? 'Describe your solution (200 characters max)' : 'Décrivez votre solution (200 caractères max)');
  await solutionInput.fill('Shared roadmap');
  await page.getByPlaceholder(en ? 'What it changes, why it can work… (200 characters max)' : 'Ce qu’elle change, pourquoi elle peut marcher… (200 caractères max)').fill('Everyone sees the same priorities');
  await page.getByRole('button', { name: en ? 'Add' : 'Ajouter', exact: true }).click();
  await eventCount(fixture, 'lab.solution.submit', 1);
  assert.deepEqual(fixture.receivedEvents.find((item) => item.type === 'lab.solution.submit').payload,
    { text: 'Shared roadmap', rationale: 'Everyone sees the same priorities' });

  // 6. Deployment template: the required fields gate the submit button.
  act('1', 'lab.solution.submit', { text: 'Shared roadmap', rationale: 'Everyone sees the same priorities' });
  logic.advanceLab(lab, Date.now());
  while (/_defense$/.test(lab.phase)) logic.advanceLab(lab, Date.now());
  const theirs = lab.solutions.find((item) => item.author_id === '2').id;
  const mine = lab.solutions.find((item) => item.author_id === '1').id;
  act('1', 'lab.vote.submit', { allocation: { [theirs]: 3 } });
  act('2', 'lab.vote.submit', { allocation: { [mine]: 1 } });
  fixture.broadcast('lab.state', { labInnovation: view() });
  await page.getByRole('heading', { name: en ? 'Build the deployment plan' : 'Construisez le plan de déploiement' }).waitFor();
  const addStep = page.getByRole('button', { name: en ? /^Add step/ : /^Ajouter l’étape/ });
  await page.getByPlaceholder(en ? 'What we do' : 'Ce qu’on fait').fill('Kickoff with managers');
  assert.ok(await addStep.isDisabled(), 'Risk level, budget and timeframe are required');
  const selects = page.locator('select');
  await selects.nth(0).selectOption('low');
  await selects.nth(1).selectOption('medium');
  await selects.nth(2).selectOption('short');
  await page.getByRole('checkbox', { name: en ? 'Tools' : 'Outils' }).check();
  assert.ok(await addStep.isEnabled());
  await addStep.click();
  await eventCount(fixture, 'lab.step.submit', 1);
  const stepPayload = fixture.receivedEvents.find((item) => item.type === 'lab.step.submit').payload;
  assert.equal(stepPayload.delay, 'short');
  assert.deepEqual(stepPayload.resources, ['tools']);

  // 7. Debrief once the plan is merged: decision, recommendations, decision path, plan.
  act('1', 'lab.step.submit', stepPayload);
  logic.advanceLab(lab, Date.now());
  logic.advanceLab(lab, Date.now());
  const summary = { completion_percent: 100, collective_score: 100, action_count: 8, message_count: 0, total_time_seconds: 900, lab_result: logic.buildLabResult(lab) };
  fixture.broadcast('lab.state', { labInnovation: view() });
  fixture.broadcast('puzzle.completed', { summary });
  await page.getByRole('heading', { name: en ? 'What the team decided' : 'Ce que l’équipe a décidé' }).waitFor();
  await page.getByText('Monthly cross-team demo', { exact: true }).first().waitFor();
  await page.getByText('Kickoff with managers', { exact: true }).waitFor();
  await page.getByRole('heading', { name: en ? 'Our recommendations' : 'Nos recommandations' }).waitFor();
  await page.getByText(en ? 'Recommended approach' : 'Approche recommandée', { exact: true }).waitFor();
  await page.getByText(en ? 'Inspired by: Lean (value stream), ISO 9001 (process approach)' : 'Inspiré de : Lean (flux de valeur), ISO 9001 (approche processus)', { exact: true }).waitFor();
  await page.getByText(en ? 'Plan watch points' : 'Points de vigilance du plan', { exact: true }).waitFor();
  await page.getByRole('heading', { name: en ? 'How the team decided' : 'Le parcours de décision' }).waitFor();
  await page.getByText(en ? '5 pts' : '5 pts', { exact: true }).waitFor();
  await page.getByRole('heading', { name: en ? 'Team indicators' : 'Indicateurs d’équipe' }).waitFor();
  assert.equal(await page.getByText(en ? 'How it is computed' : 'Comment c’est calculé', { exact: true }).count(), 3, 'Each indicator explains its computation');
  assert.equal(await page.getByRole('button', { name: en ? 'Export the report (PDF)' : 'Exporter le rapport (PDF)' }).count(), 0, 'Only the host exports the report');
  await finish(fixture);
  await testLabReport(locale, width, lab, summary);
}

// The host exports a printable report with every pick, argument, solution and recommendation.
async function testLabReport(locale, width, lab, summary) {
  const logic = require('../../backend/src/challenges/engines/lab_d_innovation_v1/game-logic.js');
  const en = locale === 'en';
  const fixture = await open('lab_d_innovation_v1', { config, timer: { ...timer, status: 'completed' }, labInnovation: logic.buildLabPayloadForViewer(lab, null, true), summary }, { locale, width, role: 'manager' });
  const { page } = fixture;
  await page.getByRole('heading', { name: en ? 'What the team decided' : 'Ce que l’équipe a décidé' }).waitFor();
  const [report] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: en ? 'Export the report (PDF)' : 'Exporter le rapport (PDF)' }).click()
  ]);
  await report.waitForLoadState();
  const text = await report.locator('body').innerText();
  ['Teams never share their plans', 'Overtime every single week', 'Monthly cross-team demo', 'Everyone sees the same priorities', 'Kickoff with managers']
    .forEach((needle) => assert.ok(text.includes(needle), `The report contains "${needle}"`));
  assert.ok(text.includes(en ? 'Our recommendations' : 'Nos recommandations'));
  assert.ok(text.includes(en ? 'Recommended approach' : 'Approche recommandée'));
  await report.close();
  await finish(fixture);
}

async function testEscape(locale, width, title) {
  let responseMode = 'healthy';
  let participantsMode = 'error';
  let requests = 0;
  const actions = [];
  const escape = {
    status: 'in_progress', timer, total_enigmes: 2, current_enigme_index: 0,
    current_enigme: { id: 'e1', label: 'Synchronization test', description: 'Question', ui_type: 'text', ui_data: {} },
    submission_status: { total: 2, responded: 0, responded_ids: [] },
  };
  const fixture = await open('escape_room_v1', { config: { ...config, ...(title ? { title } : {}) }, timer }, { locale, width, role: 'manager',
    setup: async (context) => context.route('**/api/**/escape-room/**', async (route) => {
      if (route.request().url().endsWith('/participants')) {
        if (participantsMode === 'error') return route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
        return route.fulfill({ json: { participants: [] } });
      }
      requests += 1;
      const action = new URL(route.request().url()).pathname.split('/').pop();
      if (route.request().method() === 'POST') {
        actions.push(action);
        if (action === 'pause') escape.status = 'paused';
        if (action === 'resume') escape.status = 'in_progress';
        if (action === 'hint') escape.hint_unlocked = true;
        if (action === 'skip') escape.current_enigme_index = 1;
        return route.fulfill({ json: { ok: true } });
      }
      if (responseMode === 'error') return route.fulfill({ status: 503, json: { error: 'Service unavailable' } });
      if (responseMode === 'invalid') return route.fulfill({ json: {} });
      return route.fulfill({ json: escape });
    }),
  });
  const { page } = fixture;
  await page.getByText('Synchronization test', { exact: true }).first().waitFor();
  await page.getByRole('heading', {
    name: title || (locale === 'en' ? 'Secret Room' : 'Salle Secrète'), exact: true,
  }).first().waitFor();
  const participantsAlert = page.locator('[role="alert"]').filter({ hasText: 'Service unavailable' });
  await participantsAlert.waitFor({ timeout: 10000 });
  const retryParticipants = participantsAlert.getByRole('button', {
    name: locale === 'en' ? 'Retry participants' : 'Réessayer les participants',
    exact: true,
  });
  participantsMode = 'healthy';
  await retryParticipants.click();
  await participantsAlert.waitFor({ state: 'hidden' });
  const riddles = [
    { ui_type: 'grid_3x3', ui_data: { grid: [[2, 7, 6], [9, '?', 1], [4, 3, 8]] } },
    { ui_type: 'grid_3x3', ui_data: { grid: [[1, 2, 3], [4, '?', 6], [7, 8, 9]] } },
    { ui_type: 'text_mystery', ui_data: { question_lines: ['CHAT = 4', 'LION = ?'] } },
    { ui_type: 'word_anagram', ui_data: { letters: ['E', 'Q', 'U', 'I', 'P', 'E'], answer_length: 6 } },
  ];
  for (const [index, riddle] of riddles.entries()) {
    escape.current_enigme_index = index;
    escape.current_enigme = {
      id: index === 0 ? 'e1' : `layout-${index}`, label: `Riddle layout ${index}`,
      description: 'Sur le mur devant vous, une grille de nombres. Une case est manquante. Observez le pattern et completez la grille.',
      ...riddle,
    };
    await page.getByRole('heading', { name: `Riddle layout ${index}`, exact: true }).waitFor({ timeout: 10000 });
    for (const theme of ['light', 'dark']) {
      await page.locator('html').evaluate((node, value) => { node.dataset.theme = value; }, theme);
      const hero = await page.locator('[class*="enigmeHero"]').boundingBox();
      const description = await page.locator('[class*="description"]').filter({ hasText: 'Sur le mur' }).boundingBox();
      const block = await page.locator('[class*="enigmeUiBlock"]').boundingBox();
      assert.ok(description.y - hero.y - hero.height >= 23.5, `${riddle.ui_type}: space after title (${theme}, ${width})`);
      assert.ok(block.y - description.y - description.height >= 23.5, `${riddle.ui_type}: space before puzzle (${theme}, ${width})`);
      if (riddle.ui_type === 'grid_3x3') {
        const grid = await page.locator('[class*="matrixGrid"]').boundingBox();
        const cells = page.locator('[class*="matrixCell"]');
        assert.equal(await cells.count(), 9);
        for (const cell of await cells.all()) {
          const box = await cell.boundingBox();
          assert.ok(box.width <= 90 && box.height <= 56, `Compact number cell: ${box.width} x ${box.height}`);
        }
        assert.ok(grid.width <= 280, 'Compact grid width');
        assert.ok(Math.abs(grid.x + grid.width / 2 - block.x - block.width / 2) <= 1, 'Centered grid');
        await page.getByLabel(locale === 'en' ? 'Cell to solve' : 'Case a trouver', { exact: true }).waitFor();
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Riddle layout must not overflow');
    }
  }
  escape.current_enigme_index = 0;
  escape.current_enigme = { id: 'e1', label: 'Synchronization test', description: 'Question', ui_type: 'text', ui_data: {} };
  await page.getByText('Synchronization test', { exact: true }).first().waitFor({ timeout: 10000 });
  await page.getByRole('timer').filter({ visible: true }).first().waitFor();
  await page.getByRole('button', { name: locale === 'en' ? 'Pause' : 'Mettre en pause', exact: true }).waitFor();
  const pause = page.getByRole('button', { name: locale === 'en' ? 'Pause' : 'Mettre en pause', exact: true });
  await pause.click();
  const resume = page.getByRole('button', { name: locale === 'en' ? 'Resume' : 'Reprendre', exact: true });
  await resume.waitFor();
  const hint = page.getByRole('button', { name: locale === 'en' ? 'Unlock a hint' : 'Débloquer un indice', exact: true }).filter({ visible: true });
  assert.ok(await hint.isVisible(), 'Hint must be visible on mobile and desktop');
  assert.ok(await hint.isDisabled(), 'No hint while paused');
  await resume.click();
  await pause.waitFor();
  await hint.click();
  const unlocked = page.getByRole('button', { name: locale === 'en' ? 'Hint unlocked' : 'Indice débloqué', exact: true }).filter({ visible: true });
  await unlocked.waitFor();
  assert.ok(await unlocked.isDisabled(), 'Do not unlock the same hint twice');
  await page.getByRole('button', { name: locale === 'en' ? 'Skip the riddle' : "Passer l'énigme", exact: true }).filter({ visible: true }).click();
  assert.deepEqual(actions, ['pause', 'resume', 'hint', 'skip']);
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
  for (const status of ['timeout', 'escaped', 'failed']) {
    escape.status = status;
    escape.current_enigme = null;
    escape.started_at = '2026-10-15T21:35:15.275Z';
    escape.finished_at = '2026-10-15T21:55:16.195Z';
    const debrief = page.getByRole('region', { name: locale === 'en' ? 'Debrief questions' : 'Questions pour le débrief', exact: true });
    await debrief.waitFor({ timeout: 10000 });
    const outcome = status === 'escaped' ? (locale === 'en' ? 'Room unlocked' : 'Salle déverrouillée')
      : status === 'timeout' ? (locale === 'en' ? 'Time elapsed' : 'Temps écoulé')
        : (locale === 'en' ? 'Mission ended' : 'Mission arrêtée');
    await page.getByText(outcome, { exact: true }).waitFor({ timeout: 10000 });
    assert.equal(await debrief.locator('li').count(), 3);
    assert.equal(await debrief.locator('strong').innerText(), status === 'escaped' ? '2/2' : '1/2');
    await page.getByRole('heading', { name: locale === 'en' ? 'Team debrief' : "Débrief de l'équipe", exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: locale === 'en' ? 'Pause' : 'Mettre en pause', exact: true }).count(), 0);
  }
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
  assert.ok(layerCount >= (role === 'manager' ? 1 : 2));
  assert.equal(await navigation.getByRole('button').count(), 0, 'Layer navigation uses the selector only');
  const visibleCount = async () => {
    let count = 0;
    for (const card of await layers.all()) if (await card.isVisible()) count += 1;
    return count;
  };
  assert.equal(await visibleCount(), role === 'manager' || width < 640 ? 1 : layerCount);
  const viewportHeight = await page.locator('[class*="viewport3dCompact"]').evaluate((node) => Number.parseFloat(getComputedStyle(node).height));
  assert.ok(viewportHeight >= (width < 640 ? 320 : width < 980 ? 340 : 360), 'The 3D construction view has enough height');
  await navigation.locator('select').selectOption('1');
  assert.equal(await navigation.locator('select').inputValue(), '1');
  if (role === 'manager') {
    assert.equal(await layers.first().getAttribute('aria-label'), locale === 'en' ? 'Layer 2' : 'Couche 2');
  } else if (width < 640) {
    assert.ok(await layers.nth(1).isVisible());
  }
  await navigation.locator('select').selectOption('0');
  if (role === 'manager' && width >= 980) {
    const modelDisclosure = page.locator('details').filter({ has: page.locator('summary', { hasText: locale === 'en' ? 'Model map' : 'Carte modèle' }) });
    assert.equal(await modelDisclosure.locator('[class*="modelSidebarViewport"]').count(), 0, 'The facilitator model preview stays unmounted while collapsed');
    await modelDisclosure.locator('summary').click();
    await modelDisclosure.locator('[class*="modelSidebarViewport"]').waitFor();
    if (!disableWebgl) await modelDisclosure.locator('canvas').waitFor();
    if (disableWebgl) await modelDisclosure.getByText(locale === 'en' ? /3D preview unavailable/ : /Aperçu 3D indisponible/).waitFor();
  }
  if (disableWebgl) {
    await page.getByText(locale === 'en' ? /You can keep playing with the layer grids below/ : /Vous pouvez continuer à jouer avec les grilles/).waitFor();
    assert.equal(await page.locator('canvas').count(), 0);
    if (width < 640) {
      await page.getByRole('button', { name: locale === 'en' ? 'Open model map' : 'Ouvrir la carte modèle' }).click();
      const dialog = page.getByRole('dialog', { name: locale === 'en' ? 'Model map' : 'Carte modèle' });
      await dialog.getByText(locale === 'en' ? /3D preview unavailable/ : /Aperçu 3D indisponible/).waitFor();
      await dialog.getByRole('button', { name: locale === 'en' ? 'Close' : 'Fermer', exact: true }).click();
    }
  }
  if (role === 'participant') {
    await layers.first().getByRole('button', { name: locale === 'en' ? /^Layer 1, cell x2 z1/ : /^Couche 1, case x2 z1/ }).click();
    await eventCount(fixture, 'pixel.cube.place', 1);
    const reset = page.getByRole('button', { name: locale === 'en' ? 'Reset layer' : 'Réinitialiser la couche', exact: true });
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
    const allReset = page.getByRole('button', { name: locale === 'en' ? 'Reset cubes' : 'Réinitialiser les cubes', exact: true });
    page.once('dialog', (dialog) => dialog.dismiss());
    await allReset.click();
    await page.waitForTimeout(200);
    assert.equal(fixture.receivedEvents.filter((item) => item.type === 'pixel.cube.remove').length, 1);
  }
  await finish(fixture);
}

try {
  if (escapeOnly) {
    await testEscape('en', 390);
    await testEscape('fr', 1440);
    await testEscape('en', 1440, 'Salle Secrète II');
    await testEscape('fr', 390, 'Salle Secrète II');
  } else {
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
        await testPixel(locale, width, false, 'manager');
      }
    }
  }
  console.log(
    escapeOnly
      ? 'TEST_ESCAPE_ROOM_PARTICIPANTS_UX_OK'
      : noWebgl
        ? 'TEST_CHALLENGE_NO_WEBGL_UX_OK'
        : 'TEST_CHALLENGE_DIAGNOSTICS_UX_OK'
  );
} finally {
  await browser.close();
}
