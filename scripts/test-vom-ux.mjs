import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'vrai_ou_mensonge_v1';
const catalog = [{ id: 'ct_01', text: 'Je maîtrise plus de trois langues.', category: 'Compétences' }];
const baseVom = {
  phase: 'waiting_start',
  participants_order: ['1', '2', '3'],
  participants_meta: [
    { participant_id: '1', first_name: 'sophie', last_name: 'bourger', slot: 1 },
    { participant_id: '2', first_name: 'anne', last_name: 'MARTIN', slot: 2 },
    { participant_id: '3', display_name: 'jean-pierre dupont', slot: 3 },
  ],
  scores: { '1': 0, '2': 0, '3': 0 },
  catalog,
  current_turn: null,
  round_history: [],
};

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
      const normalized = value / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const { locale, role, theme, width } of [
    { locale: 'fr', role: 'participant', theme: 'light', width: 1440 },
    { locale: 'fr', role: 'participant', theme: 'dark', width: 390 },
    { locale: 'en', role: 'participant', theme: 'light', width: 1440 },
    { locale: 'fr', role: 'manager', theme: 'light', width: 1440 },
  ]) {
    const state = { challengeKey: engineKey, config: {}, vom: baseVom };
    const { context, broadcast, close } = await createRealtimeFixture(browser, {
      baseUrl, locale, role, engineKey, state, theme, viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
    await page.getByText(locale === 'fr' ? '✅ Bonne réponse : +1 point' : '✅ Correct answer: +1 point', { exact: true }).waitFor();
    assert.ok(await page.getByText(locale === 'fr' ? '❌ Mauvaise réponse : 0 point' : '❌ Wrong answer: 0 points', { exact: true }).count());
    assert.ok(await page.getByText(locale === 'fr' ? '⏱️ Hors délai : 0 point' : '⏱️ Time expired: 0 points', { exact: true }).count());
    assert.equal(await page.getByText('Un feedback et le score sont affichés à la fin de chaque manche.', { exact: true }).count(), 0);
    if (locale === 'fr') await page.getByRole('heading', { name: 'Pari sur moi', exact: true }).waitFor();

    let turn = { poser_id: '2', statement_id: 'ct_01', statement_text: catalog[0].text, answer_mode: 'boolean', votes: { '1': 'vrai' } };
    broadcast('vom.state', { vom: { ...baseVom, phase: 'voting_open', current_turn: turn } });
    await page.getByText(locale === 'fr' ? 'Je maîtrise plus de trois langues' : 'I speak more than three languages', { exact: false }).first().waitFor();
    assert.equal(await page.getByText(locale === 'fr' ? 'Votre question' : 'Your question', { exact: true }).count(), 0);

    for (const status of ['incorrect', 'correct', 'absent']) {
      const vote = status === 'absent' ? null : status === 'correct' ? 'mensonge' : 'vrai';
      turn = { ...turn, revealed_truth: 'mensonge', result: {
        poser_points: 1, votes: [{ participant_id: '1', vote, status, points: status === 'correct' ? 1 : 0 }],
      } };
      broadcast('vom.state', { vom: { ...baseVom, phase: 'round_result', current_turn: turn } });
      await page.getByRole('heading', { name: locale === 'fr' ? 'Résultat de la manche' : 'Round result', exact: true }).waitFor();
      const statusText = status === 'correct' ? '✅ Correct' : status === 'incorrect' ? '❌ Incorrect' : locale === 'fr' ? '⏱️ Hors délai' : '⏱️ Time expired';
      const row = page.locator('[class*="resultRow"]').filter({ hasText: 'Sophie Bourger' });
      await row.getByText(statusText, { exact: true }).waitFor();
      const badge = row.locator('[class*="resultStatusText"]');
      const colors = await badge.evaluate((item) => ({ foreground: getComputedStyle(item).color, background: getComputedStyle(item).backgroundColor }));
      assert.ok(contrastRatio(colors.foreground, colors.background) >= 4.5, `Badge contrast below 4.5: ${JSON.stringify(colors)}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Horizontal overflow in results');
      if (role === 'participant') {
        const comparison = page.locator('[class*="answerComparison"]');
        await comparison.getByText(locale === 'fr' ? 'Bonne réponse: Faux ✅' : 'Correct answer: False ✅', { exact: true }).waitFor();
        const expected = status === 'absent' ? (locale === 'fr' ? 'Aucune réponse' : 'No answer') : status === 'correct' ? (locale === 'fr' ? 'Faux' : 'False') : (locale === 'fr' ? 'Vrai' : 'True');
        assert.ok((await comparison.textContent()).includes(expected));
        const score = page.locator('[class*="mainScoreCard"]');
        assert.ok(await score.evaluate((item) => item.getBoundingClientRect().height) < 100);
        const heading = await page.locator('[class*="wowTitle"]').boundingBox();
        const scoreBounds = await score.boundingBox();
        assert.ok(heading.y < scoreBounds.y);
        assert.ok(await page.locator('[class*="wowTitle"]').evaluate((item) => Number.parseFloat(getComputedStyle(item).fontSize))
          > await page.locator('[class*="mainScoreValue"]').evaluate((item) => Number.parseFloat(getComputedStyle(item).fontSize)));
      } else {
        assert.equal(await page.locator('[class*="mainScoreCard"]').count(), 0);
      }
    }
    if (role === 'participant') {
      broadcast('vom.state', { vom: { ...baseVom, phase: 'round_result', current_turn: {
        ...turn, revealed_truth: null, result: { reveal_reason: 'selection_timeout', poser_points: 0, votes: [] },
      } } });
      await page.getByText(locale === 'fr' ? 'Manche interrompue' : 'Round interrupted', { exact: true }).waitFor();
      assert.equal(await page.locator('[class*="answerComparison"]').count(), 0);
      turn = { ...turn, statement_id: 'pr_01', statement_text: 'Je préfère Café / Thé / Jus', statement_options: ['Café', 'Thé', 'Jus'], answer_mode: 'choice', revealed_truth: 'Thé',
        result: { poser_points: 1, votes: [{ participant_id: '1', vote: 'Café', status: 'incorrect', points: 0 }] } };
      broadcast('vom.state', { vom: { ...baseVom, phase: 'round_result', current_turn: turn } });
      await page.locator('[class*="answerComparison"]').getByText(locale === 'fr' ? 'Bonne réponse: Thé ✅' : 'Correct answer: Tea ✅', { exact: true }).waitFor();

      broadcast('vom.state', { vom: { ...baseVom, phase: 'selecting_statement', current_turn: { poser_id: '1' } } });
      await page.getByRole('button', { name: /Je maîtrise plus de trois langues|I speak more than three languages/ }).click();
      const modal = page.getByRole('dialog');
      await modal.waitFor();
      assert.equal(await modal.getByText(locale === 'fr' ? 'Votre question' : 'Your question', { exact: true }).count(), 0);
      await modal.getByRole('button', { name: locale === 'fr' ? 'Annuler' : 'Cancel', exact: true }).click();
      broadcast('vom.state', { vom: { ...baseVom, phase: 'round_result', current_turn: {
        ...turn, poser_id: '1', result: { poser_points: 1, votes: [{ participant_id: '2', vote: 'Café', status: 'incorrect', points: 0 }] },
      } } });
      await page.getByText(locale === 'fr' ? 'Bluff révélé' : 'Bluff revealed', { exact: true }).waitFor();
      assert.equal(await page.locator('[class*="answerComparison"]').count(), 0);
    }
    assert.ok(await page.getByText('Anne Martin', { exact: true }).count());
    assert.deepEqual(errors, []);
    await close();
  }
  console.log('TEST_VOM_UX_OK');
} finally {
  await browser.close();
}
