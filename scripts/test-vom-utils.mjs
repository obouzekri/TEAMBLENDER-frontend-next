import assert from 'node:assert/strict';
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

  console.log('TEST_VOM_UTILS_OK');
}

run();
