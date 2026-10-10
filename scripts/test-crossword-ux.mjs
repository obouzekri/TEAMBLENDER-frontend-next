import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { chromium } from 'playwright';

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
const globalCss = read('app/globals.css').replace(/^@import.*$/gm, '');
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.setContent('<html><body><main id="root"></main></body></html>');
  await page.addScriptTag({ path: path.join(root, 'node_modules', 'react', 'umd', 'react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'node_modules', 'react-dom', 'umd', 'react-dom.development.js') });
  await page.addStyleTag({ content: `${globalCss}\nbody { margin: 0; padding: 12px; box-sizing: border-box; } ${css} ${modalCss}` });
  await page.evaluate(({ ui, modal, hook }) => {
    const R = globalThis.React;
    const h = R.createElement;
    globalThis.locale = 'en';
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
        ] },
        scores: [{ participantId: 'p2', displayName: 'Sam', score: 1, words: [{ id: 'd', answer: 'CAR' }] }],
        activity: [{ wordId: 'd', answer: 'CAR', participantId: 'p2', displayName: 'Sam', ts: 123 }],
        solvedCount: 1, totalWords: 2, completionPercent: 50,
      },
    };
    const styles = new Proxy({}, { get: (_, key) => key });
    const i18n = () => ({ locale, t: (key) => key });
    const mockRealtime = () => ({ state, error: globalThis.serverError || '', connected: socket.connected, isFacilitator: false, emitEvent });
    const shared = (props) => h('section', {}, props.title || props.objective || props.feedback?.message || '', props.actions);
    const mocks = {
      react: R,
      '@/lib/i18n/useI18n': i18n,
      '@/lib/challenges/useRealtimeChallenge': mockRealtime,
      '@/lib/challenges/useConfirmedAction': () => ({ busy: false, feedback: null, run: () => {} }),
      '../ChallengeHeader': shared, '../ChallengeRulesPanel': shared, '../ChallengeTimerCard': shared,
      '../ChallengeActionFeedback': shared,
      './CrosswordChallenge.module.css': styles, './ChallengeConfigModal.module.css': styles,
      'next/image': shared,
      '@/lib/config': {}, '@/lib/csrf': {}, '@/lib/challenges/playerRange': { resolveChallengePlayerRange: () => ({}) },
      '@/lib/useBodyScrollLock': () => {},
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
    globalThis.ui = load(ui);
    globalThis.modal = load(modal);
    globalThis.hook = load(hook);
    globalThis.root = ReactDOM.createRoot(document.getElementById('root'));
    globalThis.render = () => root.render(h(globalThis.ui.default, { socket, runtimePayload: { config: {} }, context: {} }));
    render();
  }, { ui: transpile(uiSource), modal: transpile(modalSource), hook: transpile(hookSource) });

  assert.equal(await page.evaluate(() => ui.normalizeCrosswordAnswer(' é-qui pe ’')), 'EQUIPE');
  assert.equal(await page.evaluate(() => ui.buildCrosswordCells(state.crossword.grid).get('0:0').letter), 'C');
  assert.equal(await page.evaluate(() => ui.hasCrosswordConflict(state.crossword.grid.words[0], 'BAT', ui.buildCrosswordCells(state.crossword.grid))), true);
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
  await page.getByLabel('Your answer', { exact: true }).waitFor();
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
  await page.getByText('This word has already been found by Sam.', { exact: true }).waitFor();
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
  assert.equal(await firstCell.evaluate((cell) => cell.getBoundingClientRect().width), 44);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => {
    locale = 'fr';
    state = { ...state, timer: { status: 'completed' }, crossword: {
      ...state.crossword,
      grid: { ...state.crossword.grid, words: state.crossword.grid.words.map((word) => word.id === 'a' ? { ...word, solvedBy: null, answer: null } : word) },
    } };
    render();
  });
  await page.getByRole('heading', { name: 'Partie terminée' }).waitFor();
  await page.getByRole('heading', { name: 'Mots non résolus (1)' }).waitFor();
  await page.getByLabel('Votre réponse', { exact: true }).waitFor();
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  assert.equal(await page.locator('.card').first().evaluate((card) => getComputedStyle(card).backgroundColor), 'rgb(17, 26, 46)');
  assert.equal(await page.locator('.card').first().evaluate((card) => getComputedStyle(card).color), 'rgb(232, 239, 255)');

  await page.evaluate(() => {
    locale = 'en';
    serverError = 'At least 2 participants are required.';
    state = { ...state, timer: { status: 'running' }, crossword: { ...state.crossword, grid: {
      ...state.crossword.grid, id: 'fixture-15', width: 15, height: 15,
      words: Array.from({ length: 15 }, (_, row) => ({
        id: `row-${row}`, number: row + 1, row, col: 0, direction: 'across', length: 15,
        clue: row === 14 ? 'The far edge of the board' : `Long clue ${row + 1}`,
        solvedBy: row === 0 ? 'p2' : null, answer: row === 0 ? 'ABCDEFGHIJKLMNO' : null,
      })).concat({ id: 'edge', number: 16, row: 0, col: 14, direction: 'down', length: 15, clue: 'Rightmost column', solvedBy: null, answer: null }),
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
      const missing = await page.locator('.root').evaluate((node, tokens) => tokens.filter((token) => !getComputedStyle(node).getPropertyValue(token).trim()), [...new Set(css.match(/--[a-z][\w-]+/g))].filter((token) => token !== '--columns'));
      assert.deepEqual(missing, [], `${theme}: every CSS token resolves from real globals`);
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
    participants: { min_count: 2, max_count: 5, recommended_count: 5 },
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
  console.log('PASS crossword normalization, revealed conflicts, correlated results/actionable errors, cooldown, saved drafts, keyboard/clue scrolling without focus jumps, 15x15 mobile/desktop light/dark contrast >=4.5 using real global tokens, no page overflow, FR/EN config and realtime completion');
} finally {
  await browser.close();
}
