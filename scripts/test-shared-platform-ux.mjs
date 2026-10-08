import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createRealtimeFixture } from './helpers/realtime-ux-fixture.mjs';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
const engineKey = 'mission_critique_v1';
const timer = { enabled: true, status: 'running', duration_seconds: 1200, remaining_seconds: 1190 };
const state = {
  config: { chat: { enabled: true } }, timer,
  mission: { tasks: [{ id: 't1', label: 'Shared UX task' }], timeline: [], phases: {} },
};

async function assertModalFocus(page, dialog, trigger) {
  await dialog.waitFor();
  assert.ok(await dialog.evaluate((node) => node.contains(document.activeElement)), 'Focus did not move into modal');
  const controls = dialog.locator('button:enabled, input:enabled, select:enabled, textarea:enabled, [href]');
  const first = controls.first();
  const last = controls.last();
  await first.focus();
  await page.keyboard.press('Shift+Tab');
  assert.ok(await last.evaluate((node) => node === document.activeElement), 'Reverse tab escaped');
  await page.keyboard.press('Tab');
  assert.ok(await first.evaluate((node) => node === document.activeElement), 'Tab escaped');
  await trigger.evaluate((node) => node.focus());
  assert.ok(await dialog.evaluate((node) => node.contains(document.activeElement)), 'Programmatic focus escaped');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(await trigger.evaluate((node) => node === document.activeElement), 'Focus not restored');
}

async function waitChatEvent(page, fixture, count) {
  const deadline = Date.now() + 5000;
  while (fixture.receivedEvents.filter((event) => event.type === 'chat.message').length < count && Date.now() < deadline) await page.waitForTimeout(50);
  const messages = fixture.receivedEvents.filter((event) => event.type === 'chat.message');
  assert.equal(messages.length, count);
  return messages[messages.length - 1].payload;
}

