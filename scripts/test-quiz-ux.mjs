import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const engineKey = 'the_quiz_v1';
const question = { id: 'q1', question: 'Fixture question one', options: ['Blue', 'Green', 'Red', 'Yellow'], correctAnswer: null };
const baseQuiz = {
  phase: 'question_live', current_question: question, question_duration_seconds: 600,
  question_ends_at: new Date(Date.now() + 600000).toISOString(),
  connected_count: 2, slot_count: 2, chat_enabled: true, leaderboard_enabled: true,
  participants: [{ participant_id: '1', display_name: 'Fixture Player' }],
  leaderboard: [], final_standings: [], answer_count: 0,
};
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const locale of ['fr', 'en']) {
    for (const width of [1440, 390]) {
      console.log(`Checking quiz: ${locale}, ${width}`);
      const dictionary = locale === 'fr' ? fr : en;
      const fixture = await createRealtimeFixture(browser, {
        baseUrl, locale, role: 'participant', engineKey, state: { quiz: baseQuiz, config: {} },
        viewport: { width, height: 1000 },
      });
      try {
        const page = await fixture.context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        await page.getByRole('heading', { name: question.question, exact: true }).waitFor();
        const submit = page.getByRole('button', { name: locale === 'fr' ? 'Valider ma réponse' : 'Submit my answer', exact: true });
        const answers = page.getByRole('radio');
        const submissions = () => fixture.receivedEvents.filter((event) => event.type === 'quiz.answer.submit');
        assert.deepEqual(await answers.evaluateAll((items) => items.map((item) => item.getAttribute('aria-checked'))), ['false', 'false', 'false', 'false']);
        assert.ok(await submit.isDisabled());
        await page.locator('body').click({ position: { x: 2, y: 2 } });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);
        assert.deepEqual(submissions(), []);
        await answers.nth(1).focus();
        await answers.nth(1).press('Enter');
        assert.equal(await answers.nth(1).getAttribute('aria-checked'), 'true');
        assert.ok(await submit.isEnabled());
        assert.deepEqual(submissions(), []);

        await page.getByRole('button', { name: dictionary.chatCard.title, exact: true }).click();
        const chat = page.getByPlaceholder(dictionary.chatCard.placeholder);
        await chat.press('1');
        assert.equal(await chat.inputValue(), '1');
        assert.equal(await answers.nth(1).getAttribute('aria-checked'), 'true');
        await chat.press('Enter');
        await page.waitForTimeout(150);
        assert.deepEqual(submissions(), []);
        assert.ok(fixture.receivedEvents.some((event) => event.type === 'chat.message' && event.payload.text === '1'));
        const chatMessage = fixture.receivedEvents.find((event) => event.type === 'chat.message');
        fixture.broadcast('chat.message', { ...chatMessage.payload, id: 'quiz-chat-confirmation' });
        await page.waitForFunction((placeholder) => Array.from(document.querySelectorAll('input')).some((input) => input.placeholder === placeholder && input.value === ''), dictionary.chatCard.placeholder);
        await page.getByRole('button', { name: dictionary.chatCard.closeAria, exact: true }).click();

        await page.locator('body').click({ position: { x: 2, y: 2 } });
        await page.keyboard.press('3');
        assert.equal(await answers.nth(2).getAttribute('aria-checked'), 'true');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(150);
        assert.deepEqual(submissions().map((entry) => entry.payload.selected_option), [2]);
        await page.keyboard.press('Enter');
        assert.equal(submissions().length, 1);
        await page.getByRole('status').filter({ hasText: dictionary.challengeAction.sending }).waitFor();
        fixture.broadcast('answer_submitted', { participant_id: 2, question_id: 'q1', selected_option: 2, accepted: true });
        await page.waitForTimeout(150);
        assert.equal(await page.getByRole('button', { name: locale === 'fr' ? 'Réponse confirmée' : 'Answer confirmed', exact: true }).count(), 0, 'Do not confirm another player');
        fixture.broadcastError('Answer rejected');
        await page.getByRole('alert').filter({ hasText: 'Answer rejected' }).first().waitFor();
        assert.equal(await answers.nth(2).getAttribute('aria-checked'), 'true', 'Keep rejected answer selection');
        await page.getByRole('button', { name: dictionary.chatCard.retry, exact: true }).click();
        await page.waitForTimeout(150);
        assert.equal(submissions().length, 2);
        fixture.broadcast('answer_submitted', { participant_id: 1, question_id: 'q1', selected_option: 2, accepted: true });
        await page.getByRole('button', { name: locale === 'fr' ? 'Réponse confirmée' : 'Answer confirmed', exact: true }).waitFor();

        const questionTwo = { ...question, id: 'q2', question: 'Fixture question two' };
        fixture.broadcast('quiz.state', { quiz: { ...baseQuiz, current_question: questionTwo } });
        await page.getByRole('heading', { name: questionTwo.question, exact: true }).waitFor();
        assert.ok(await submit.isDisabled());
        assert.equal(await page.locator('[role="radio"][aria-checked="true"]').count(), 0);
        fixture.broadcast('quiz.state', { quiz: {
          ...baseQuiz, phase: 'question_result', current_question: questionTwo,
          latest_question_result: { question_id: 'q2', question: questionTwo, correct_choice_index: null },
        } });
        await page.getByText(locale === 'fr' ? 'Aucune réponse envoyée' : 'No answer submitted', { exact: true }).waitFor();
        assert.equal(await page.getByText(/Bonne réponse: A\.|Correct answer: A\./).count(), 0);
        assert.equal(await page.locator('[class*="leaderboardCard"]').count(), 0);
        await page.getByText(locale === 'fr' ? 'Classement en attente : aucun score reçu pour le moment.' : 'Leaderboard pending: no scores received yet.', { exact: true }).first().waitFor();

        fixture.broadcast('quiz.state', { quiz: { ...baseQuiz, phase: 'final_score' } });
        await page.getByText(locale === 'fr' ? 'Aucun score enregistré pour ce quiz.' : 'No scores recorded for this quiz.', { exact: true }).first().waitFor();
        assert.equal(await page.getByText('4 pts', { exact: true }).count(), 0);
        const metric = page.locator('[class*="metricCard"]').filter({ hasText: locale === 'fr' ? 'Score gagnant' : 'Winning score' });
        assert.equal(await metric.locator('strong').textContent(), '-');
        fixture.broadcast('quiz.state', { quiz: { ...baseQuiz, phase: 'final_score', final_standings: null, leaderboard: null } });
        await page.getByText(locale === 'fr' ? 'Données du classement indisponibles.' : 'Leaderboard data unavailable.', { exact: true }).first().waitFor();
        const row = { participant_id: '1', display_name: 'Fixture Player', score: 0, rank: 1 };
        fixture.broadcast('quiz.state', { quiz: { ...baseQuiz, phase: 'final_score', final_standings: [row], leaderboard: [row] } });
        await page.getByText('Fixture Player', { exact: true }).first().waitFor();
        assert.ok(await page.getByText('0 pts', { exact: true }).count() > 0);
        assert.equal(await page.getByText('Camille', { exact: true }).count(), 0);
        assert.deepEqual(errors, []);
      } finally {
        await fixture.close();
      }
    }
  }
  console.log('TEST_QUIZ_UX_OK');
} finally {
  await browser.close();
}
