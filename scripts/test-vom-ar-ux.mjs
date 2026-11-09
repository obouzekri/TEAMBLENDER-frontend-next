import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const engineKey = 'vrai_ou_mensonge_v1';
process.env.NEXT_PUBLIC_ENABLED_BETA_LOCALES = 'ar';
const { buildVomConfig } = await import('../lib/demo/challenges/vraiOuMensonge.mjs');
const catalog = buildVomConfig('ar').catalog;
const vom = {
  phase: 'selecting_statement',
  participants_order: ['1', '2'],
  participants_meta: [{ participant_id: '1', display_name: 'سارة', slot: 1 }, { participant_id: '2', display_name: 'ليلى', slot: 2 }],
  scores: { '1': 0, '2': 0 },
  catalog,
  current_turn: { poser_id: '1' },
  round_history: [],
};

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const width of [390, 1440]) {
    const { context, broadcast, close } = await createRealtimeFixture(browser, {
      baseUrl, locale: 'ar', role: 'participant', engineKey,
      state: { challengeKey: engineKey, config: {}, vom }, viewport: { width, height: 1000 },
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${baseUrl}/ar/challenges/${engineKey}?sessionId=42`);
      const refuseCookies = page.getByRole('button', { name: 'رفض ملفات تعريف الارتباط للقياس' });
      if (await refuseCookies.count()) await refuseCookies.click();
      const cards = page.locator('[class*="statementGrid"] > button');
      await cards.last().waitFor();
      assert.equal(await cards.count(), 14);
      assert.ok((await cards.allTextContents()).every((text) => /[\u0600-\u06ff]/.test(text)));
      await page.getByRole('button', { name: /القهوة/ }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByText('الشاي', { exact: true }).click();
      const [request] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/socket.io') && req.method() === 'POST' && (req.postData() || '').includes('vom.select_statement')),
        dialog.getByRole('button', { name: 'تأكيد', exact: true }).click(),
      ]);
      assert.match(request.postData(), /الشاي/);
      broadcast('vom.state', { vom: { ...vom, phase: 'voting_open', current_turn: {
        poser_id: '2', statement_id: 'pr_01', statement_text: 'أفضل: الشاي', statement_prompt: 'أفضل',
        statement_options: ['القهوة', 'الشاي', 'العصير'], answer_mode: 'choice', votes: {},
      } } });
      const vote = page.getByRole('button', { name: /الشاي/ });
      await vote.waitFor();
      const [voteRequest] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/socket.io') && req.method() === 'POST' && (req.postData() || '').includes('vom.vote')),
        vote.click(),
      ]);
      assert.match(voteRequest.postData(), /الشاي/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      assert.deepEqual(errors, []);
    } finally {
      await close();
    }
  }
  console.log('TEST_VOM_AR_UX_OK');
} finally {
  await browser.close();
}