import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { buildFinalRanking, expectedTotalTurns } from '../lib/challenges/vraiOuMensongeUtils.js';

function run() {
  assert.equal(expectedTotalTurns(2), 14);
  assert.equal(expectedTotalTurns(12), 12);
  assert.equal(expectedTotalTurns(3, 30), 30);

  const ranking = buildFinalRanking(
    { p1: 4, p2: 4, p3: 2, p4: 0 },
    ['p1', 'p2', 'p3', 'p4']
  );

  assert.equal(ranking.length, 4);
  assert.equal(ranking[0].rank, 1);
  assert.equal(ranking[1].rank, 1);
  assert.equal(ranking[1].tie, true);
  assert.equal(ranking[2].rank, 3);

  const source = readFileSync(new URL('../components/Challenges/VraiOuMensonge/VraiOuMensongeChallenge.js', import.meta.url), 'utf8');
  const helperStart = source.indexOf('function sanitizeChoiceText');
  const helperEnd = source.indexOf('export default function');
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Statement helpers must be available for regression checks');
  const helpers = createContext({});
  runInContext(source.slice(helperStart, helperEnd), helpers);

  for (const locale of ['fr', 'en']) {
    for (const id of ['ct_01', 'ct_02', 'ht_02', 'ht_03', 'ht_04', 'pa_01', 'pa_02']) {
      const statement = { id, text: 'Plain statement.' };
      assert.equal(helpers.getTranslatedStatementChoices(statement, locale), null, `${id}/${locale} must render as plain text`);
      assert.ok(helpers.getTranslatedStatementText(statement, locale));
      assert.ok(helpers.getTranslatedCurrentQuestion({ statement_id: id, statement_text: statement.text }, locale));
    }
    for (const id of ['pr_01', 'pr_02', 'pr_03', 'pr_04', 'ht_01', 'pa_03', 'pe_01']) {
      const choices = helpers.getTranslatedStatementChoices({ id }, locale);
      assert.ok(choices.prompt);
      assert.ok(Array.isArray(choices.options), `${id}/${locale} must provide an options array`);
      assert.ok(choices.options.map(String).length >= 2);
    }
    assert.equal(helpers.getTranslatedStatementChoices(null, locale), null);
    assert.equal(helpers.getTranslatedStatementChoices({ id: 'custom', text: 'Plain statement.' }, locale), null);
    const customChoices = helpers.getTranslatedStatementChoices({ id: 'custom', text: 'I prefer: Coffee / Tea' }, locale);
    assert.deepEqual(Array.from(customChoices.options), ['Coffee', 'Tea']);
  }

  console.log('TEST_VOM_UTILS_OK');
}

run();
