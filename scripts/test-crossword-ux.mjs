import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { chromium } from 'playwright';
import { readGlobalCss } from './helpers/global-css.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, ...name.split('/')), 'utf8');
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const uiSource = read('components/Challenges/CrosswordLive/CrosswordChallenge.js');
const css = read('components/Challenges/CrosswordLive/CrosswordChallenge.module.css');
const modalSource = read('components/SessionBuilder/ChallengeConfigModal.js');
const modalCss = read('components/SessionBuilder/ChallengeConfigModal.module.css').replace(/:global\(([^)]+)\)/g, '$1');
const hookSource = read('lib/challenges/useRealtimeChallenge.js');
const rulesSource = read('components/Challenges/ChallengeRulesPanel.js');
const timerSource = read('components/Challenges/ChallengeTimerCard.js');
const presentationSource = read('components/Challenges/ChallengePresentation.js');
const actionFeedbackSource = read('components/Challenges/ChallengeActionFeedback.js');
const rulesPresetSource = read('lib/challenges/crosswordRules.js');
const challengeRulesSource = read('lib/challenges/rules.js');
const sharedCss = ['ChallengeRulesPanel', 'ChallengeTimerCard', 'ChallengePresentation']
  .map((name) => read(`components/Challenges/${name}.module.css`).replace(/:global\(([^)]+)\)/g, '$1'))
  .join('\n');
