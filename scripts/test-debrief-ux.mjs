import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const require = createRequire(import.meta.url);
const runtime = (engine) => require(`../../backend/src/challenges/engines/${engine}/server-runtime.js`);
const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const config = {
  chat: { enabled: false }, timer: { enabled: true, duration_seconds: 600 },
  grid: { rows: 4, cols: 4 }, nombreJoueurs: 2, nombreIndices: 4,
};
const timer = { enabled: true, status: 'running', duration_seconds: 600, remaining_seconds: 590 };
const finalTimer = { ...timer, status: 'completed', remaining_seconds: 0 };
const summary = { completion_percent: 50, collective_score: 50, action_count: 4, message_count: 3, total_time_seconds: 600, total_words: 12, correct_words: 6 };
const player = { participant_id: '1', display_name: 'Fixture Player', score: 50, rank: 1 };
const phrase = runtime('phrase_collaborative_v1').buildPhraseRuntime(config);
const pieces = runtime('copuzzle_live_v1').buildPieces({ ...config, participants: { expected_count: 2 } });
const pixel = { ...runtime('pixel_architect_v1').buildInitialPixelState(config), phase: 'building' };
const lab = runtime('lab_d_innovation_v1').buildLabInnovationRuntime(config);
const maze = {
  phase: 'active', level: 1, levels_total: 1, cfg: { rows: 10, cols: 10 },
  maze: {
    cells: Array.from({ length: 10 }, (_, row) => Array.from({ length: 10 }, (_, col) => ({ n: row > 0, e: col < 9, s: row < 9, w: col > 0 }))),
    start: [0, 0], start_points: [[0, 0]], end: [9, 9], traps: { '1,1': true }, safe_path: [[0, 0], [0, 1]],
  },
  parts: { '1': { name: 'Fixture Player', lives_remaining: 3, slot: 1, solo: { ss: true, pos: [0, 0], path: [[0, 0], [0, 1]] } } },
};
const mission = {
  tasks: [{ id: 't1', label: 'Fixture task' }], timeline: ['t1'], phases: { t1: 'cadrage' },
  facilitator_board: [{ ...player, timeline: ['t1'], phases: { t1: 'cadrage' }, submitted: true, errors_count: 0 }],
};
const result = { score: 50, strengths: ['Fixture strength'], weaknesses: ['Fixture improvement'], errors: [] };
const vom = {
  phase: 'voting_open', participants_order: ['1', '2'], participants_meta: [player, { participant_id: '2', display_name: 'Second Player' }],
  scores: { '1': 50, '2': 20 }, ranking: [player, { participant_id: '2', score: 20, rank: 2 }], catalog: [], round_history: [], current_turn: { poser_id: '2', statement_text: 'Fixture statement', votes: {} },
};
const question = { id: 'q1', question: 'Fixture question', options: ['Blue', 'Green'], correctAnswer: 1 };
const quiz = {
  status: 'in_progress', phase: 'question_live', current_question: question,
  question_duration_seconds: 600, question_ends_at: new Date(Date.now() + 600000).toISOString(),
  connected_count: 2, slot_count: 2, chat_enabled: false, leaderboard_enabled: true,
  participants: [player], leaderboard: [player], final_standings: [], answer_count: 0,
};
const escape = {
  status: 'in_progress', timer, total_enigmes: 2, current_enigme_index: 0,
  current_enigme: { id: 'e1', label: 'Fixture riddle', description: 'Question', ui_type: 'text', ui_data: {} },
  submission_status: { total: 2, responded: 0, responded_ids: [] },
};

const cases = [
  ['phrase_collaborative_v1', { phrase }, { phrase, summary }],
  ['copuzzle_live_v1', { puzzle: { pieces } }, { puzzle: { pieces }, summary }],
  ['pixel_architect_v1', { pixel }, { pixel: { ...pixel, phase: 'debrief' }, summary }],
  ['lab_d_innovation_v1', { labInnovation: lab }, { labInnovation: { ...lab, phase: 'final_vote' }, summary }],
  ['labyrinthe_live_v1', { labyrinthe: maze }, { labyrinthe: { ...maze, phase: 'done', result: { status: 'success' }, winner_participant_id: '1' } }],
  ['mission_critique_v1', { mission }, { mission: { ...mission, result, collective_result: result }, summary }],
  ['vrai_ou_mensonge_v1', { vom }, { vom: { ...vom, phase: 'finished', current_turn: null } }],
  ['the_quiz_v1', { quiz }, { quiz: { ...quiz, phase: 'final_score', status: 'finished', final_standings: [player], question_history: [{ question_id: 'q1', question_index: 0, question, correct_choice_index: 1 }] } }],
  ['escape_room_v1', {}, {}],
];

