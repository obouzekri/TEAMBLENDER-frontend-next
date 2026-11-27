// Comportement de sauvegarde du Session Builder (app/session-builder/SessionBuilder.js), API simulée.
// Chaque requête envoyée à l'API est enregistrée et comparée à ce qui est attendu : autosave,
// brouillon local, rechargement, lancement et erreurs. Ce test fige le comportement actuel : un
// échec après une modification du builder signale un changement de comportement à vérifier.
//
// Lancement : frontend sur le port 3100 (npm run dev ou next start), Chrome disponible.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { dismissCookieBanner } from './helpers/cookie-banner.mjs';

const baseUrl = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3100';
// Délai de l'autosave dans SessionBuilder.js : 1 200 ms. On attend nettement plus.
const AFTER_AUTOSAVE_MS = 2500;

const activities = [
  { id: 101, name: 'Alpha', category: 'Collaboration', objectives: 'cohesion', duration: 10, description: 'A.' },
  { id: 102, name: 'Beta', category: 'icebreaker', objectives: 'cohesion', duration: 15, description: 'B.' },
  { id: 103, name: 'Gamma', category: 'icebreaker', objectives: 'cohesion', duration: 20, description: 'C.' },
];

function buildSession(overrides = {}) {
  return {
    id: 42,
    name: 'Persistence session',
    status: 'preparee',
    challenges: [activities[0], activities[1]],
    assigned_participants: [],
    code: 'PERSIST',
    invite_token: 'persist-fixture',
    // Timestamps Sequelize par défaut du modèle Session : camelCase.
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.SMOKE_BROWSER_CHANNEL || 'chrome',
});