try {
  for (const [locale, width, theme] of [['fr', 1440, 'light'], ['fr', 390, 'dark'], ['en', 1440, 'dark'], ['en', 390, 'light']]) {
    const dictionary = locale === 'en' ? en : fr;
    const fixture = await createRealtimeFixture(browser, { baseUrl, locale, role: 'participant', engineKey, state, theme, viewport: { width, height: 1000 } });
    const page = await fixture.context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
    await page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();

    const preparation = page.locator('details').filter({ has: page.getByText(locale === 'en' ? 'Session preparation and progress' : 'Préparation et déroulement de la session', { exact: true }) });
    await preparation.locator('summary').click();
    assert.equal(await preparation.locator('ol li').count(), 6);
    assert.equal(await preparation.locator('li').first().getAttribute('data-stage-status'), 'unknown');
    await preparation.getByText(locale === 'en' ? /Readiness is not reported/ : /La disponibilité n’est pas signalée/).waitFor();

    const rules = page.getByRole('button', { name: dictionary.challengeRulesPanel.showRules, exact: true });
    await rules.click();
    const rulesDialog = page.getByRole('dialog', { name: dictionary.challengeRulesPanel.modalTitle, exact: true });
    const close = rulesDialog.getByRole('button', { name: dictionary.challengeRulesPanel.closeRules, exact: true });
    const closeBounds = await close.boundingBox();
    const triggerBounds = await rules.boundingBox();
    assert.ok(closeBounds.width >= 44 && closeBounds.height >= 44);
    assert.ok(triggerBounds.width >= 44 && triggerBounds.height >= 44);
    await assertModalFocus(page, rulesDialog, rules);

    const announcements = page.locator('[class*="statusAnnouncement"]');
    const before = await announcements.allTextContents();
    fixture.broadcast('timer.tick', { ...timer, remaining_seconds: 1189 });
    await page.waitForTimeout(150);
    assert.deepEqual(await announcements.allTextContents(), before, 'Every second changes an announcement');
    assert.ok(await page.getByRole('timer').count() > 0);
    for (const clock of await page.getByRole('timer').all()) assert.equal(await clock.getAttribute('aria-live'), 'off');
    fixture.broadcast('timer.state', { ...timer, status: 'paused' });
    await announcements.filter({ hasText: dictionary.challengeTimer.paused }).first().waitFor({ state: 'attached' });
    fixture.broadcast('timer.state', timer);

    const chatTrigger = page.getByRole('button', { name: dictionary.chatCard.title, exact: true });
    await chatTrigger.click();
    const chatDialog = page.getByRole('dialog', { name: dictionary.chatCard.sessionTitle, exact: true });
    await assertModalFocus(page, chatDialog, chatTrigger);
    await chatTrigger.click();
    const input = chatDialog.getByRole('textbox');
    const send = chatDialog.getByRole('button', { name: dictionary.chatCard.sendAria, exact: true });
    await input.fill('A message kept until confirmation');
    await send.click();
    const message = await waitChatEvent(page, fixture, 1);
    assert.ok(message.client_msg_id);
    assert.equal(await input.inputValue(), message.text);
    assert.ok(await input.isDisabled());
    await chatDialog.getByText(dictionary.chatCard.sending, { exact: true }).waitFor();
    fixture.broadcast('chat.message', { ...message, client_msg_id: 'not-the-message-id', id: 'other', ts: new Date().toISOString() });
    await page.waitForTimeout(150);
    assert.equal(await input.inputValue(), message.text, 'Unrelated echo cleared draft');
    fixture.broadcast('chat.message', { ...message, id: 'confirmed', ts: new Date().toISOString() });
    await chatDialog.getByText(dictionary.chatCard.confirmed, { exact: true }).waitFor();
    assert.equal(await input.inputValue(), '');
    assert.ok(await input.isEnabled());

    await input.fill('Timeout draft');
    await send.click();
    await waitChatEvent(page, fixture, 2);
    await chatDialog.getByText(dictionary.chatCard.unconfirmed, { exact: true }).waitFor({ timeout: 15000 });
    assert.equal(await input.inputValue(), 'Timeout draft');
    await chatDialog.getByRole('button', { name: dictionary.chatCard.retry, exact: true }).click();
    const retry = await waitChatEvent(page, fixture, 3);
    fixture.broadcast('chat.message', { ...retry, id: 'retry-confirmed' });
    await chatDialog.getByText(dictionary.chatCard.confirmed, { exact: true }).waitFor();
    assert.equal(await input.inputValue(), '');

    await input.fill('Offline draft');
    await send.click();
    await waitChatEvent(page, fixture, 4);
    fixture.setOnline(false);
    await chatDialog.getByText(dictionary.chatCard.offline, { exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'Offline draft', 'Disconnect unmounted challenge or cleared draft');
    assert.ok(await send.isDisabled());
    assert.ok(await input.isEnabled());
    await input.fill('Offline draft edited');
    await chatDialog.getByRole('button', { name: dictionary.chatCard.closeAria, exact: true }).click();
    assert.ok(await page.getByRole('button', { name: 'Shared UX task', exact: false }).isDisabled());
    await rules.click();
    await assertModalFocus(page, rulesDialog, rules);
    fixture.setOnline(true);
    await chatTrigger.click();
    await send.waitFor();
    const deadline = Date.now() + 15000;
    while (await send.isDisabled() && Date.now() < deadline) await page.waitForTimeout(100);
    assert.ok(await send.isEnabled(), 'Did not recover after reconnection');
    assert.equal(await input.inputValue(), 'Offline draft edited');
    await send.click();
    const recovered = await waitChatEvent(page, fixture, 5);
    fixture.broadcast('chat.message', { ...recovered, id: 'reconnected-confirmed' });
    await chatDialog.getByText(dictionary.chatCard.confirmed, { exact: true }).waitFor();
    assert.equal(await input.inputValue(), '');
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await fixture.close();

    const facilitatorFixture = await createRealtimeFixture(browser, {
      baseUrl,
      locale,
      role: 'manager',
      engineKey,
      state,
      theme,
      viewport: { width, height: 1000 },
    });
    try {
      const facilitatorPage = await facilitatorFixture.context.newPage();
      await facilitatorPage.goto(`${baseUrl}/${locale}/challenges/${engineKey}?sessionId=42`);
      await facilitatorPage.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true }).click();

      await facilitatorPage.getByRole('button', { name: dictionary.challengeTimer.pause, exact: true }).click();
      assert.ok(facilitatorFixture.receivedEvents.some((event) => event.type === 'timer.pause'));

      facilitatorFixture.broadcast('timer.state', { ...timer, status: 'paused' });
      await facilitatorPage.getByRole('button', { name: dictionary.challengeTimer.resume, exact: true }).click();
      assert.ok(facilitatorFixture.receivedEvents.some((event) => event.type === 'timer.resume'));
      assert.ok(await facilitatorPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    } finally {
      await facilitatorFixture.close();
    }
  }
  console.log('TEST_SHARED_PLATFORM_UX_OK');
} finally {
  await browser.close();
}
