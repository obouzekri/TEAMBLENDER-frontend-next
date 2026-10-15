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
  for (const { locale, theme } of ['fr', 'en'].flatMap((locale) =>
    ['light', 'dark', 'system'].map((theme) => ({ locale, theme })),
  )) {
    const viewport = { width: locale === 'fr' ? 390 : 1440, height: 420 };
    const context = await browser.newContext({ viewport, colorScheme: theme === 'light' ? 'light' : 'dark' });
    let savedSession = null;
    await context.addInitScript(({ language, theme }) => {
      sessionStorage.setItem('jwt', 'local-ux-fixture');
      sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: 'user', first_name: 'UX' }));
      localStorage.setItem('tb_locale_preference', language);
      localStorage.setItem('tb_theme', theme);
    }, { language: locale, theme });
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
    const choiceTitle = locale === 'fr' ? 'Choix des challenges' : 'Challenge selection';
    assert.equal(await page.getByRole('region', { name: choiceTitle, exact: true }).count(), 0);
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
    const preparationTitle = locale === 'fr' ? 'Préparation et déroulement de la session' : 'Session preparation and progress';
    const preparation = page.getByRole('region', { name: preparationTitle, exact: true });
    const preparationSteps = preparation.locator('li[data-stage-status]');
    assert.equal(await preparationSteps.count(), 3);
    assert.deepEqual(
      await preparationSteps.evaluateAll((items) => items.map((item) => item.dataset.stageStatus)),
      ['active', 'waiting', 'waiting'],
    );
    assert.equal(await preparationSteps.nth(0).getAttribute('aria-current'), 'step');
    const choice = page.getByRole('region', { name: choiceTitle, exact: true });
    await choice.getByRole('heading', { name: choiceTitle, exact: true }).waitFor();
    const manualSelection = choice.getByRole('link', {
      name: locale === 'fr' ? 'Sélection manuelle' : 'Manual selection', exact: true,
    });
    const guidedProgram = choice.getByRole('button', {
      name: locale === 'fr' ? 'Programme guidé' : 'Guided program', exact: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 420 });
      const manualBox = await manualSelection.boundingBox();
      const guidedBox = await guidedProgram.boundingBox();
      const preparationBoxes = await Promise.all(
        (await preparationSteps.all()).map((step) => step.boundingBox()),
      );
      assert.ok(manualBox && guidedBox);
      assert.ok(preparationBoxes.every(Boolean));
      if (width <= 760) {
        assert.equal(preparationBoxes[0].x, preparationBoxes[1].x);
        assert.ok(preparationBoxes[1].y >= preparationBoxes[0].y + preparationBoxes[0].height);
        assert.ok(preparationBoxes[2].y >= preparationBoxes[1].y + preparationBoxes[1].height);
      } else {
        assert.equal(preparationBoxes[0].y, preparationBoxes[1].y);
        assert.equal(preparationBoxes[1].y, preparationBoxes[2].y);
        assert.ok(preparationBoxes[1].x >= preparationBoxes[0].x + preparationBoxes[0].width);
        assert.ok(preparationBoxes[2].x >= preparationBoxes[1].x + preparationBoxes[1].width);
      }
      assert.ok(manualBox.height >= 44 && guidedBox.height >= 44);
      if (width <= 640) {
        assert.equal(manualBox.x, guidedBox.x);
        assert.ok(guidedBox.y >= manualBox.y + manualBox.height + 15);
      } else {
        assert.equal(manualBox.y, guidedBox.y);
        assert.ok(guidedBox.x >= manualBox.x + manualBox.width + 15);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize(viewport);
    await manualSelection.focus();
    await manualSelection.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'challenge-catalog');
    assert.equal(await page.locator('[data-activity-id]').count(), 0);
    await guidedProgram.focus();
    await guidedProgram.press('Enter');
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
    assert.deepEqual(
      await preparationSteps.evaluateAll((items) => items.map((item) => item.dataset.stageStatus)),
      ['done', 'active', 'ready'],
    );
    assert.equal(await preparationSteps.nth(1).getAttribute('aria-current'), 'step');
    const appliedSelection = await page.locator('[data-activity-id]').allTextContents();
    await manualSelection.click();
    assert.deepEqual(await page.locator('[data-activity-id]').allTextContents(), appliedSelection);
    await guidedProgram.click();
    await dialog.waitFor();
    await dialog.getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.deepEqual(await page.locator('[data-activity-id]').allTextContents(), appliedSelection);
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
    console.log(`SESSION_PLANNING_UX_OK ${locale} ${theme}`);
  }
} finally {
  await browser.close();
}
