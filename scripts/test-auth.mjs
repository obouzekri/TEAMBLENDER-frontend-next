import assert from 'node:assert/strict';
import {
  getRedirectPath,
  resolveConnectedUserId,
  sanitizeJwtFromStorage,
  shouldStoreParticipantTargetSession,
} from '../lib/auth.js';

function run() {
  assert.equal(resolveConnectedUserId({ id: 42 }), '42');
  assert.equal(resolveConnectedUserId({ participant_id: 'abc' }), 'abc');
  assert.equal(resolveConnectedUserId(null), '');

  assert.equal(getRedirectPath('admin', '', ''), '/admin');
  assert.equal(getRedirectPath('manager', '12', 'u1'), '/home?sessionId=12&userId=u1');
  assert.equal(getRedirectPath('participant', '22', ''), '/participant?sessionId=22');

  assert.equal(shouldStoreParticipantTargetSession('participant', '15'), '15');
  assert.equal(shouldStoreParticipantTargetSession('manager', '15'), '');

  assert.equal(sanitizeJwtFromStorage(' local-token ', 'session-token'), 'local-token');
  assert.equal(sanitizeJwtFromStorage('', ' session-token '), 'session-token');
  assert.equal(sanitizeJwtFromStorage('', ''), '');

  console.log('TEST_AUTH_OK');
}

run();
