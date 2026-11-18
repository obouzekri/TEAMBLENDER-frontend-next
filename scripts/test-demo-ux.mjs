import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const screenshotDir = process.env.DEMO_SCREENSHOT_DIR || '';
// The programme comes pre-filled; the visitor plays every challenge as a fifth participant.
const PROGRAM_ENGINES = ['copuzzle_live_v1', 'labyrinthe_live_v1', 'pixel_architect_v1'];

const COPY = {
  fr: {
    notice: 'Démo simulée',
    createFromDashboard: 'Créer une session',
    automatic: 'Automatique',
    program: 'Programme',
    create: 'Créer la session',
    launch: 'Lancer la session',
    connected: 'Connecté',
    next: /^(Challenge suivant|Terminer le programme)$/,
    pause: 'Mettre en pause',
    resume: 'Reprendre',
    you: 'Vous',
    viewFacilitator: 'Facilitateur',
    viewParticipant: 'Participant · Vous',
    viewSplit: 'Côte à côte',
    results: 'Le bilan de la session',
    participation: '5 sur 5 participants',
    signup: 'Créer mon compte',
  },
  en: {
    notice: 'Simulated demo',
    createFromDashboard: 'Create session',
    automatic: 'Automatic',
    program: 'Programme',
    create: 'Create the session',
    launch: 'Launch the session',
    connected: 'Connected',
    next: /^(Next challenge|End the programme)$/,
    pause: 'Pause',
    resume: 'Resume',
    you: 'You',
    viewFacilitator: 'Facilitator',
    viewParticipant: 'Participant · You',
    viewSplit: 'Side by side',
    results: 'Session results',
    participation: '5 of 5 participants',
    signup: 'Create my account',
  },
};

async function snap(page, name) {
  if (!screenshotDir) return;
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

// End-of-challenge announcements (e.g. the Labyrinthe victory) are closed like a facilitator would.
async function closeChallengeDialogs(page) {
  const close = page.getByRole('button', { name: /^(Fermer|Close)$/ });
  if (await close.count()) await close.first().click().catch(() => {});
}

// The announcement can appear just after the demo's next button, so close it and retry.
async function clickPastAnnouncements(page, button) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await closeChallengeDialogs(page);
    try {
      await button.click({ timeout: 2000 });
      return;
    } catch {
      await page.waitForTimeout(500);
    }
  }
  await button.click();
}

