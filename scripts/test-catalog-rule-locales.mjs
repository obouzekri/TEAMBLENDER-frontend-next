import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import ar from '../lib/i18n/dictionaries/ar.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const presets = {
  labyrintheRules: ['getLabyrintheRulesPreset', 'LABYRINTHE_RULES_PRESET_KEY', 'labyrintheSignals'],
  vraiOuMensongeRules: ['getVraiOuMensongeRulesPreset', 'VRAI_OU_MENSONGE_RULES_PRESET_KEY', 'pariSurMoi'],
  missionCritiqueRules: ['getMissionCritiqueRulesPreset', 'MISSION_CRITIQUE_RULES_PRESET_KEY', 'missionCritique'],
  escapeRoomRules: ['getEscapeRoomRulesPreset', 'ESCAPE_ROOM_RULES_PRESET_KEY', 'escapeRoom'],
  pixelArchitectRules: ['getPixelArchitectRulesPreset', 'PIXEL_ARCHITECT_RULES_PRESET_KEY', 'pixelArchitect'],
  theQuizRules: ['getTheQuizRulesPreset', 'THE_QUIZ_RULES_PRESET_KEY', 'theQuiz'],
  phraseMystereRules: ['getPhraseMystereRulesPreset', 'PHRASE_MYSTERE_RULES_PRESET_KEY', 'phraseMystere'],
  copuzzleRules: ['getCopuzzleRulesPreset', 'COPUZZLE_RULES_PRESET_KEY', 'copuzzle'],
  labInnovationRules: ['getLabInnovationRulesPreset', 'LAB_INNOVATION_RULES_PRESET_KEY', 'labInnovation'],
};

function loadModule(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  function requireMock(name) {
    if (name === '@/lib/i18n/dictionaries/ar') return { default: ar };
    if (name === './utils') return { stripRulesFromEngineConfig: (config) => { const { rules, ...rest } = config; return rest; } };
    const preset = presets[name.split('/').at(-1)];
    assert.ok(preset, `Unexpected import: ${name}`);
    const [getter, key, dictionaryKey] = preset;
    return {
      [key]: dictionaryKey,
      [getter]: (locale) => ({
        challengeName: `${dictionaryKey}-${locale}`,
        objective: `${dictionaryKey}-${locale}`,
        facilitator: [`${dictionaryKey}-${locale}`],
        participant: [`${dictionaryKey}-${locale}`],
        hints: [`${dictionaryKey}-${locale}`],
      }),
    };
  }
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports);
  return module.exports;
}

const engineRules = {
  pixel_architect_v1: 'pixelArchitect',
  copuzzle_live_v1: 'copuzzle',
  the_quiz_v1: 'theQuiz',
  phrase_collaborative_v1: 'phraseMystere',
  labyrinthe_live_v1: 'labyrintheSignals',
  vrai_ou_mensonge_v1: 'pariSurMoi',
  mission_critique_v1: 'missionCritique',
  lab_d_innovation_v1: 'labInnovation',
};

function checkRules(rules, key) {
  assert.equal(rules.objective.ar, ar.challengeRules[key].objective);
  assert.deepEqual(rules.facilitator.ar, ar.challengeRules[key].facilitator);
  assert.deepEqual(rules.participant.ar.slice(0, ar.challengeRules[key].participant.length), ar.challengeRules[key].participant);
  assert.ok(rules.objective.fr.endsWith('-fr'));
  assert.ok(rules.objective.en.endsWith('-en'));
  if (key === 'phraseMystere') assert.ok(rules.participant.ar.every((line) => !line.includes('{hintBudget}')));
}

const { mockChallenges } = loadModule('lib/mockChallenges.js');
const mockRules = mockChallenges.filter((item) => item.engine_config?.rules);
assert.equal(mockRules.length, 7);
for (const challenge of mockRules) {
  checkRules(challenge.engine_config.rules, engineRules[challenge.engine_key]);
  assert.equal(challenge.engine_config.rules.footnote.ar, '');
}

const { ensureAdminCatalogChallenges } = loadModule('lib/admin/challengeCatalog.js');
const added = ensureAdminCatalogChallenges([]);
const existing = ensureAdminCatalogChallenges(added.map(({ engine_key }) => ({ engine_key })));
for (const list of [added, existing]) {
  assert.equal(list.length, 5);
  for (const challenge of list) {
    checkRules({ objective: challenge.rules_objective, facilitator: challenge.rules_facilitator, participant: challenge.rules_participant }, engineRules[challenge.engine_key]);
    assert.equal(challenge.rules_footnote.ar, '');
  }
}
console.log('TEST_CATALOG_RULE_LOCALES_OK');