async function assertMetricStyle(value) {
  const style = await value.evaluate((node) => {
    const parse = (color) => color.match(/[\d.]+/g).map(Number);
    const ancestors = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) ancestors.unshift(parent);
    let background = [255, 255, 255];
    for (const parent of ancestors) {
      const channels = parse(getComputedStyle(parent).backgroundColor);
      const alpha = channels[3] ?? 1;
      background = background.map((channel, index) => channels[index] * alpha + channel * (1 - alpha));
    }
    const luminance = (channels) => {
      const linear = channels.slice(0, 3).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const foregroundLuminance = luminance(parse(getComputedStyle(node).color));
    const backgroundLuminance = luminance(background);
    return {
      size: parseFloat(getComputedStyle(node).fontSize),
      contrast: (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
    };
  });
  assert.ok(style.size >= 22, 'Small performance value');
  assert.ok(style.contrast >= 4.5, `Performance value contrast below 4.5: ${JSON.stringify(style)}`);
}

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const locale of ['fr', 'en']) {
    for (const role of ['manager', 'participant']) {
      for (const width of [1440, 390]) {
        for (const [engineKey, playing, finished] of cases) {
          console.log(`Debrief: ${engineKey}, ${locale}, ${role}, ${width}`);
          const caseConfig = { ...config, chat: { enabled: role === 'participant' } };
          const playingState = { config: caseConfig, timer, ...playing };
          const finishedState = { config: caseConfig, timer: finalTimer, ...finished };
          if (engineKey === 'the_quiz_v1') {
            playingState.quiz = { ...playingState.quiz, chat_enabled: caseConfig.chat.enabled };
            finishedState.quiz = { ...finishedState.quiz, chat_enabled: caseConfig.chat.enabled };
          }
          const fixture = await createRealtimeFixture(browser, {
            baseUrl, locale, role, engineKey, state: playingState,
            theme: (locale === 'fr') === (width === 1440) ? 'light' : 'dark', viewport: { width, height: 1000 },
          });
          try {
            let escapeState = escape;
            if (engineKey === 'escape_room_v1') {
              await fixture.context.route('**/api/**/escape-room/**', (route) => route.fulfill({
                json: route.request().url().endsWith('/participants') ? { participants: [] } : escapeState,
              }));
            }
            if (engineKey === 'pixel_architect_v1') {
              await fixture.context.addInitScript(() => {
                const getContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function (type, ...args) {
                  return String(type).toLowerCase().includes('webgl') ? null : getContext.call(this, type, ...args);
                };
              });
            }
            const page = await fixture.context.newPage();
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
            await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
            await page.getByRole('timer').first().waitFor({ state: 'attached' });
            assert.ok(await page.getByRole('timer').count() > 0, 'Playing clock missing');
            escapeState = { ...escape, status: 'completed', timer: finalTimer, current_enigme: null, finished_at: '2026-10-08T11:00:00Z' };
            fixture.replaceState(finishedState);

            const root = page.locator('[data-challenge-debrief="true"]');
            await root.waitFor({ timeout: 15000 });
            assert.equal(await page.getByRole('timer').count(), 0, 'Debrief clock is still mounted, including header');
            assert.equal(await root.locator('[class*="timerCard"]').count(), 0, 'Timer card is still mounted');
            const layout = root.locator('[data-challenge-layout]');
            const bounds = await layout.boundingBox();
            const main = await layout.locator(':scope > :first-child').boundingBox();
            assert.ok(main.width >= bounds.width - 2, `Main content did not reclaim the sidebar: ${main.width}/${bounds.width}`);
            const sidebar = layout.locator(':scope > aside');
            if (await sidebar.isVisible()) {
              const side = await sidebar.boundingBox();
              assert.ok(side.y >= main.y + main.height - 1, 'Secondary content still occupies a right column');
              assert.equal(await sidebar.locator(':scope > section:empty:visible').count(), 0, 'Empty horizontal panel');
            }
            const content = root.locator('[data-debrief-content]').first();
            await content.waitFor();
            const heading = content.getByRole('heading').first();
            const titleStyle = await heading.evaluate((node) => ({ size: parseFloat(getComputedStyle(node).fontSize), weight: parseFloat(getComputedStyle(node).fontWeight) }));
            assert.ok(titleStyle.size >= 22 && titleStyle.weight >= 700, `Weak debrief heading: ${JSON.stringify(titleStyle)}`);
            assert.ok(!/\p{Extended_Pictographic}/u.test(await content.innerText()), 'Decorative emoji in debrief analysis');
            for (const value of await content.locator('[data-debrief-metrics] strong').all()) {
              await assertMetricStyle(value);
            }
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
            assert.deepEqual(errors, [], 'Runtime errors');
            if (process.env.DEBRIEF_SCREENSHOT_PATH && engineKey === 'phrase_collaborative_v1' && locale === 'fr' && role === 'manager' && width === 1440) {
              await page.screenshot({ path: process.env.DEBRIEF_SCREENSHOT_PATH, fullPage: true });
            }
          } finally {
            await fixture.close();
          }
        }
      }
    }
  }
  console.log('TEST_DEBRIEF_UX_OK (72 game-to-debrief transitions)');
} finally {
  await browser.close();
}
