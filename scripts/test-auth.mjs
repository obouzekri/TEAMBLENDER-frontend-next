import assert from 'node:assert/strict';
import {
  getRedirectPath,
  resolveConnectedUserId,
  sanitizeJwtFromStorage,
  shouldStoreParticipantTargetSession,
} from '../lib/auth.js';
import { getStoredAuthToken, setStoredAuthToken } from '../lib/auth-storage.js';

function createStorage(values = {}) {
  return {
    getItem(key) {
      return values[key] || null;
    },
    setItem(key, value) {
      values[key] = value;
    },
  };
}

function run() {
  assert.equal(resolveConnectedUserId({ id: 42 }), '42');
  assert.equal(resolveConnectedUserId({ participant_id: 'abc' }), 'abc');
  assert.equal(resolveConnectedUserId(null), '');

  assert.equal(getRedirectPath('admin', '', ''), '/admin');
  assert.equal(getRedirectPath('manager', '12', 'u1'), '/home?sessionId=12&userId=u1');
  assert.equal(getRedirectPath('participant', '22', ''), '/participant?sessionId=22');

  assert.equal(shouldStoreParticipantTargetSession('participant', '15'), '15');
  assert.equal(shouldStoreParticipantTargetSession('manager', '15'), '');

  assert.equal(sanitizeJwtFromStorage(' stale-local-token ', 'current-session-token'), 'current-session-token');
  assert.equal(sanitizeJwtFromStorage('', ' session-token '), 'session-token');
  assert.equal(sanitizeJwtFromStorage(' local-token ', ''), 'local-token');
  assert.equal(sanitizeJwtFromStorage('', ''), '');

  assert.equal(getStoredAuthToken({
    local: createStorage({ jwt: 'stale-participant-token' }),
    session: createStorage({ jwt: 'current-manager-token' }),
  }), 'current-manager-token');

  const managerLocalStorage = createStorage({ jwt: 'manager-token' });
  const participantSessionStorage = createStorage();
  setStoredAuthToken('participant-token', {
    local: managerLocalStorage,
    session: participantSessionStorage,
  }, { persistLocal: false });
  assert.equal(managerLocalStorage.getItem('jwt'), 'manager-token');
  assert.equal(participantSessionStorage.getItem('jwt'), 'participant-token');

  console.log('TEST_AUTH_OK');
}

run();
