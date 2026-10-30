import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const screenshotDir = process.env.DEMO_SCREENSHOT_DIR || '';

const COPY = {
  fr: {
    notice: 'Démo simulée',
    createFromDashboard: 'Créer une session',
    automatic: 'Automatique',
    replace: 'Remplacer',
    create: 'Créer la session',
    launch: 'Lancer la session',
    connected: 'Connecté',
    pause: 'Mettre en pause',
    resume: 'Reprendre',
    paused: 'En pause',
    offline: 'Déconnecté',
    fastForward: 'Avancer à la fin du chrono',
    next: /Challenge suivant|Terminer le programme/,
    vote: 'Quel est le mensonge ?',
    nextRound: /Manche suivante|Voir le bilan/,
    results: 'Le bilan de la session',
    signup: 'Créer mon compte',
  },
  en: {
    notice: 'Simulated demo',
    createFromDashboard: 'Create a session',
    automatic: 'Automatic',
    replace: 'Replace',
    create: 'Create the session',
    launch: 'Launch the session',
    connected: 'Connected',
    pause: 'Pause',
    resume: 'Resume',
    paused: 'Paused',
    offline: 'Disconnected',
    fastForward: 'Skip to the end of the timer',
    next: /Next challenge|End the programme/,
    vote: 'Which one is the lie?',
    nextRound: /Next round|See the results/,
    results: 'Session results',
    signup: 'Create my account',
  },
};

async function snap(page, name) {
  if (!screenshotDir) return;
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

async function runDemo(browser, locale, viewport, { flowMode }) {
  const copy = COPY[locale];
  const page = await browser.newPage({ viewport });
  const errors = [];
  const apiCalls = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/\/api\/(sessions|participants|challenges)/.test(request.url())) apiCalls.push(request.url());
  });

  await page.goto(`${baseUrl}/${locale}/demo`, { waitUntil: 'networkidle' });
  await page.getByText(copy.notice, { exact: true }).waitFor();
  const refuseCookies = page.getByRole('button', { name: /Refuser les cookies|Refuse|Decline/ });
  if (await refuseCookies.count()) await refuseCookies.first().click();
  const tag = `${locale}-${viewport.width}`;

  // Manager space: the team of four is listed before any session exists.
  assert.equal(await page.getByText('@example.com').count(), 4);
  await snap(page, `${tag}-1-dashboard`);
  await page.getByRole('button', { name: copy.createFromDashboard, exact: true }).click();

  // Prepare: a programme is proposed for four participants and can be adjusted.
  const replaceButtons = page.getByRole('button', { name: copy.replace, exact: true });
  await replaceButtons.first().waitFor();
  assert.ok(await replaceButtons.count() > 1, 'A multi-challenge programme should be proposed for 4 participants');
  if (flowMode === 'auto') {
    await page.getByRole('button', { name: copy.automatic, exact: true }).click();
    await replaceButtons.first().click();
  }
  await snap(page, `${tag}-2-prepare`);
  await page.getByRole('button', { name: copy.create, exact: true }).click();

  // Invite: the four participants connect, then the session can be launched.
  const launch = page.getByRole('button', { name: copy.launch });
  await launch.waitFor();
  assert.equal(await launch.isDisabled(), true, 'Launch waits for participants');
  await page.waitForFunction((label) => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes(label));
    return button && !button.disabled;
  }, copy.launch, { timeout: 10000 });
  assert.equal(await page.getByText(copy.connected, { exact: true }).count(), 4);
  await snap(page, `${tag}-3-invite`);
  await launch.click();

  // Facilitate: the timer runs, can be paused, and a participant briefly disconnects.
  await page.getByText(copy.offline, { exact: true }).waitFor({ timeout: 10000 });
  await snap(page, `${tag}-4-facilitate`);
  if (flowMode === 'manual') {
    await page.getByRole('button', { name: copy.pause, exact: true }).click();
    await page.getByText(copy.paused, { exact: true }).waitFor();
    const before = await page.getByRole('progressbar').first().getAttribute('aria-valuenow');
    await page.waitForTimeout(1000);
    assert.equal(await page.getByRole('progressbar').first().getAttribute('aria-valuenow'), before, 'Paused timer must not move');
    await page.getByRole('button', { name: copy.resume, exact: true }).click();
    while (await page.getByRole('button', { name: copy.fastForward }).count()) {
      await page.getByRole('button', { name: copy.fastForward }).click();
      await page.getByRole('button', { name: copy.next }).click();
    }
  } else {
    // Automatic sequencing advances on its own after each challenge.
    while (!(await page.getByText(copy.vote).count())) {
      const fastForward = page.getByRole('button', { name: copy.fastForward });
      if (await fastForward.count()) await fastForward.click();
      await page.waitForTimeout(500);
    }
  }

  // Participant preview: three rounds of voting.
  await page.getByText(copy.vote).waitFor({ timeout: 30000 });
  for (let round = 0; round < 3; round += 1) {
    await page.locator('button[aria-pressed]').filter({ hasText: /\S/ }).nth(round % 3).click();
    if (round === 0) await snap(page, `${tag}-5-play`);
    await page.getByRole('button', { name: copy.nextRound }).click();
  }

  // Results: KPIs and the sign-up call to action.
  await page.getByRole('heading', { name: copy.results }).waitFor();
  assert.ok(await page.getByText('100 %').count(), 'All four participants took part');
  await snap(page, `${tag}-6-results`);
  const signup = page.getByRole('link', { name: copy.signup });
  assert.equal(await signup.getAttribute('href'), `/${locale}/signup`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `Horizontal overflow of ${overflow}px on ${tag}`);
  assert.deepEqual(apiCalls, [], 'The demo must not call session or challenge APIs');
  assert.deepEqual(errors.filter((message) => !/posthog|gtag|analytics|Failed to load resource/i.test(message)), []);
  await page.close();
}

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  await runDemo(browser, 'fr', { width: 1280, height: 900 }, { flowMode: 'manual' });
  await runDemo(browser, 'en', { width: 390, height: 844 }, { flowMode: 'auto' });
} finally {
  await browser.close();
}
console.log('TEST_DEMO_UX_OK');
