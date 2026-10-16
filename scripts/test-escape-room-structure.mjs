import assert from 'node:assert/strict';
import { resolveEscapeRoomTitle } from '../lib/challenges/escapeRoomTitle.mjs';
import { proposeSessionProgram } from '../lib/sessionProgram.mjs';

for (const fallback of ['Salle secrète', 'Secret Room']) {
  for (const original of [undefined, '', '  ', 'Salle secrète', 'Salle secrete', 'Secret Room']) {
    assert.equal(resolveEscapeRoomTitle(original, fallback), fallback);
  }
  assert.equal(resolveEscapeRoomTitle('Salle Secrète II', fallback), 'Salle Secrète II');
  assert.equal(resolveEscapeRoomTitle('  Custom room  ', fallback), 'Custom room');
}

const draft = {
  id: 2, name: 'Salle Secrète II', engine_key: 'escape_room_v1',
  status: 'brouillon', duration: '20 min', objectives: 'collaboration',
};
const original = { ...draft, id: 1, name: 'Salle secrète', status: 'actif' };
assert.deepEqual(proposeSessionProgram([draft], { targetMinutes: 30 }).challenges, []);
assert.deepEqual(proposeSessionProgram([draft, original], { targetMinutes: 30 }).challenges, [original]);

console.log('TEST_ESCAPE_ROOM_STRUCTURE_OK');