async function runDemo(browser, locale, viewport, { flowMode }) {
  const copy = COPY[locale];
  const page = await browser.newPage({ viewport });
  const errors = [];
  const networkCalls = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/\/api\/|socket\.io/.test(request.url())) networkCalls.push(request.url());
  });

  await page.goto(`${baseUrl}/${locale}/demo`, { waitUntil: 'networkidle' });
  await page.getByText(copy.notice, { exact: true }).waitFor();
  const refuseCookies = page.getByRole('button', { name: /Refuser les cookies|Refuse|Decline/ });
  if (await refuseCookies.count()) await refuseCookies.first().click();
  const tag = `${locale}-${viewport.width}`;

  // Manager space, then preparation: the programme is already composed.
  assert.equal(await page.getByText('@example.com').count(), 4);
  assert.equal(await page.locator('.manager-home .stat-card').count(), 3);
  assert.equal(await page.locator('.manager-home .session-card').count(), 2);
  const create = page.getByRole('button', { name: copy.create, exact: true });
  // On a dev server the first click can land before hydration: click again until the step changes.
  for (let attempt = 0; attempt < 5 && !(await create.count()); attempt += 1) {
    await page.getByRole('button', { name: copy.createFromDashboard, exact: true }).click();
    await create.waitFor({ timeout: 6000 }).catch(() => {});
  }
  await create.waitFor();
  await page.locator('[data-catalog]').waitFor();
  assert.equal(await page.locator('[data-activity-id]').count(), PROGRAM_ENGINES.length, 'The programme comes pre-filled');
  assert.equal(await create.isDisabled(), false);
  if (flowMode === 'auto') await page.getByRole('button', { name: copy.automatic, exact: true }).click();
  await snap(page, `${tag}-1-prepare`);
  await create.click();

  // Invite: the four colleagues connect, then the visitor.
  const launch = page.getByRole('button', { name: copy.launch });
  await launch.waitFor();
  assert.equal(await launch.isDisabled(), true, 'Launch waits for participants');
  await page.waitForFunction((label) => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes(label));
    return button && !button.disabled;
  }, copy.launch, { timeout: 10000 });
  assert.equal(await page.getByText(copy.connected, { exact: true }).count(), 5);
  await snap(page, `${tag}-2-invite`);
  await launch.click();

  // Facilitate: one game, seen from the facilitator screen and the visitor's participant screen.
  const wide = viewport.width >= 1100;
  const viewButton = (name) => page.getByRole('button', { name, exact: true });
  await viewButton(copy.viewFacilitator).waitFor({ timeout: 20000 });
  assert.equal(await viewButton(copy.viewSplit).count(), wide ? 1 : 0, 'Side by side only on wide screens');
  assert.equal(await viewButton(wide ? copy.viewSplit : copy.viewFacilitator).getAttribute('aria-pressed'), 'true');
  const results = page.getByRole('heading', { level: 2, name: copy.results, exact: true });
  const facilitator = page.locator('[data-demo-role="manager"][data-demo-challenge]');
  const participant = page.locator('[data-demo-role="participant"][data-demo-challenge]');
  const played = [];
  let placed = 0;
  let seenOnFacilitator = false;
  while (!(await results.count())) {
    await facilitator.waitFor({ state: 'attached', timeout: 20000 });
    const engine = await facilitator.getAttribute('data-demo-challenge');
    played.push(engine);
    assert.equal(await page.getByRole('list', { name: copy.program }).locator('li').count(), PROGRAM_ENGINES.length);
    if (!wide) await viewButton(copy.viewFacilitator).click();
    assert.equal(await facilitator.isVisible(), true);
    assert.equal(await participant.isVisible(), wide, 'The participant screen sits next to the facilitator only on wide screens');
    if (flowMode !== 'auto') {
      await facilitator.getByRole('button', { name: /Démarrer|Start/ }).first().click({ timeout: 15000 });
    }
    if (played.length === 1 && flowMode === 'manual') {
      await snap(page, `${tag}-3-facilitate-${engine}`);
      const timer = facilitator.getByRole('timer').filter({ visible: true }).first();
      await facilitator.getByRole('button', { name: copy.pause }).filter({ visible: true }).first().click();
      await facilitator.getByRole('button', { name: copy.resume }).filter({ visible: true }).first().waitFor();
      const pausedAt = await timer.textContent();
      await page.waitForTimeout(1200);
      assert.equal(await timer.textContent(), pausedAt, 'The paused timer must not move');
      await facilitator.getByRole('button', { name: copy.resume }).filter({ visible: true }).first().click();
    }
    if (!wide) {
      await viewButton(copy.viewParticipant).click();
      assert.equal(await participant.isVisible(), true);
      assert.equal(await facilitator.isVisible(), false);
      if (played.length === 1) await snap(page, `${tag}-3-participant-${engine}`);
    }

    // Pixel Architect: the visitor builds on their own screen and the facilitator sees the cubes.
    if (engine === 'pixel_architect_v1') {
      const freeTarget = participant.locator('button[class*="layerQuickCellTarget"]:not([class*="layerQuickCellPlaced"]):not([disabled])');
      for (let loop = 0; loop < 200 && placed < 4; loop += 1) {
        if (await freeTarget.count()) {
          await freeTarget.first().click({ timeout: 2000 }).then(() => { placed += 1; }).catch(() => {});
          if (placed === 1) await snap(page, `${tag}-4-play`);
        }
        await page.waitForTimeout(300);
      }
      assert.ok(placed >= 1, 'The visitor places cubes');
      if (wide) {
        await page.waitForTimeout(600);
        seenOnFacilitator = (await facilitator.getByText(copy.you, { exact: true }).count()) > 0;
      }
    }

    if (flowMode === 'auto') {
      // Automatic sequencing moves on by itself once the debrief countdown ends.
      await page.waitForFunction(({ current, heading }) => {
        const title = [...document.querySelectorAll('h2')].some((node) => node.textContent.trim() === heading);
        const stageNode = document.querySelector('[data-demo-role="manager"][data-demo-challenge]');
        return title || (stageNode && stageNode.getAttribute('data-demo-challenge') !== current);
      }, { current: engine, heading: copy.results }, { timeout: 180000 });
      await closeChallengeDialogs(page);
    } else {
      // The button only reads "next" once the debrief is reached.
      const next = page.getByRole('button', { name: copy.next });
      await next.waitFor({ timeout: 180000 });
      await clickPastAnnouncements(page, next);
    }
  }
  assert.deepEqual(played, PROGRAM_ENGINES, 'Every programme challenge was played in order');
  if (wide) assert.ok(seenOnFacilitator, 'The facilitator screen names the visitor among the builders');

  // Results: real completions and the visitor's score.
  await results.waitFor();
  await page.getByText(copy.participation, { exact: true }).waitFor();
  assert.ok(await page.getByText(/^[1-9]\d* cube\(s\)$/).count(), 'The visitor contribution is shown');
  await snap(page, `${tag}-4-results`);
  assert.equal(await page.getByRole('link', { name: copy.signup }).getAttribute('href'), `/${locale}/signup`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `Horizontal overflow of ${overflow}px on ${tag}`);
  assert.deepEqual(networkCalls, [], 'The demo must not call the API or the realtime server');
  assert.deepEqual(errors.filter((message) => !/posthog|gtag|analytics|Failed to load resource|WebGL/i.test(message)), []);
  await page.close();
}

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  await runDemo(browser, 'fr', { width: 1440, height: 1000 }, { flowMode: 'manual' });
  await runDemo(browser, 'en', { width: 390, height: 844 }, { flowMode: 'auto' });
} finally {
  await browser.close();
}
console.log('TEST_DEMO_UX_OK');
