import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
const catalog = [
  { id: 101, engine_key: 'mission_critique_v1', name: 'Mission Critique', duration: 15, objectives: 'collaboration', status: 'actif' },
  { id: 102, engine_key: 'labyrinthe_live_v1', name: 'Labyrinthe', duration: 15, objectives: 'collaboration', status: 'actif' },
  { id: 103, engine_key: 'crossword_live_v1', name: 'Mots croisés', duration: 15, objectives: 'collaboration', status: 'actif' },
];
async function setObjectiveSelection(field, objective, selected) {
  if (await field.evaluate((element) => element.tagName === 'SELECT')) {
    await field.selectOption(selected ? objective : '');
    return;
  }
  const checkbox = field.getByLabel(objective === 'collaboration' ? 'Collaboration' : 'Communication');
  if (await checkbox.isChecked() !== selected) await checkbox.click();
}

const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome' });
try {
  for (const locale of ['fr', 'en']) {
    const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 390 : 1440, height: 420 } });
    let savedSession = null;
    await context.addInitScript((language) => {
      sessionStorage.setItem('jwt', 'local-ux-fixture');
      sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: 'user', first_name: 'UX' }));
      localStorage.setItem('tb_locale_preference', language);
    }, locale);
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.includes('/api/')) {
        if (url.origin === new URL(baseUrl).origin) await route.continue();
        else await route.abort();
        return;
      }
      let data = [];
      if (/\/challenges$/.test(url.pathname)) data = catalog;
      if (/\/sessions$/.test(url.pathname) && route.request().method() === 'POST') {
        savedSession = { ...route.request().postDataJSON(), id: 42, assigned_participants: [], challenges: [], code: 'UXTEST' };
        data = savedSession;
      } else if (/\/sessions\/42\/invite$/.test(url.pathname)) {
        data = { ...savedSession, invite_token: 'ux-fixture' };
      } else if (/\/sessions\/42$/.test(url.pathname)) {
        if (route.request().method() === 'PUT') savedSession = { ...savedSession, ...route.request().postDataJSON() };
        data = savedSession;
      }
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${locale}/session-builder`);
    const cookieButton = page.getByRole('button', { name: 'Refuser les cookies de mesure', exact: true });
    await cookieButton.click();
    await page.locator('#session-name').fill('Session planning UX');
    assert.equal(await page.locator('#expected-participants').getAttribute('required'), null);
    const objectiveField = page.locator('#session-objective');
    if (await objectiveField.evaluate((element) => element.tagName === 'SELECT')) {
      assert.equal(await objectiveField.inputValue(), '');
    } else {
      assert.equal(await objectiveField.locator('input[type="checkbox"]:checked').count(), 0);
    }
    await page.locator('#expected-participants').fill('6');
    await setObjectiveSelection(objectiveField, 'collaboration', true);
    await setObjectiveSelection(objectiveField, 'communication', true);
    const participantsDisclosure = page.locator('#create-session-form details');
    await participantsDisclosure.locator('summary').click();
    await page.getByText(
      locale === 'fr' ? /Aucun profil disponible/ : /No profiles available/,
    ).waitFor();
    const participantInstructions = participantsDisclosure.locator('> p').nth(1);
    const participantSearch = participantsDisclosure.getByRole('textbox', {
      name: locale === 'fr' ? 'Rechercher par nom ou email' : 'Search by name or email',
    });
    const instructionsBox = await participantInstructions.boundingBox();
    const searchBox = await participantSearch.boundingBox();
    assert.ok(instructionsBox && searchBox);
    assert.ok(
      searchBox.y - (instructionsBox.y + instructionsBox.height) >= 16,
      'Participant search has clear spacing after the creation guidance',
    );
    assert.equal(
      await page.locator('button[form="create-session-form"]').isDisabled(),
      false,
      'Session creation stays available when no participant profiles exist',
    );
    await page.getByRole('button', { name: locale === 'fr' ? 'Créer la session' : 'Create session', exact: true }).click();
    await page.getByRole('heading', { name: 'Session planning UX', exact: true }).waitFor();
    assert.equal(savedSession.expected_participant_count, 6);
    assert.equal(savedSession.objective, 'communication,collaboration');
    assert.equal(savedSession.participant_ids, undefined);
    await page.getByRole('button', { name: locale === 'fr' ? 'Me proposer un programme' : 'Suggest a program', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: locale === 'fr' ? 'Me proposer un programme' : 'Suggest a program', exact: true });
    const preview = dialog.locator('ol li');
    await preview.first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');
    const lockedScrollY = await page.evaluate(() => window.scrollY);
    await page.mouse.move(5, 5);
    await page.mouse.wheel(0, 500);
    assert.equal(await page.evaluate(() => window.scrollY), lockedScrollY);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await dialog.getByRole('heading', {
      name: locale === 'fr' ? 'Votre programme suggéré' : 'Your suggested program',
    }).waitFor();
    assert.ok(await dialog.getByText('minutes', { exact: true }).count());
    const scrollRegion = dialog.locator(':scope > div').nth(1);
    assert.equal(await scrollRegion.evaluate((element) => getComputedStyle(element).overflowY), 'auto');
    assert.ok(await scrollRegion.evaluate((element) => element.scrollHeight > element.clientHeight));
    const header = dialog.locator(':scope > div').first();
    const headerTop = await header.evaluate((element) => element.getBoundingClientRect().top);
    await scrollRegion.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    assert.equal(await header.evaluate((element) => element.getBoundingClientRect().top), headerTop);
    await dialog.locator('#program-duration').fill('30');
    const generateButton = dialog.getByRole('button', {
      name: locale === 'fr' ? /Créer une proposition|Générer une autre proposition/ : /Create a proposal|Generate another proposal/,
    });
    await generateButton.evaluate((button, loadingText) => {
      button.dataset.loadingSeen = 'false';
      const observer = new MutationObserver(() => {
        if (button.disabled && button.textContent.includes(loadingText)) {
          button.dataset.loadingSeen = 'true';
          button.dataset.proposalPreserved = String(
            button.closest('[role="dialog"]').querySelectorAll('ol li').length > 0,
          );
          observer.disconnect();
        }
      });
      observer.observe(button, { attributes: true, childList: true, subtree: true });
    }, locale === 'fr' ? 'Génération de la proposition' : 'Generating proposal');
    await generateButton.click();
    await dialog.getByRole('button', {
      name: locale === 'fr' ? 'Générer une autre proposition' : 'Generate another proposal',
    }).waitFor();
    assert.equal(await generateButton.getAttribute('data-loading-seen'), 'true');
    assert.equal(await generateButton.getAttribute('data-proposal-preserved'), 'true');
    assert.ok(await preview.count() > 0);
    assert.ok(!(await preview.allTextContents()).some((name) => name.includes('croisés')));
    const initialPreview = await preview.allTextContents();
    const firstReplacementButton = preview.first().getByRole('button');
    assert.match(
      await firstReplacementButton.getAttribute('aria-label'),
      locale === 'fr' ? /^Choisir une alternative à / : /^Choose an alternative to /,
    );
    await firstReplacementButton.click();
    await page.waitForFunction((before) => {
      const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
      const current = [...modal.querySelectorAll('ol li')].map((item) => item.textContent);
      return JSON.stringify(current) !== JSON.stringify(before) || modal.querySelector('[role="alert"]');
    }, initialPreview);
    await dialog.getByRole('button', { name: locale === 'fr' ? 'Utiliser ce programme' : 'Use this program', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
    assert.equal(await page.evaluate(() => window.scrollY), lockedScrollY);
    assert.ok(await page.locator('[data-activity-id]').count() > 0);
    await page.getByRole('button', { name: locale === 'fr' ? 'Modifier les détails de session' : 'Edit session details', exact: true }).click();
    await page.locator('#edit-expected-participants').fill('');
    const editObjectiveField = page.locator('#edit-session-objective');
    await setObjectiveSelection(editObjectiveField, 'collaboration', false);
    await setObjectiveSelection(editObjectiveField, 'communication', false);
    await page.getByRole('dialog').getByRole('button', { name: locale === 'fr' ? 'Sauvegarder' : 'Save', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(savedSession.expected_participant_count, null);
    assert.equal(savedSession.objective, null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`SESSION_PLANNING_UX_OK ${locale}`);
  }
} finally {
  await browser.close();
}
