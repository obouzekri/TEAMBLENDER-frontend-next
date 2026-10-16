import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'vrai_ou_mensonge_v1';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });

try {
  for (const locale of ['fr', 'en']) {
    for (const theme of ['light', 'dark']) {
      const vom = {
        phase: 'voting_open',
        participants_order: ['1', '2', '3'],
        participants_meta: [
          { participant_id: '1', first_name: 'Alex', last_name: 'Martin' },
          { participant_id: '2', first_name: 'Sophie', last_name: 'Hidaya' },
          { participant_id: '3', first_name: 'Camille', last_name: 'Dupont' },
        ],
        scores: { '1': 0, '2': 0, '3': 0 },
        catalog: [],
        phase_started_at_ms: Date.now(),
        phase_deadline_ms: Date.now() + 300_000,
        current_turn: {
          poser_id: '2',
          statement_id: 'ct_02',
          statement_text: 'J’ai un talent caché.',
          answer_mode: 'boolean',
          votes: {},
        },
        round_history: [],
      };
      const fixture = await createRealtimeFixture(browser, {
        baseUrl, locale, role: 'participant', engineKey, theme,
        state: { challengeKey: engineKey, config: {}, vom },
      });
      try {
        const page = await fixture.context.newPage();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
        await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();
        const card = page.locator('[class*="votingCard"]');
        await card.getByRole('heading', { name: 'Sophie Hidaya', exact: true }).waitFor();

        for (const width of [320, 390, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 });
          const geometry = await card.evaluate((element) => {
            const bounds = (selector) => element.querySelector(selector).getBoundingClientRect().toJSON();
            const target = element.querySelector('[class*="voteTargetCard"]');
            const question = element.querySelector('[class*="voteQuestionBlock"]');
            return {
              card: element.getBoundingClientRect().toJSON(),
              avatar: bounds('[class*="voteTargetAvatar"]'),
              name: bounds('[class*="voteTargetName"]'),
              question: question.getBoundingClientRect().toJSON(),
              targetBorder: getComputedStyle(target).borderTopWidth,
              targetShadow: getComputedStyle(target).boxShadow,
              questionBorder: getComputedStyle(question).borderTopWidth,
              buttons: [...element.querySelectorAll('button')].map((button) => button.getBoundingClientRect().toJSON()),
            };
          });
          const label = `${locale}/${theme}/${width}`;
          assert.ok(geometry.avatar.right <= geometry.name.x, `Avatar must precede name: ${label}`);
          assert.ok(Math.abs(geometry.avatar.y + geometry.avatar.height / 2 - geometry.name.y - geometry.name.height / 2) <= 1, `Identity alignment: ${label}`);
          assert.ok(geometry.avatar.width <= 44, `Compact avatar: ${label}`);
          assert.ok(geometry.card.height <= (width < 768 ? 330 : 260), `Compact voting card (${geometry.card.height}px): ${label}`);
          assert.equal(geometry.targetBorder, '0px', `No nested border: ${label}`);
          assert.equal(geometry.targetShadow, 'none', `No nested shadow: ${label}`);
          assert.equal(geometry.questionBorder, '0px', `No question frame: ${label}`);
          assert.ok(geometry.question.width >= geometry.card.width - 36, `Full-width question: ${label}`);
          assert.equal(geometry.buttons.length, 2);
          for (const button of geometry.buttons) {
            assert.ok(button.height >= 48 && button.height <= 64, `Compact touch target (${button.height}px): ${label}`);
            assert.ok(button.x >= geometry.card.x && button.right <= geometry.card.right, `Button containment: ${label}`);
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow: ${label}`);
          const banner = await page.locator('[class*="roleBanner"]').boundingBox();
          assert.ok(banner.height <= 90, `Instruction banner must not stretch: ${label}`);
        }

        const vote = card.getByRole('button', { name: /Vrai|True/ });
        await vote.focus();
        await page.keyboard.press('Enter');
        await expect.poll(() => fixture.receivedEvents.filter((event) => event.type === 'vom.vote').map((event) => event.payload.vote)).toContain('vrai');
        fixture.broadcast('vom.state', { vom: { ...vom, current_turn: { ...vom.current_turn, votes: { '1': 'vrai' } } } });
        await card.locator('[class*="voteActive"]').waitFor();
        await expect(card.locator('[class*="voteActive"]')).toContainText('✓');

        await page.setViewportSize({ width: 320, height: 900 });
        fixture.broadcast('vom.state', { vom: {
          ...vom,
          participants_meta: vom.participants_meta.map((participant) => participant.participant_id === '2'
            ? { ...participant, first_name: 'Sophie-Alexandrine', last_name: 'De La Roche-Hidaya' }
            : participant),
          current_turn: {
            ...vom.current_turn, statement_id: 'custom-choice', answer_mode: 'choice',
            statement_text: 'Une affirmation avec un texte volontairement long pour verifier le retour a la ligne sur les petits ecrans.',
            statement_options: ['Une option avec un libelle assez long', 'Une autre option', 'UnTroisiemeChoixSansEspacesTresLongPourVerifierLeRepliSurMobile'],
          },
        } });
        await card.getByRole('heading', { name: 'Sophie-Alexandrine De La Roche-Hidaya', exact: true }).waitFor();
        const choices = card.locator('[class*="voteActions"] button');
        await expect(choices).toHaveCount(3);
        for (const choice of await choices.all()) {
          assert.ok(await choice.evaluate((button) => button.getBoundingClientRect().height >= 48));
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Long content overflow: ${locale}/${theme}`);
        await choices.first().click();
        await expect.poll(() => fixture.receivedEvents.filter((event) => event.type === 'vom.vote').map((event) => event.payload.vote)).toContain('Une option avec un libelle assez long');
        assert.deepEqual(errors, []);
        console.log(`VOM_VOTING_LAYOUT_OK ${locale}/${theme}: 320-1920px, keyboard vote, long names and choices`);
      } finally {
        await fixture.close();
      }
    }
  }
} finally {
  await browser.close();
}
