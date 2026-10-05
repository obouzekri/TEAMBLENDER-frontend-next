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

  const englishChoices = {
    pr_01: ['I prefer:', 'Coffee / Tea / Juice'],
    pr_02: ['I prefer:', 'Mountains / Beach / Forest'],
    pr_03: ['I prefer:', 'City / Countryside'],
    pr_04: ['I prefer:', 'Movies / Going Out'],
    ht_01: ['I go to bed:', 'Late / Early'],
    pe_01: ['I am more:', 'Competitive / Calm / Spontaneous'],
    pa_03: ['I have already lost:', 'Phone / Wallet / Both'],
  };
  for (const [id, [prompt, options]] of Object.entries(englishChoices)) {
    const choices = helpers.getTranslatedStatementChoices({ id }, 'en');
    assert.equal(`${choices.prompt}:`, prompt);
    assert.equal(choices.options.map((option) => helpers.formatChoiceDisplay(option, 'en')).join(' / '), options);
  }

  const englishStatements = {
    ct_01: 'I speak more than three languages',
    ct_02: 'I have a hidden talent',
    ht_02: 'I exercise regularly',
    ht_03: 'I start my day with my phone',
    ht_04: 'I snack between meals',
    pa_01: 'I have forgotten to introduce myself in an important meeting',
    pa_02: 'I have answered "yes" without understanding',
  };
  for (const [id, text] of Object.entries(englishStatements)) {
    assert.equal(helpers.getTranslatedStatementText({ id }, 'en'), text);
    assert.equal(helpers.getTranslatedCurrentQuestion({ statement_id: id }, 'en'), text);
  }
  assert.equal(helpers.formatChoiceDisplay('GOING OUT', 'en'), 'Going Out');
  assert.equal(helpers.formatChoiceDisplay('CAFÉ', 'fr'), 'Café');
  assert.equal(helpers.formatChoiceDisplay('LES DEUX', 'fr'), 'Les Deux');
  assert.equal(helpers.formatChoiceDisplay(null, 'en'), '');
  assert.equal(helpers.formatStatementCategory('PREFERENCES', 'en'), 'Preferences');
  assert.equal(helpers.formatStatementCategory('SKILLS', 'en'), 'Skills');
  assert.equal(helpers.formatStatementCategory('HABITS', 'en'), 'Habits');
  assert.equal(helpers.formatStatementCategory('PERSONALITY', 'en'), 'Personality');
  for (const category of ['Anecdotes', 'Short stories', 'Experiences']) {
    assert.equal(helpers.formatStatementCategory(category, 'en'), 'Experiences');
    assert.equal(helpers.formatStatementCategory(category, 'fr'), 'Expériences');
  }

  for (const locale of ['fr', 'en']) {
    for (const id of ['ct_01', 'ct_02', 'ht_02', 'ht_03', 'ht_04', 'pa_01', 'pa_02']) {
      const statement = { id, text: 'Plain statement.' };
      assert.equal(helpers.getTranslatedStatementChoices(statement, locale), null, `${id}/${locale} must render as plain text`);
      assert.ok(helpers.getTranslatedStatementText(statement, locale));
      assert.ok(!helpers.getTranslatedStatementText(statement, locale).endsWith('.'));
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
