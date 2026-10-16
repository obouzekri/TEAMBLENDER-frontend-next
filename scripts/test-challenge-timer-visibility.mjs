import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';

const require = createRequire(import.meta.url);
const runtime = (engine) => require(`../../backend/src/challenges/engines/${engine}/server-runtime.js`);
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const config = { chat: { enabled: false }, timer: { enabled: true, duration_seconds: 600 }, grid: { rows: 4, cols: 4 }, nombreJoueurs: 2 };
const timer = { enabled: true, status: 'idle', duration_seconds: 600, remaining_seconds: 600 };
const cases = [
  ['mission_critique_v1', { mission: { tasks: [], timeline: [], phases: {} } }],
  ['phrase_collaborative_v1', { phrase: runtime('phrase_collaborative_v1').buildPhraseRuntime(config) }],
  ['copuzzle_live_v1', { puzzle: { pieces: runtime('copuzzle_live_v1').buildPieces(config) } }],
  ['lab_d_innovation_v1', { lab: runtime('lab_d_innovation_v1').buildLabInnovationRuntime(config) }],
  ['pixel_architect_v1', { pixel: runtime('pixel_architect_v1').buildInitialPixelState(config) }],
  ['labyrinthe_live_v1', { labyrinthe: { phase: 'setup', parts: {}, cfg: { rows: 4, cols: 4 } } }],
  ['crossword_live_v1', { crossword: { grid: { id: 'timer-grid', width: 3, height: 3, words: [] }, scores: [] } }],
  ['the_quiz_v1', { quiz: { phase: 'lobby', connected_count: 2, slot_count: 2, participants: [], leaderboard: [] } }],
  ['vrai_ou_mensonge_v1', { vom: { phase: 'waiting_start', participants_order: ['1', '2'], participants_meta: [], scores: {}, catalog: [], round_history: [] } }],
  ['escape_room_v1', {}],
];

function startedState(engineKey, initial, status) {
  const state = { ...initial, timer: { ...timer, status, remaining_seconds: 590 } };
  if (engineKey === 'labyrinthe_live_v1') state.labyrinthe = { ...initial.labyrinthe, phase: 'active' };
  if (engineKey === 'the_quiz_v1') state.quiz = {
    ...initial.quiz, phase: 'question_live', status,
    current_question: { id: 'q1', question: 'Timer visibility', options: ['A', 'B'] },
    question_duration_seconds: 600, question_ends_at: new Date(Date.now() + 600000).toISOString(),
  };
  if (engineKey === 'vrai_ou_mensonge_v1') state.vom = {
    ...initial.vom, phase: 'selecting_statement', status,
    current_turn: { poser_id: '1', votes: {} }, phase_deadline_ms: Date.now() + 600000,
    facilitator_pause: status === 'paused' ? { remaining_ms: 590000 } : null,
  };
  return state;
}

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const [role, width, locale] of [['manager', 1440, 'fr'], ['participant', 390, 'en']]) {
    for (const [engineKey, data] of cases) {
      const initial = { config, timer, ...data };
      const fixture = await createRealtimeFixture(browser, { baseUrl, locale, role, engineKey, state: initial, viewport: { width, height: 1000 } });
      let escapeStatus = 'waiting_for_start';
      if (engineKey === 'escape_room_v1') {
        await fixture.context.route('**/api/**/escape-room/**', async (route) => {
          if (route.request().url().endsWith('/participants')) return route.fulfill({ json: { participants: [] } });
          return route.fulfill({ json: {
            status: escapeStatus, timer: { ...timer, status: escapeStatus === 'paused' ? 'paused' : 'running' },
            total_enigmes: 1, current_enigme_index: 0,
            current_enigme: { id: 'e1', label: 'Timer visibility', description: 'Question', ui_type: 'text', ui_data: {} },
            submission_status: { total: 2, responded: 0, responded_ids: [] },
          } });
        });
      }
      try {
        const page = await fixture.context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        await page.locator('[class*="rulesCard"]').first().waitFor();
        const clocks = page.getByRole('timer', { includeHidden: true });
        assert.equal(await clocks.count(), 0, `${engineKey}: no timer in the DOM before start`);
        assert.equal(await page.locator('[class*="timerCard"]').count(), 0, `${engineKey}: no empty timer card before start`);
        for (const status of ['running', 'paused']) {
          escapeStatus = status === 'running' ? 'in_progress' : 'paused';
          fixture.replaceState(startedState(engineKey, initial, status));
          await page.getByRole('timer').first().waitFor({ timeout: 15000 });
          const dictionary = locale === 'fr' ? fr : en;
          await page.locator('[class*="timerCard"] [class*="statusAnnouncement"]')
            .filter({ hasText: dictionary.challengeTimer[status] }).first().waitFor({ state: 'attached', timeout: 15000 });
          assert.ok(await clocks.count() > 0, `${engineKey}: timer present when ${status}`);
        }
        if (engineKey === 'the_quiz_v1' || engineKey === 'vrai_ou_mensonge_v1') {
          const next = startedState(engineKey, initial, 'running');
          if (next.quiz) next.quiz = { ...next.quiz, phase: 'question_result' };
          if (next.vom) next.vom = { ...next.vom, phase: 'next_turn' };
          fixture.replaceState(next);
          await page.waitForTimeout(500);
          assert.ok(await page.getByRole('timer').count() > 0, `${engineKey}: keep timer between rounds`);
        }
        escapeStatus = 'waiting_for_start';
        fixture.replaceState(initial);
        await page.getByRole('timer', { includeHidden: true }).first().waitFor({ state: 'detached', timeout: 15000 });
        assert.equal(await clocks.count(), 0, `${engineKey}: reset hides timers again`);
        assert.deepEqual(errors, [], `${engineKey}: runtime errors`);
        console.log(`PASS: ${engineKey}, ${role}, ${width}px, ${locale}: prestart, running, paused, reset`);
      } finally {
        await fixture.close();
      }
    }
  }
} finally {
  await browser.close();
}
