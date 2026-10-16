import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'vrai_ou_mensonge_v1';
const catalog = [
  { id: 'ct_01', text: 'Je maîtrise plus de trois langues.', category: 'Compétences' },
  { id: 'ct_02', text: 'J’ai un talent caché.', category: 'Compétences' },
  { id: 'pr_01', text: 'Je préfère: café / thé / jus.', category: 'Préférences' },
  { id: 'pr_02', text: 'Je préfère: montagne / plage / forêt.', category: 'Préférences' },
  { id: 'pr_03', text: 'Je préfère: ville / campagne.', category: 'Préférences' },
  { id: 'pr_04', text: 'Je préfère: films / sorties.', category: 'Préférences' },
  { id: 'ht_01', text: 'Je me couche tard / tôt.', category: 'Habitudes' },
  { id: 'ht_02', text: 'Je fais du sport régulièrement.', category: 'Habitudes' },
  { id: 'ht_03', text: 'Je commence ma journée avec mon téléphone.', category: 'Habitudes' },
  { id: 'ht_04', text: 'Je grignote entre les repas.', category: 'Habitudes' },
  { id: 'pe_01', text: 'Je suis plutôt: compétitif / calme / spontané.', category: 'Personnalité' },
  { id: 'pa_01', text: 'J’ai déjà oublié de me présenter en réunion importante.', category: 'Anecdotes' },
  { id: 'pa_02', text: 'J’ai déjà répondu “oui” sans avoir compris.', category: 'Anecdotes' },
  { id: 'pa_03', text: 'J’ai déjà perdu: téléphone / portefeuille / les deux.', category: 'Anecdotes' },
];
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
    { locale: 'en', role: 'participant', theme: 'light', width: 320 },
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
    else await page.getByRole('heading', { name: 'Bet on me!', exact: true }).waitFor();

    let turn = { poser_id: '2', statement_id: 'ct_01', statement_text: catalog[0].text, answer_mode: 'boolean', votes: { '1': 'vrai' } };
    broadcast('vom.state', { vom: { ...baseVom, phase: 'voting_open', current_turn: turn } });
    await page.getByText(locale === 'fr' ? 'Je maîtrise plus de trois langues' : 'I speak more than three languages', { exact: false }).first().waitFor();
    assert.equal(await page.getByText(locale === 'fr' ? 'Votre question' : 'Your question', { exact: true }).count(), 0);
    if (role === 'participant') {
      assert.equal(await page.locator('[class*="roleBanner"]').count(), 0);
      broadcast('vom.state', { vom: { ...baseVom, phase: 'voting_open', current_turn: { ...turn, votes: {} } } });
      await page.getByText(locale === 'fr' ? /Votez : devinez/ : /Vote: guess/).waitFor();
      broadcast('vom.state', { vom: { ...baseVom, phase: 'selecting_statement', current_turn: { ...turn, poser_id: '1', votes: {} } } });
      await page.getByText(locale === 'fr' ? /C’est votre tour/ : /It is your turn/).waitFor();
      const statementCards = page.locator('[class*="statementGrid"] > button');
      await statementCards.last().waitFor();
      await statementCards.evaluateAll((cards) => Promise.all(cards.flatMap((card) =>
        card.getAnimations().map((animation) => animation.finished))));
      const cardSizes = await statementCards.evaluateAll((cards) => cards.map((card) => {
        const bounds = card.getBoundingClientRect();
        const labels = [...card.children].filter((child) => child.getAttribute('aria-hidden') !== 'true');
        return {
          height: bounds.height,
          fits: labels.every((label) => {
            const textBounds = label.getBoundingClientRect();
            return textBounds.top >= bounds.top && textBounds.bottom <= bounds.bottom
              && textBounds.left >= bounds.left && textBounds.right <= bounds.right
              && label.scrollHeight <= label.clientHeight && label.scrollWidth <= label.clientWidth;
          }),
        };
      }));
      assert.equal(cardSizes.length, catalog.length);
      assert.ok(cardSizes.every(({ height }) => height >= 152 && height <= 180),
        `Statement cards must stay compact: ${JSON.stringify(cardSizes)}`);
      assert.ok(Math.max(...cardSizes.map(({ height }) => height)) - Math.min(...cardSizes.map(({ height }) => height)) < 1,
        'All statement cards must have the same height, including across rows');
      assert.ok(cardSizes.every(({ fits }) => fits), 'Statement text must not be clipped');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        'Horizontal overflow in statement selection');
    }

    for (const status of ['incorrect', 'correct', 'absent']) {
      const vote = status === 'absent' ? null : status === 'correct' ? 'mensonge' : 'vrai';
      turn = { ...turn, revealed_truth: 'mensonge', result: {
        poser_points: 1, votes: [{ participant_id: '1', vote, status, points: status === 'correct' ? 1 : 0 }],
      } };
      broadcast('vom.state', { vom: { ...baseVom, phase: 'round_result', current_turn: turn } });
      await page.getByRole('heading', { name: locale === 'fr' ? 'Résultat de la manche' : 'Round result', exact: true }).waitFor();
      const titleColors = await page.locator('[class*="wowTitle"]').evaluate((item) => ({
        foreground: getComputedStyle(item).color,
        background: getComputedStyle(item.closest('[class*="resultHeroFeedback"]').parentElement).backgroundColor,
      }));
      assert.ok(contrastRatio(titleColors.foreground, titleColors.background) >= 4.5, `Result title contrast below 4.5: ${JSON.stringify(titleColors)}`);
      assert.equal(await page.locator('[class*="resultListDense"]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Horizontal overflow in results');
      if (role === 'participant') {
        const title = await page.locator('[class*="wowTitle"]').textContent();
        const expectedTitle = status === 'correct'
          ? (locale === 'fr' ? 'Réponse correcte' : 'Correct answer')
          : status === 'incorrect'
            ? (locale === 'fr' ? 'Réponse incorrecte' : 'Incorrect answer')
            : (locale === 'fr' ? 'Hors délai' : 'Time expired');
        assert.ok(title.includes(expectedTitle), `Expected result title "${expectedTitle}", got "${title}"`);
        const correctAnswer = page.locator('[class*="resultCorrectAnswer"]');
        if (status === 'correct') {
          assert.equal(await correctAnswer.count(), 0);
        } else {
          await correctAnswer.waitFor();
          const answerText = await correctAnswer.textContent();
          assert.ok(answerText.includes(locale === 'fr' ? 'Bonne réponse' : 'Correct answer'));
          assert.ok(answerText.includes(locale === 'fr' ? 'Faux' : 'False'), `Expected the revealed answer, got "${answerText}"`);
        }
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
      assert.equal(await page.locator('[class*="resultCorrectAnswer"]').count(), 0);
      turn = { ...turn, statement_id: 'pr_01', statement_text: 'Je préfère Café / Thé / Jus', statement_options: ['Café', 'Thé', 'Jus'], answer_mode: 'choice', revealed_truth: 'Thé',
        result: { poser_points: 1, votes: [{ participant_id: '1', vote: 'Café', status: 'incorrect', points: 0 }] } };
      broadcast('vom.state', { vom: { ...baseVom, phase: 'round_result', current_turn: turn } });
      await page.locator('[class*="resultCorrectAnswer"]').getByText(locale === 'fr' ? 'Thé' : 'Tea', { exact: true }).waitFor();

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
      assert.equal(await page.locator('[class*="resultCorrectAnswer"]').count(), 0);
    }
    assert.ok(await page.getByText('Anne Martin', { exact: true }).count());
    assert.deepEqual(errors, []);
    await close();
  }
  console.log('TEST_VOM_UX_OK');
} finally {
  await browser.close();
}
