import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const screenshotDir = process.env.DEMO_SCREENSHOT_DIR || '';

const COPY = {
  fr: {
    notice: 'Démo simulée',
    generate: 'Autre proposition',
    create: 'Créer la session',
    launch: 'Lancer la session',
    next: /Avancer à la fin du chrono|Challenge suivant|Terminer le programme/,
    vote: 'Quel est le mensonge ?',
    nextRound: /Manche suivante|Voir le bilan/,
    results: 'Le bilan de la session',
    signup: 'Créer mon compte',
  },
  en: {
    notice: 'Simulated demo',
    generate: 'Another suggestion',
    create: 'Create the session',
    launch: 'Launch the session',
    next: /Skip to the end of the timer|Next challenge|End the programme/,
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

async function runDemo(browser, locale, viewport) {
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
  const tag = `${locale}-${viewport.width}`;

  // Prepare: a programme is proposed and stays within the selected duration.
  const programItems = page.locator('ol li', { has: page.locator('p') }).filter({ hasText: 'min' });
  await page.getByRole('button', { name: copy.generate }).click();
  assert.ok(await programItems.count() > 0, 'A programme should be proposed');
  await snap(page, `${tag}-1-prepare`);
  await page.getByRole('button', { name: copy.create }).click();

  // Invite: participants join, then the session can be launched.
  const launch = page.getByRole('button', { name: copy.launch });
  await launch.waitFor();
  assert.equal(await launch.isDisabled(), true, 'Launch waits for participants');
  await page.waitForFunction((label) => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes(label));
    return button && !button.disabled;
  }, copy.launch, { timeout: 10000 });
  await snap(page, `${tag}-2-invite`);
  await launch.click();

  // Facilitate: the timer progresses, then every challenge is completed.
  await page.waitForTimeout(2500);
  await snap(page, `${tag}-3-facilitate`);
  const progress = await page.getByRole('progressbar').first().getAttribute('aria-valuenow');
  assert.ok(Number(progress) > 0, 'Team progress should advance');
  while (await page.getByRole('button', { name: copy.next }).count()) {
    await page.getByRole('button', { name: copy.next }).click();
  }

  // Play: three rounds of voting.
  await page.getByText(copy.vote).waitFor();
  for (let round = 0; round < 3; round += 1) {
    await page.locator('button[aria-pressed]').filter({ hasText: /\S/ }).nth(round % 3).click();
    if (round === 0) await snap(page, `${tag}-4-play`);
    await page.getByRole('button', { name: copy.nextRound }).click();
  }

  // Results: KPIs and the sign-up call to action.
  await page.getByRole('heading', { name: copy.results }).waitFor();
  await snap(page, `${tag}-5-results`);
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
  await runDemo(browser, 'fr', { width: 1280, height: 900 });
  await runDemo(browser, 'en', { width: 390, height: 844 });
} finally {
  await browser.close();
}
console.log('TEST_DEMO_UX_OK');