const globalCss = readGlobalCss();
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.setContent('<html><body><main id="root"></main></body></html>');
  // React 19 no longer ships UMD builds: load the CommonJS builds through a minimal in-page require.
  const reactModules = {
    react: 'react/cjs/react.development.js',
    scheduler: 'scheduler/cjs/scheduler.development.js',
    'react-dom': 'react-dom/cjs/react-dom.development.js',
    'react-dom/client': 'react-dom/cjs/react-dom-client.development.js',
  };
  const factories = Object.entries(reactModules)
    .map(([name, file]) => `${JSON.stringify(name)}: function (require, module, exports) {\n${read(`node_modules/${file}`)}\n}`)
    .join(',\n');
  await page.addScriptTag({ content: `(() => {
    globalThis.process = { env: { NODE_ENV: 'development' } };
    const factories = {${factories}};
    const cache = {};
    const require = (name) => {
      if (!cache[name]) {
        cache[name] = { exports: {} };
        factories[name](require, cache[name], cache[name].exports);
      }
      return cache[name].exports;
    };
    globalThis.React = require('react');
    globalThis.ReactDOM = { ...require('react-dom'), ...require('react-dom/client') };
  })();` });
  await page.addStyleTag({ content: `${globalCss}\nbody { margin: 0; padding: 12px; box-sizing: border-box; } ${sharedCss} ${css} ${modalCss}` });
  await page.evaluate(({ ui, modal, hook, rules, timer, presentation, actionFeedback, rulesPreset, challengeRules }) => {
    const R = globalThis.React;
    const h = R.createElement;
    globalThis.locale = 'en';
    globalThis.facilitator = false;
    globalThis.runtimeConfig = {};
    globalThis.emitted = [];
    globalThis.completed = [];
    globalThis.listeners = {};
    globalThis.socket = {
      connected: true,
      on(type, callback) { (listeners[type] ||= new Set()).add(callback); },
      off(type, callback) { listeners[type]?.delete(callback); },
      emit(type, payload) { emitted.push({ type, payload }); },
    };
    globalThis.dispatch = (type, packet) => [...(listeners[type] || [])].forEach((callback) => callback(packet));
    globalThis.emitEvent = (type, payload) => { emitted.push({ type, payload }); return socket.connected; };
    globalThis.state = {
      timer: { status: 'running', remaining_seconds: 900 },
      crossword: {
        grid: { id: 'en-1', title: 'Teamwork', theme: 'Together', difficulty: 'easy', width: 3, height: 3, words: [
          { id: 'a', number: 1, row: 0, col: 0, direction: 'across', length: 3, clue: 'A feline', answer: null, solvedBy: null },
          { id: 'd', number: 1, row: 0, col: 0, direction: 'down', length: 3, clue: 'A vehicle', answer: 'CAR', solvedBy: 'p2' },
          { id: 'b', number: 2, row: 2, col: 0, direction: 'across', length: 3, clue: 'An organization', answer: null, solvedBy: null },
        ] },
        scores: [{ participantId: 'p2', displayName: 'Sam', score: 1, words: [{ id: 'd', answer: 'CAR' }] }],
        activity: [{ wordId: 'd', answer: 'CAR', participantId: 'p2', displayName: 'Sam', ts: 123 }],
        solvedCount: 1, totalWords: 2, completionPercent: 50,
      },
    };
    const styles = new Proxy({}, { get: (_, key) => key });
    const i18n = () => ({ locale, t: (key) => key });
    const mockRealtime = () => ({ state, error: globalThis.serverError || '', connected: socket.connected, isFacilitator: facilitator, emitEvent });
    const shared = (props) => h('section', {}, props.title || props.feedback?.message || '', props.actions);
    const connectionContext = R.createContext(true);
    const debriefContext = R.createContext(false);
    const mocks = {
      react: { ...R, default: R },
      'lucide-react': { Pause: () => h('span'), Play: () => h('span') },
      '@/lib/i18n/useI18n': i18n,
      '@/lib/i18n/routing': { normalizeLocale: (value) => value },
      '@/lib/challenges/useRealtimeChallenge': mockRealtime,
      '@/lib/challenges/useFacilitatorTimerControls': () => ({
        busy: false, feedback: null,
        pause: facilitator ? () => emitEvent('timer.pause', {}) : null,
        resume: facilitator ? () => emitEvent('timer.resume', {}) : null,
      }),
      '@/lib/challenges/useConfirmedAction': () => ({
        busy: false,
        feedback: globalThis.controlFeedback || null,
        run: (action) => { emitted.push({ type: action.type, payload: action.payload }); },
      }),
      '../ChallengeHeader': (props) => h('header', {}, h('h1', {}, props.title), props.timer ? h('span', { className: 'headerTimer' }, 'timer') : null, props.headerAction),
      '../ChallengeActionFeedback': shared,
      '../ChallengeDebriefHeading': ({ children }) => h('div', {}, h('span', {}, 'Challenge terminé'), h('h2', {}, "Débrief de l'équipe"), children),
      './CrosswordChallenge.module.css': styles, './ChallengeConfigModal.module.css': styles,
      './ChallengeRulesPanel.module.css': styles, './ChallengeTimerCard.module.css': styles,
      './ChallengePresentation.module.css': styles,
      './ChallengeActionFeedback.module.css': styles,
      'next/image': shared,
      '@/lib/config': {}, '@/lib/csrf': {}, '@/lib/challenges/playerRange': { resolveChallengePlayerRange: () => ({}) },
      '@/lib/useBodyScrollLock': () => {},
      '@/lib/useModalFocus': () => {},
      '@/lib/challenges/connection-context': { ChallengeConnectionContext: connectionContext },
      '@/lib/challenges/debrief-context': { ChallengeDebriefContext: debriefContext },
      './connection-context': { ChallengeProgressContext: R.createContext(null) },
      './quiz-utils': { normalizeQuizAnswerIndex: (index) => index },
      './useSocketConnection': () => socket.connected,
    };
    const load = (source) => {
      const module = { exports: {} };
      new Function('require', 'module', 'exports', source)((name) => {
        if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
        return typeof mocks[name] === 'function' || name.endsWith('.module.css') ? { default: mocks[name] } : mocks[name];
      }, module, module.exports);
      return module.exports;
    };
    mocks['@/lib/challenges/crosswordRules'] = load(rulesPreset);
    mocks['@/lib/challenges/rules'] = load(challengeRules);
    mocks['../ChallengeRulesPanel'] = load(rules).default;
    mocks['../ChallengeTimerCard'] = load(timer).default;
    mocks['../ChallengePresentation'] = load(presentation).default;
    mocks['../ChallengeActionFeedback'] = load(actionFeedback).default;
    globalThis.ui = load(ui);
    globalThis.modal = load(modal);
    globalThis.hook = load(hook);
    globalThis.root = ReactDOM.createRoot(document.getElementById('root'));
    globalThis.render = () => root.render(h(connectionContext.Provider, { value: socket.connected },
      h(globalThis.ui.default, { socket, runtimePayload: { config: runtimeConfig }, context: {} })));
    render();
  }, {
    ui: transpile(uiSource), modal: transpile(modalSource), hook: transpile(hookSource),
    rules: transpile(rulesSource), timer: transpile(timerSource), challengeRules: transpile(challengeRulesSource),
    presentation: transpile(presentationSource), rulesPreset: transpile(rulesPresetSource),
    actionFeedback: transpile(actionFeedbackSource),
  });

  assert.equal(await page.evaluate(() => ui.normalizeCrosswordAnswer(' é-qui pe ’')), 'EQUIPE');
  await page.getByRole('heading', { level: 1, name: 'Crossword Live', exact: true }).waitFor();
  await page.getByText('Teamwork', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => ui.buildCrosswordCells(state.crossword.grid).get('0:0').letter), 'C');
  assert.equal(await page.evaluate(() => ui.hasCrosswordConflict(state.crossword.grid.words[0], 'BAT', ui.buildCrosswordCells(state.crossword.grid))), true);
  await page.evaluate(() => {
    state = { ...state, crossword: { ...state.crossword, solvedCount: 0, totalWords: 15 } };
    render();
  });
  await page.getByRole('status').filter({ hasText: '0/15 words found' }).waitFor();
  await page.evaluate(() => {
    state = { ...state, crossword: { ...state.crossword, solvedCount: 1 } };
    render();
  });
  await page.getByRole('status').filter({ hasText: '1/15 words found' }).waitFor();
  await page.evaluate(() => {
    state = { ...state, crossword: { ...state.crossword, totalWords: 2 } };
    render();
  });
  for (const currentLocale of ['fr', 'en']) {
    for (const currentFacilitator of [true, false]) {
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 812 });
        await page.evaluate(({ currentLocale, currentFacilitator }) => {
          locale = currentLocale;
          facilitator = currentFacilitator;
          runtimeConfig = { participants: { assigned_count: 2 } };
          state = { ...state, timer: { status: 'idle', remaining_seconds: 900 } };
          render();
        }, { currentLocale, currentFacilitator });
        await page.locator('.rulesCard').waitFor();
        const layoutBounds = await page.locator('[data-challenge-layout]').boundingBox();
        const rulesBounds = await page.locator('.rulesCard').boundingBox();
        if (layoutBounds.width > 1100) {
          const sideMargin = (layoutBounds.width - rulesBounds.width) / 2;
          assert.ok(rulesBounds.width <= 1100, 'Prestart rules stay within the readable maximum width');
          assert.ok(Math.abs(rulesBounds.x - layoutBounds.x - sideMargin) <= 1, 'Prestart rules are centered in the layout');
        } else {
          assert.ok(Math.abs(rulesBounds.x - layoutBounds.x) <= 1, 'Prestart rules align with the layout');
          assert.ok(Math.abs(rulesBounds.width - layoutBounds.width) <= 1, 'Prestart rules fill the available width');
        }
        assert.equal(await page.getByRole('grid').count(), 0, 'No arena before the server starts the timer');
        assert.equal(await page.locator('.answerForm, .wordCount, .socialLayout, .clueLists').count(), 0);
        assert.equal(await page.locator('.timerColumn, .headerTimer, [role="timer"]').count(), 0, 'No timer before the server starts the challenge');
        assert.equal(await page.getByRole('button', { name: currentLocale === 'en' ? 'Start game' : 'Démarrer la partie', exact: true }).count(), currentFacilitator ? 1 : 0);
        await page.getByText(currentLocale === 'en'
          ? 'Select a word, read its clue and submit your answer.'
          : 'Sélectionnez un mot, lisez sa définition et validez votre réponse.', { exact: true }).waitFor();
        if (!currentFacilitator) {
          await page.locator('.rulesCard').getByText(currentLocale === 'en'
            ? 'Waiting for the facilitator to start.'
            : 'En attente du démarrage par l’animateur.', { exact: true }).waitFor();
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.evaluate(() => {
          state = { ...state, timer: { status: 'running', remaining_seconds: 900 } };
          render();
        });
        await page.getByRole('grid').waitFor();
        assert.equal(await page.locator('.rulesCard').count(), 0);
        assert.equal(await page.getByRole('button', { name: currentLocale === 'en' ? 'Start game' : 'Démarrer la partie', exact: true }).count(), 0);
        assert.equal(await page.locator('.timerColumn').count(), 1, 'Timer column is shown after server confirmation');
        assert.equal(await page.locator('.headerTimer').count(), 1, 'Header shows the compact timer, as in the other challenges');
        assert.equal(await page.getByRole('timer').count(), 1, 'Only one visible timer card');
        const timerSlot = width > 900 ? '.challenge-desktop-timer' : '.challenge-mobile-timer';
        assert.equal(await page.locator(`${timerSlot} .timerRing`).count(), 1, 'Timer uses the shared circular display');
        await page.getByRole('status').filter({ hasText: currentLocale === 'en' ? '1/2 words found' : '1/2 mots trouvés' }).waitFor();
        const timerBounds = await page.locator(timerSlot).boundingBox();
        const arenaBounds = await page.locator('.arenaColumn').boundingBox();
        if (width > 960) {
          assert.ok(arenaBounds.x + arenaBounds.width <= timerBounds.x, 'Timer is right of the arena on desktop');
          assert.equal(Math.round(timerBounds.width), 240, 'Timer column has room for the shared timer card');
          const boardBounds = await page.locator('.boardPanel').boundingBox();
          const clueBounds = await page.locator('.clueLists').boundingBox();
          const ratio = boardBounds.width / (boardBounds.width + clueBounds.width);
          assert.ok(Math.abs(ratio - .7) < .01, 'Board/clues split is 70/30');
          assert.ok(boardBounds.x + boardBounds.width <= clueBounds.x, 'Clues are beside the board');
          assert.equal(await page.locator('.timerColumn').evaluate((node) => getComputedStyle(node).position), 'sticky');
          assert.ok(await page.locator('.cell').first().evaluate((node) => node.getBoundingClientRect().width) > 44, 'Cells grow when board space allows');
        } else {
          assert.ok(timerBounds.y + timerBounds.height <= arenaBounds.y, 'Timer is above the arena on mobile');
          assert.ok(Math.abs(timerBounds.width - arenaBounds.width) <= 1, 'Mobile timer spans the layout, as in the other challenges');
        }
        assert.equal(await page.getByRole('button', { name: /^(End game|Terminer la partie)$/ }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'challengeTimer.pause', exact: true }).count(), currentFacilitator ? 1 : 0);
        if (currentFacilitator) {
          const pauseBounds = await page.getByRole('button', { name: 'challengeTimer.pause', exact: true }).boundingBox();
          const timeBounds = await page.getByRole('timer').boundingBox();
          assert.ok(pauseBounds.y >= timeBounds.y + timeBounds.height, 'Pause stays below the timer');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: no page overflow during play`);
        await page.getByRole('button', { name: 'challengeRulesPanel.showRules', exact: true }).click();
        await page.getByRole('dialog').waitFor();
        await page.getByRole('button', { name: 'challengeRulesPanel.closeRules', exact: true }).click();
        assert.equal(await page.getByRole('dialog').count(), 0);
      }
    }
  }
  await page.evaluate(() => {
    locale = 'en';
    facilitator = true;
    runtimeConfig = { participants: { assigned_count: 1 } };
    state = { ...state, timer: { status: 'idle', remaining_seconds: 900 } };
    render();
  });
  const startButton = page.getByRole('button', { name: 'Start game', exact: true });
  await startButton.waitFor();
  for (const count of [undefined, 0, 1, 2, 5, 6, 50]) {
    await page.evaluate((assignedCount) => {
      runtimeConfig = { participants: { assigned_count: assignedCount } };
      render();
    }, count);
    assert.equal(await startButton.isDisabled(), false, `Start is available with ${count} assigned participants`);
  }
  await startButton.click();
  assert.ok(await page.evaluate(() => emitted.some((entry) => entry.type === 'timer.start')));
  assert.equal(await page.getByRole('grid').count(), 0, 'Clicking Start does not reveal the arena before server confirmation');
  for (const currentLocale of ['fr', 'en']) {
    const message = currentLocale === 'en' ? 'The game has already started.' : 'La partie a déjà démarré.';
    await page.evaluate(({ currentLocale, message }) => {
      locale = currentLocale;
      serverError = message;
      controlFeedback = { status: 'failed', message };
      render();
    }, { currentLocale, message });
    await page.getByRole('alert').filter({ hasText: message }).waitFor();
    assert.equal(await page.getByText(message, { exact: true }).count(), 1, 'Launch refusal must appear only once');
    assert.equal(await page.locator('p.notice[role="alert"]').textContent(), message, 'Keep the lower notice');
    assert.equal(await page.locator('div.error').count(), 0, 'Remove the duplicate red feedback');
  }
  await page.evaluate(() => {
    locale = 'en';
    controlFeedback = { status: 'failed', message: 'A different action failed.' };
    render();
  });
  await page.getByRole('alert').filter({ hasText: 'A different action failed.' }).waitFor();
  assert.equal(await page.getByRole('alert').count(), 2, 'Distinct errors must remain visible');
  await page.evaluate(() => { serverError = ''; controlFeedback = null; render(); });
  await page.evaluate(() => { socket.connected = false; render(); });
  assert.equal(await startButton.isDisabled(), true);
  await page.evaluate(() => { socket.connected = true; render(); });
  await page.evaluate(() => {
    runtimeConfig = { participants: { assigned_count: 6 } };
    render();
  });
  assert.equal(await startButton.isDisabled(), false);
  await page.evaluate(() => {
    facilitator = true;
    state = { ...state, timer: { status: 'running', remaining_seconds: 900 } };
    render();
  });
  await page.getByRole('grid').waitFor();
  const pauseButton = page.getByRole('button', { name: 'challengeTimer.pause', exact: true });
  await pauseButton.waitFor();
  await page.evaluate(() => { socket.connected = false; render(); });
  assert.equal(await pauseButton.isDisabled(), true, 'Pause is unavailable while disconnected');
  await page.evaluate(() => { socket.connected = true; render(); });
  await pauseButton.click();
  assert.ok(await page.evaluate(() => emitted.some((entry) => entry.type === 'timer.pause')));
  assert.equal(await page.evaluate(() => emitted.some((entry) => entry.type === 'timer.stop')), false);
  assert.equal(await pauseButton.count(), 1, 'Pause waits for server confirmation');
  await page.evaluate(() => {
    state = { ...state, timer: { status: 'paused', remaining_seconds: 900 } };
    render();
  });
  await page.getByRole('grid').waitFor();
  assert.equal(await page.locator('.rulesCard').count(), 0, 'Paused games do not return to the prestart rules');
  assert.equal(await pauseButton.count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Submit word', exact: true }).isDisabled(), true, 'Answers are disabled while paused');
  await page.getByRole('button', { name: 'challengeTimer.resume', exact: true }).click();
  assert.ok(await page.evaluate(() => emitted.some((entry) => entry.type === 'timer.resume')));
  await page.evaluate(() => {
    state = { ...state, timer: { status: 'running', remaining_seconds: 900 } };
    render();
  });
  await pauseButton.waitFor();
  await page.evaluate(() => {
    facilitator = false;
    runtimeConfig = { participants: { assigned_count: 2 } };
    state = { ...state, timer: { status: 'running', remaining_seconds: 900 } };
    render();
  });
  assert.deepEqual(await page.evaluate(() => {
    const catalog = { engine_config: { templatesByLocale: { fr: [{ id: 'fr', difficulty: 'facile' }], en: [{ id: 'en', difficulty: 'easy' }] } } };
    return [modal.getCrosswordTemplates(catalog, 'en').map((item) => item.id), modal.normalizeCrosswordDifficulty('difficile')];
  }), [['en'], 'hard']);
  await page.waitForTimeout(100);
  assert.deepEqual(errors, []);
  await page.getByLabel('Your answer', { exact: true }).fill('BAT');
  assert.equal(await page.getByRole('button', { name: 'Submit word' }).isDisabled(), true);
  await page.getByLabel('Your answer', { exact: true }).fill('cât');
  await page.getByRole('button', { name: 'Submit word' }).click();
  const firstRequest = await page.evaluate(() => emitted.find((entry) => entry.type === 'crossword.answer.submit'));
  assert.equal(firstRequest.payload.answer, 'CAT');
  assert.equal(firstRequest.payload.wordId, 'a');
  await page.evaluate(() => dispatch('challenge:event', { type: 'crossword.answer.result', payload: { requestId: 'unrelated', code: 'correct' } }));
  assert.equal(await page.getByLabel('Your answer', { exact: true }).isDisabled(), true);
  await page.evaluate((requestId) => dispatch('challenge:event', { type: 'crossword.answer.result', payload: { requestId, code: 'incorrect' } }), firstRequest.payload.requestId);
  await page.getByText('Not the right word. Try again.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Your answer', { exact: true }).inputValue(), 'cât');
  await page.getByRole('button', { name: 'Submit word' }).click();
  await page.evaluate(() => {
    const requestId = emitted.filter((entry) => entry.type === 'crossword.answer.submit').at(-1).payload.requestId;
    dispatch('challenge:event', { type: 'crossword.answer.result', payload: { requestId, code: 'rate_limited', retryAfterMs: 1000 } });
  });
  await page.getByText('Too many attempts. Wait before trying again.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Submit word' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Submit word' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('button.primary').disabled);
  await page.getByRole('button', { name: 'Submit word' }).click();
  await page.evaluate(() => dispatch('challenge:error', { code: 'invalid' }));
  await page.getByText('Invalid answer. Check your entry.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Your answer', { exact: true }).isDisabled(), false);
  await page.getByRole('button', { name: 'Submit word' }).click();
  await page.evaluate(() => dispatch('challenge:error', { message: 'Database temporarily unavailable. Please retry.' }));
  await page.getByText('Database temporarily unavailable. Please retry.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Submit word' }).click();
  await page.evaluate(() => {
    socket.connected = false;
    dispatch('disconnect');
    render();
  });
  await page.waitForFunction(() => !document.querySelector('.inputLine input').disabled);
  assert.equal(await page.getByLabel('Your answer', { exact: true }).isDisabled(), false);
  assert.equal(await page.getByLabel('Your answer', { exact: true }).inputValue(), 'cât');
  await page.evaluate(() => { socket.connected = true; render(); });
  await page.getByRole('button', { name: 'Submit word' }).click();
  await page.evaluate(() => {
    const requestId = emitted.filter((entry) => entry.type === 'crossword.answer.submit').at(-1).payload.requestId;
    dispatch('challenge:event', { type: 'crossword.answer.result', payload: { requestId, code: 'already_found', displayName: 'Sam' } });
    state = { ...state, crossword: { ...state.crossword, grid: { ...state.crossword.grid, words: state.crossword.grid.words.map((word) => word.id === 'a' ? { ...word, answer: 'CAT', solvedBy: 'p2' } : word) } } };
    render();
  });
  await page.getByRole('heading', { name: 'An organization' }).waitFor();
  await page.getByRole('button', { name: '1 A feline (3)' }).click();
  assert.equal(await page.getByLabel('Your answer', { exact: true }).inputValue(), 'cât');
  const firstCell = page.locator('[data-cell="0:0"]');
  await firstCell.focus();
  await page.keyboard.press('Space');
  await page.getByRole('heading', { name: 'A vehicle' }).waitFor();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.cell), '1:0');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.cell), '2:0');
  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await firstCell.evaluate((cell) => cell.getBoundingClientRect().width) >= 44);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => {
    locale = 'fr';
    state = { ...state, timer: { status: 'completed' }, crossword: {
      ...state.crossword,
      grid: { ...state.crossword.grid, words: state.crossword.grid.words.map((word) => ({
        ...word,
        solvedBy: word.id === 'd' ? word.solvedBy : null,
        answer: word.id === 'a' ? 'CAT' : word.id === 'b' ? 'ORG' : 'CAR',
      })) },
    } };
    render();
  });
  await page.getByRole('heading', { name: "Débrief de l'équipe", exact: true }).waitFor();
  assert.equal(await page.locator('.timerColumn, .timerCard').count(), 0, 'No timer in the final review');
  assert.equal(await page.locator('.challengeLayout').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length), 1);
  await page.getByRole('heading', { level: 1, name: 'Mots croisés Live', exact: true }).waitFor();
  await page.getByText('Mots non résolus', { exact: true }).waitFor();
  assert.deepEqual(await page.locator('.solution').allTextContents(), ['Réponse: CAT', 'Réponse: ORG']);
  assert.equal(await page.locator('.answerForm, .clueLists').count(), 0, 'Final review hides answer entry and active clues');
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  assert.equal(await page.locator('.card:not([data-debrief-content])').first().evaluate((card) => getComputedStyle(card).backgroundImage), 'linear-gradient(165deg, rgba(16, 33, 49, 0.9), rgba(10, 24, 36, 0.9))');
  assert.equal(await page.locator('.card:not([data-debrief-content])').first().evaluate((card) => getComputedStyle(card).color), 'rgb(232, 239, 255)');

  await page.evaluate(() => {
    locale = 'en';
    serverError = 'At least 2 participants are required.';
    state = { ...state, timer: { status: 'running' }, crossword: { ...state.crossword, grid: {
      ...state.crossword.grid, id: 'fixture-15', width: 15, height: 15,
      words: Array.from({ length: 15 }, (_, row) => ({
        id: `row-${row}`, number: row + 1, row, col: 0, direction: 'across', length: 15,
        clue: row === 14 ? 'The far edge of the board' : `Long clue ${row + 1}`,
        solvedBy: row === 0 ? 'p2' : null, answer: row === 0 ? 'ABCDEFGHIJKLMNO' : null,
      })).concat(
        { id: 'edge', number: 16, row: 0, col: 14, direction: 'down', length: 15, clue: 'Rightmost column', solvedBy: null, answer: null },
        ...Array.from({ length: 14 }, (_, col) => ({
          id: `column-${col}`, number: col + 17, row: 0, col, direction: 'down', length: 15,
          clue: `Column clue ${col + 1}`, solvedBy: null, answer: null,
        })),
      ),
    } } };
    render();
  });
  await page.getByRole('alert').filter({ hasText: 'At least 2 participants are required.' }).waitFor();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 812 });
      await page.getByRole('button', { name: '15 The far edge of the board (15)' }).click();
      await page.getByRole('button', { name: '16 Rightmost column (15)' }).click();
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('clueButton')), true);
      assert.equal(await page.locator('[data-cell="0:14"]').evaluate((cell) => {
        const viewport = cell.closest('.boardScroll').getBoundingClientRect();
        const bounds = cell.getBoundingClientRect();
        return bounds.left >= viewport.left && bounds.right <= viewport.right && bounds.top >= viewport.top && bounds.bottom <= viewport.bottom;
      }), true, `${theme}/${width}: selected clue cell visible`);
      if (width === 1440) {
        assert.equal(await page.locator('.boardScroll').evaluate((node) => node.scrollHeight <= node.clientHeight + 1), true, `${theme}: 15x15 board has no vertical inner scroll`);
        assert.equal(await page.locator('.clues').evaluateAll((lists) => lists.length === 2 && lists.every((list) => getComputedStyle(list).overflowY === 'auto' && list.scrollHeight > list.clientHeight)), true, `${theme}: horizontal and vertical clues scroll independently`);
        assert.equal(await page.locator('[data-cell="14:0"] .cellNumber').evaluate((number) => {
          const cell = number.closest('button').getBoundingClientRect();
          const bounds = number.getBoundingClientRect();
          return number.textContent === '15' && bounds.width >= 16 && bounds.right <= cell.right;
        }), true, `${theme}: two-digit cell numbers remain readable and inside their cells`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${theme}/${width}: no page overflow`);
      const contrasts = await page.evaluate(() => {
        const composite = (front, back) => {
          const alpha = front[3] ?? 1;
          return front.slice(0, 3).map((value, index) => value * alpha + back[index] * (1 - alpha));
        };
        const parse = (color) => color.match(/[\d.]+/g).map(Number);
        const luminance = (color) => color.map((value) => {
          const channel = value / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const contrast = (selector) => {
          const element = document.querySelector(selector);
          let background = [255, 255, 255];
          const ancestors = [];
          for (let current = element; current; current = current.parentElement) ancestors.unshift(current);
          for (const current of ancestors) background = composite(parse(getComputedStyle(current).backgroundColor), background);
          const foreground = composite(parse(getComputedStyle(element).color), background);
          const [low, high] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
          return (high + .05) / (low + .05);
        };
        return Object.fromEntries(['.card', '.help', '.cell.revealed', '.wordCell', '.clueButton', '.primary', '.inputLine input'].map((selector) => [selector, contrast(selector)]));
      });
      for (const [selector, contrast] of Object.entries(contrasts)) assert.ok(contrast >= 4.5, `${theme}/${width} ${selector}: contrast ${contrast}`);
      const missing = await page.locator('.root').evaluate((node, tokens) => tokens.filter((token) => !getComputedStyle(node).getPropertyValue(token).trim()), [...new Set(css.match(/--[a-z][\w-]+/g))].filter((token) => !['--board-max-height', '--columns', '--rows', '--cell-size', '--challenge-panel-bg'].includes(token)));
      assert.deepEqual(missing, [], `${theme}: every CSS token resolves from real globals`);
      if (theme === 'light') {
        assert.equal(await page.locator('.card').first().evaluate((card) => getComputedStyle(card).backgroundColor), 'rgba(255, 255, 255, 0.99)', `${width}: light panels use the shared fallback surface`);
      }
    }
  }

  await page.evaluate(() => {
    locale = 'en';
    globalThis.savedConfig = null;
    globalThis.catalog = { engine_key: 'crossword_live_v1', name: 'Crossword', engine_config: { templatesByLocale: {
      fr: [{ id: 'fr-easy', title: 'Équipe', difficulty: 'facile', width: 3, height: 3, preview: [{ row: 0, col: 0, answer: 'NEVER_RENDER_FR' }] }],
      en: [{ id: 'en-easy', title: 'Team', difficulty: 'easy', width: 3, height: 3, preview: [{ row: 0, col: 0, answer: 'NEVER_RENDER_EN' }, { row: 0, col: 1 }] }, { id: 'en-hard', title: 'Challenge', difficulty: 'hard', width: 15, height: 15, preview: [{ row: 14, col: 14 }] }],
    } } };
    globalThis.renderModal = () => root.render(React.createElement(modal.default, { challenge: catalog, onClose: () => {}, onSave: (config) => savedConfig = config }));
    renderModal();
  });
  await page.getByLabel('Grid', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Duration (minutes)', { exact: true }).inputValue(), '15');
  assert.equal(await page.getByLabel('Grid', { exact: true }).inputValue(), 'en-easy');
  const preview = page.getByRole('img', { name: 'Grid preview without answers' });
  await preview.waitFor();
  assert.equal(await preview.locator('[aria-hidden="true"]').count(), 9);
  assert.equal(await preview.locator('.crosswordPreviewCell').count(), 2);
  assert.equal(await preview.textContent(), '');
  assert.equal(await page.getByRole('dialog').evaluate((node) => node.outerHTML.includes('NEVER_RENDER')), false);
  await page.getByLabel('Difficulty', { exact: true }).selectOption('hard');
  assert.equal(await page.getByLabel('Grid', { exact: true }).inputValue(), 'en-hard');
  assert.equal(await preview.locator('[aria-hidden="true"]').count(), 225);
  await page.getByLabel('Duration (minutes)', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => savedConfig), {
    locale: 'en', gridId: 'en-hard', timer: { enabled: true, duration_seconds: 1800 },
    participants: { min_count: 0, max_count: null, recommended_count: 5 },
  });
  await page.evaluate(() => { locale = 'fr'; renderModal(); });
  await page.getByLabel('Grille', { exact: true }).waitFor();
  await page.getByRole('img', { name: 'Aperçu de la grille sans réponses' }).waitFor();
  assert.equal(await page.getByRole('dialog').evaluate((node) => node.outerHTML.includes('NEVER_RENDER')), false);
  assert.equal(await page.getByLabel('Grille', { exact: true }).inputValue(), 'fr-easy');
  await page.evaluate(() => {
    catalog = { ...catalog, engine_config: { templatesByLocale: { fr: [], en: [] } } };
    renderModal();
  });
  await page.getByText('Aucune grille disponible dans cette langue.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Enregistrer', exact: true }).isDisabled(), true);

  // Exercise the actual realtime hook independently of the component mock.
  await page.evaluate(() => {
    globalThis.hookValue = null;
    function Probe() {
      hookValue = hook.default({
        socket,
        runtimePayload: { engine_key: 'crossword_live_v1', challenge_id: '1', config: {} },
        context: { sessionId: 's1', userId: 'p1', role: 'participant' },
        onChallengeCompleted: (event) => completed.push(event),
      });
      return React.createElement('p', {}, hookValue.state?.crossword?.grid?.title || 'waiting');
    }
    root.render(React.createElement(Probe));
  });
  await page.getByText('waiting', { exact: true }).waitFor();
  await page.evaluate(() => dispatch('challenge:event', { type: 'crossword.state', payload: { crossword: state.crossword } }));
  await page.getByText('Teamwork', { exact: true }).waitFor();
  await page.evaluate(() => {
    const packet = { type: 'crossword.completed', payload: { reason: 'all_found', summary: { score: 2 } } };
    dispatch('challenge:event', packet);
    dispatch('challenge:event', packet);
  });
  await page.waitForFunction(() => hookValue.state?.timer?.status === 'completed');
  assert.equal(await page.evaluate(() => completed.length), 1);
  assert.deepEqual(errors, []);
  console.log('PASS crossword rules-first/server-confirmed arena, facilitator/participant FR/EN mobile/tablet/desktop, shared circular right timer, 70/30 board/clues, word count without progress bars, shared rules dialog and final review, normalization, correlated answers/errors, cooldown, saved drafts, auto-advance, keyboard/clue scrolling, 15x15 light/dark contrast >=4.5, no page overflow, config and realtime completion');
} finally {
  await browser.close();
}
