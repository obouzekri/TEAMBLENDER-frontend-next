import assert from 'node:assert/strict';
import { getAvailableEngines } from '../lib/challenges/runtime.js';

function run() {
  const engines = getAvailableEngines();
  assert.ok(Array.isArray(engines));
  assert.ok(engines.length >= 5, 'Expected at least 5 challenge engines');

  const keys = engines.map((engine) => engine.key);
  assert.ok(keys.includes('phrase_collaborative_v1'));
  assert.ok(keys.includes('the_quiz_v1'));
  assert.ok(keys.includes('pixel_architect_v1'));

  console.log('TEST_RUNTIME_DISPATCHER_OK');
}

run();
