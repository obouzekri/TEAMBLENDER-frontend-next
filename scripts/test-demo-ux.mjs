import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const screenshotDir = process.env.DEMO_SCREENSHOT_DIR || '';
const DEMO_ENGINES = ['copuzzle_live_v1', 'labyrinthe_live_v1', 'pixel_architect_v1', 'vrai_ou_mensonge_v1'];

const COPY = {
  fr: {
    notice: 'Démo simulée',
    createFromDashboard: 'Créer une session',
    automatic: 'Automatique',
    create: 'Créer la session',
    launch: 'Lancer la session',
    connected: 'Connecté',
    next: /^(Challenge suivant|Terminer le programme)$/,
    pause: 'Mettre en pause',
    resume: 'Reprendre',
    playHeading: 'Aperçu côté participant',
    confirm: 'Confirmer',
    seeResults: 'Voir le bilan',
    results: 'Le bilan de la session',
    participation: '4 sur 4 participants',
    signup: 'Créer mon compte',
  },
  en: {
    notice: 'Simulated demo',
    createFromDashboard: 'Create a session',
    automatic: 'Automatic',
    create: 'Create the session',
    launch: 'Launch the session',
    connected: 'Connected',
    next: /^(Next challenge|End the programme)$/,
    pause: 'Pause',
    resume: 'Resume',
    playHeading: 'Participant preview',
    confirm: 'Confirm',
    seeResults: 'See the results',
    results: 'Session results',
    participation: '4 of 4 participants',
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

  // Manager space, then preparation: the default programme runs the four demo challenges.
  assert.equal(await page.getByText('@example.com').count(), 4);
  await page.getByRole('button', { name: copy.createFromDashboard, exact: true }).click();
  await page.getByRole('button', { name: copy.create, exact: true }).waitFor();
  if (flowMode === 'auto') await page.getByRole('button', { name: copy.automatic, exact: true }).click();
  await snap(page, `${tag}-1-prepare`);
  await page.getByRole('button', { name: copy.create, exact: true }).click();

  // Invite: the four participants connect before the launch.
  const launch = page.getByRole('button', { name: copy.launch });
  await launch.waitFor();
  assert.equal(await launch.isDisabled(), true, 'Launch waits for participants');
  await page.waitForFunction((label) => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes(label));
    return button && !button.disabled;
  }, copy.launch, { timeout: 10000 });
  assert.equal(await page.getByText(copy.connected, { exact: true }).count(), 4);
  await launch.click();

  // Facilitate: each real challenge starts from its rules card and ends on its own debrief.
  const played = [];
  const playHeading = page.getByRole('heading', { level: 2, name: copy.playHeading, exact: true });
  while (!(await playHeading.count())) {
    const stage = page.locator('[data-demo-challenge]');
    await stage.waitFor({ timeout: 20000 });
    const engine = await stage.getAttribute('data-demo-challenge');
    played.push(engine);
    await stage.getByRole('button', { name: /Démarrer|Start/ }).first().click({ timeout: 15000 });
    if (played.length === 1) {
      await snap(page, `${tag}-2-facilitate-${engine}`);
      if (flowMode === 'manual' && engine !== 'vrai_ou_mensonge_v1') {
        const timer = stage.getByRole('timer').filter({ visible: true }).first();
        await stage.getByRole('button', { name: copy.pause }).filter({ visible: true }).first().click();
        await stage.getByRole('button', { name: copy.resume }).filter({ visible: true }).first().waitFor();
        const pausedAt = await timer.textContent();
        await page.waitForTimeout(1200);
        assert.equal(await timer.textContent(), pausedAt, 'The paused timer must not move');
        await stage.getByRole('button', { name: copy.resume }).filter({ visible: true }).first().click();
      }
    }
    if (flowMode === 'auto') {
      // Automatic sequencing moves on by itself once the debrief countdown ends.
      await page.waitForFunction(({ current, heading }) => {
        const title = [...document.querySelectorAll('h2')].some((node) => node.textContent.trim() === heading);
        const stageNode = document.querySelector('[data-demo-challenge]');
        return title || (stageNode && stageNode.getAttribute('data-demo-challenge') !== current);
      }, { current: engine, heading: copy.playHeading }, { timeout: 120000 });
      await closeChallengeDialogs(page);
    } else {
      const next = page.getByRole('button', { name: copy.next });
      await next.waitFor({ timeout: 120000 });
      await clickPastAnnouncements(page, next);
    }
  }
  assert.deepEqual([...played].sort(), DEMO_ENGINES, 'All four demo challenges were played');

  // Participant preview: the visitor plays Pari sur moi in the real participant interface.
  const stage = page.locator('[data-demo-challenge="vrai_ou_mensonge_v1"]');
  await stage.waitFor({ timeout: 20000 });
  let posed = 0;
  let voted = 0;
  const seeResults = page.getByRole('button', { name: copy.seeResults });
  for (let loop = 0; loop < 400 && !(await seeResults.count()); loop += 1) {
    const dialog = page.getByRole('dialog');
    const statement = stage.locator('button[class*="statementBtn"]:not([disabled])');
    const votes = stage.locator('[class*="voteActions"] button:not([disabled])');
    if (await dialog.getByRole('button', { name: copy.confirm }).count()) {
      await dialog.locator('input[type="radio"]').first().check();
      await dialog.getByRole('button', { name: copy.confirm }).click();
      posed += 1;
    } else if (await statement.count()) {
      await statement.first().click();
    } else if (await votes.count()) {
      if (!voted) await snap(page, `${tag}-3-play`);
      await votes.first().click();
      voted += 1;
    }
    await page.waitForTimeout(400);
  }
  assert.equal(posed, 1, 'The visitor poses one statement');
  assert.ok(voted >= 3, 'The visitor votes on the other players');
  await seeResults.click();

  // Results: real completions and the visitor's score.
  await page.getByRole('heading', { name: copy.results }).waitFor();
  await page.getByText(copy.participation, { exact: true }).waitFor();
  assert.ok(await page.getByText(/\d+ pt\(s\)/).count(), 'The visitor score is shown');
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