// Ouvre le builder sur la session 42 et enregistre les requêtes API.
// draft : brouillon local déposé avant le chargement. failWrites : les PUT répondent 500.
// sessionDelayMs : la lecture de la session répond en retard (le catalogue, lui, arrive tout de suite).
async function openBuilder({ session, draft = null, failWrites = false, sessionDelayMs = 0 }) {
  const context = await browser.newContext({ locale: 'fr', viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((initialDraft) => {
    sessionStorage.setItem('jwt', 'local-persistence-fixture');
    sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, role: 'manager', first_name: 'UX' }));
    localStorage.setItem('tb_locale_preference', 'fr');
    // Le brouillon n'est déposé qu'au premier chargement, pas à chaque navigation.
    if (initialDraft && !sessionStorage.getItem('persistenceDraftSeeded')) {
      localStorage.setItem('sessionBuilderDraft:42', JSON.stringify(initialDraft));
      sessionStorage.setItem('persistenceDraftSeeded', '1');
    }
  }, draft);

  const requests = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.includes('/api/')) {
      const method = request.method();
      const path = url.pathname.replace(/^.*\/api/, '');
      let body = null;
      try {
        body = request.postDataJSON();
      } catch {
        body = request.postData();
      }
      requests.push({ method, path, body });
      if (failWrites && method === 'PUT') {
        await route.fulfill({ status: 500, json: { error: 'Panne simulée' } });
        return;
      }
      if (sessionDelayMs && method === 'GET' && path.startsWith('/sessions/42')) {
        await new Promise((resolve) => setTimeout(resolve, sessionDelayMs));
      }
      let data = [];
      if (path === '/challenges') data = activities;
      else if (path.startsWith('/sessions/42')) data = session;
      await route.fulfill({ json: data });
    } else if (url.pathname.startsWith('/session-live/')) {
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>live</title><p>live</p>' });
    } else if (url.origin === new URL(baseUrl).origin) {
      await route.continue();
    } else {
      await route.abort();
    }
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/fr/session-builder?sessionId=42`);
  await dismissCookieBanner(page);
  await page.locator('[data-catalog]').getByRole('heading', { name: 'Gamma', exact: true }).waitFor();
  // Sans retard, on attend que la session soit chargée et sa sélection restaurée.
  if (!sessionDelayMs) await page.getByRole('heading', { name: session.name, exact: true }).waitFor();

  const writes = () => requests.filter((item) => item.method !== 'GET').map(({ method, path, body }) => ({ method, path, body }));
  const count = (method, path) => requests.filter((item) => item.method === method && item.path === path).length;
  const selection = () =>
    page
      .locator('ul [data-activity-id]')
      .evaluateAll((items) => items.map((item) => Number(item.dataset.activityId)));
  const storedDraft = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('sessionBuilderDraft:42');
      return raw ? JSON.parse(raw).selectedChallenges.map((item) => item.id) : null;
    });
  const toggle = async (name, label) => {
    const card = page
      .locator('[data-catalog]')
      .locator('[class*="cardHeader"]')
      .locator('..')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    await card.getByRole('button', { name: label, exact: true }).click();
  };
  return { context, page, errors, requests, writes, count, selection, storedDraft, toggle };
}

// Les écritures sans le contenu des configs, normalisées par le builder (sections vides ajoutées).
function writeSummary(writes) {
  return writes.map(({ method, path, body }) => (path.endsWith('/config') ? `${method} ${path}` : { method, path, body }));
}

async function check(name, run) {
  console.log(`Checking ${name}`);
  await run();
}

try {
  await check('chargement : aucune écriture, session lue deux fois', async () => {
    const builder = await openBuilder({ session: buildSession() });
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), [101, 102]);
    assert.deepEqual(builder.writes(), [], 'le chargement ne doit rien enregistrer');
    // Chargement de la sélection + détails de la session.
    assert.equal(builder.count('GET', '/sessions/42'), 2);
    assert.equal(builder.count('GET', '/challenges'), 1);
    assert.deepEqual(await builder.storedDraft(), [101, 102]);
    assert.deepEqual(builder.errors, []);
    await builder.context.close();
  });

  await check('autosave : deux changements rapprochés, un seul PUT avec la sélection finale', async () => {
    const builder = await openBuilder({ session: buildSession() });
    await builder.toggle('Gamma', 'Ajouter');
    await builder.page.waitForTimeout(300);
    await builder.toggle('Alpha', 'Retirer');
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), [102, 103]);
    assert.deepEqual(builder.writes(), [
      { method: 'PUT', path: '/sessions/42', body: { challenge_ids: [102, 103], active_challenge_id: 102 } },
    ]);
    // Rien de plus tant que la sélection ne change pas.
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.equal(builder.writes().length, 1);
    assert.deepEqual(await builder.storedDraft(), [102, 103]);
    assert.deepEqual(builder.errors, []);
    await builder.context.close();
  });

  await check('autosave : revenir à la sélection déjà enregistrée ne renvoie rien', async () => {
    const builder = await openBuilder({ session: buildSession() });
    await builder.toggle('Gamma', 'Ajouter');
    await builder.page.waitForTimeout(300);
    await builder.toggle('Gamma', 'Retirer');
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), [101, 102]);
    assert.deepEqual(builder.writes(), []);
    await builder.context.close();
  });

  await check('autosave : un ajout fait avant la fin du chargement n’écrase pas la session', async () => {
    const builder = await openBuilder({ session: buildSession(), sessionDelayMs: 3000 });
    // Le catalogue est affiché, la session pas encore : l'animateur ajoute déjà un défi.
    await builder.toggle('Gamma', 'Ajouter');
    await builder.page.getByRole('heading', { name: 'Persistence session', exact: true }).waitFor();
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(
      builder.writes(),
      [],
      'rien ne doit partir avant la fin du chargement : la sélection du serveur serait écrasée'
    );
    // La sélection du serveur remplace l'ajout fait trop tôt.
    assert.deepEqual(await builder.selection(), [101, 102]);
    assert.deepEqual(builder.errors, []);
    await builder.context.close();
  });

  await check('autosave : désactivé pour une session déjà lancée', async () => {
    const builder = await openBuilder({ session: buildSession({ status: 'en_cours' }) });
    await builder.toggle('Gamma', 'Ajouter');
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(builder.writes(), [], 'une session en cours ne doit pas être modifiée en arrière-plan');
    await builder.context.close();
  });

  await check('autosave : un échec est retenté au changement suivant', async () => {
    const builder = await openBuilder({ session: buildSession(), failWrites: true });
    await builder.toggle('Gamma', 'Ajouter');
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    await builder.toggle('Alpha', 'Retirer');
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(
      builder.writes().map((item) => item.body.challenge_ids),
      [[101, 102, 103], [102, 103]]
    );
    // Le brouillon local garde la sélection malgré l'échec.
    assert.deepEqual(await builder.storedDraft(), [102, 103]);
    assert.deepEqual(builder.errors, []);
    await builder.context.close();
  });

  await check('rechargement : la session qui a des défis l’emporte sur un brouillon plus récent', async () => {
    const builder = await openBuilder({
      session: buildSession(),
      draft: { updatedAt: '2026-11-26T10:00:00.000Z', selectedChallenges: [{ id: 103 }] },
    });
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), [101, 102]);
    assert.deepEqual(builder.writes(), []);
    assert.deepEqual(await builder.storedDraft(), [101, 102]);
    await builder.context.close();
  });

  await check('rechargement : session vide, le brouillon plus récent est repris puis enregistré', async () => {
    const builder = await openBuilder({
      session: buildSession({ challenges: [] }),
      draft: { updatedAt: '2026-11-26T10:00:00.000Z', selectedChallenges: [{ id: 103 }, { id: 101 }] },
    });
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), [103, 101]);
    assert.deepEqual(builder.writes(), [
      { method: 'PUT', path: '/sessions/42', body: { challenge_ids: [103, 101], active_challenge_id: 103 } },
    ]);
    await builder.context.close();
  });

  await check('rechargement : session vide, un brouillon plus ancien est ignoré', async () => {
    const builder = await openBuilder({
      session: buildSession({ challenges: [] }),
      draft: { updatedAt: '2026-11-01T10:00:00.000Z', selectedChallenges: [{ id: 103 }] },
    });
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), []);
    assert.deepEqual(builder.writes(), []);
    await builder.context.close();
  });

  await check('rechargement de la page : la sélection enregistrée revient, sans écriture', async () => {
    const session = buildSession();
    const builder = await openBuilder({ session });
    await builder.toggle('Gamma', 'Ajouter');
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.equal(builder.writes().length, 1);
    // Le serveur renvoie désormais la sélection enregistrée.
    session.challenges = [activities[0], activities[1], activities[2]];
    session.updatedAt = '2026-11-27T10:00:00.000Z';
    builder.requests.length = 0;
    await builder.page.reload();
    await builder.page.locator('[data-activity-id="103"]').waitFor();
    await builder.page.waitForTimeout(AFTER_AUTOSAVE_MS);
    assert.deepEqual(await builder.selection(), [101, 102, 103]);
    assert.deepEqual(builder.writes(), []);
    await builder.context.close();
  });

  await check('sauvegarde manuelle : PUT, relecture, config de chaque défi, sans changer le statut', async () => {
    const config = { timer: { duration_seconds: 600 } };
    const builder = await openBuilder({ session: buildSession({ challenges: [{ ...activities[0], config }, activities[1]] }) });
    await builder.page.getByRole('button', { name: 'Sauvegarder la configuration', exact: true }).click();
    await builder.page.getByText('Configuration sauvegardée.', { exact: true }).waitFor();
    // Un PATCH par défi : la config normalisée n'est jamais vide.
    assert.deepEqual(writeSummary(builder.writes()), [
      { method: 'PUT', path: '/sessions/42', body: { challenge_ids: [101, 102], active_challenge_id: 101 } },
      'PATCH /sessions/42/challenges/101/config',
      'PATCH /sessions/42/challenges/102/config',
    ]);
    assert.deepEqual(builder.writes()[1].body.config.timer, config.timer);
    await builder.context.close();
  });

  await check('lancement : une seule séquence, même avec un double clic, puis la page live', async () => {
    const config = { timer: { duration_seconds: 600 } };
    const builder = await openBuilder({ session: buildSession({ challenges: [{ ...activities[0], config }, activities[1]] }) });
    await builder.page
      .getByRole('region', { name: 'Préparer votre session' })
      .getByRole('button', { name: 'Lancer la session' })
      .click();
    const dialog = builder.page.getByRole('dialog', { name: 'Confirmer le lancement' });
    await dialog.waitFor();
    const confirm = dialog.getByRole('button', { name: 'Confirmer', exact: true });
    await Promise.all([
      builder.page.waitForURL(/\/session-live\/42$/),
      confirm.dblclick(),
    ]);
    assert.deepEqual(writeSummary(builder.writes()), [
      { method: 'PUT', path: '/sessions/42', body: { challenge_ids: [101, 102], active_challenge_id: 101 } },
      'PATCH /sessions/42/challenges/101/config',
      'PATCH /sessions/42/challenges/102/config',
      {
        method: 'PUT',
        path: '/sessions/42',
        body: { challenge_ids: [101, 102], active_challenge_id: 101, status: 'en_cours', locale: 'fr' },
      },
    ]);
    assert.deepEqual(builder.writes()[1].body.config.timer, config.timer);
    // Entre l'enregistrement et le passage en cours, la session est relue une fois.
    const launchReads = builder.requests.slice(builder.requests.findIndex((item) => item.method === 'PUT'));
    assert.equal(launchReads.filter((item) => item.method === 'GET' && item.path === '/sessions/42').length, 1);
    assert.deepEqual(builder.errors, []);
    await builder.context.close();
  });

  console.log('TEST_SESSION_BUILDER_PERSISTENCE_OK');
} catch (error) {
  console.error('TEST_SESSION_BUILDER_PERSISTENCE_FAIL');
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
