import assert from 'node:assert/strict';
import {
  getRedirectPath,
  resolveConnectedUserId,
  shouldStoreParticipantTargetSession,
} from '../lib/auth.js';
import { buildAuthHeaders, getStoredAuthToken, setStoredAuthToken } from '../lib/auth-storage.js';

function createStorage(values = {}) {
  return {
    getItem(key) {
      return values[key] || null;
    },
    setItem(key, value) {
      values[key] = value;
    },
    removeItem(key) {
      delete values[key];
    },
  };
}

function run() {
  assert.equal(resolveConnectedUserId({ id: 42 }), '42');
  assert.equal(resolveConnectedUserId({ participant_id: 'abc' }), 'abc');
  assert.equal(resolveConnectedUserId(null), '');

  assert.equal(getRedirectPath('admin', '', ''), '/admin');
  assert.equal(getRedirectPath('manager', '12', 'u1'), '/home?sessionId=12&userId=u1');
  assert.equal(getRedirectPath('participant', '22', ''), '/participant');
  assert.equal(getRedirectPath('participant', '22', '123'), '/participant');
  assert.equal(getRedirectPath('participant', '', '123'), '/participant');
  assert.equal(getRedirectPath('participant', '', ''), '/participant');

  assert.equal(shouldStoreParticipantTargetSession('participant', '15'), '15');
  assert.equal(shouldStoreParticipantTargetSession('manager', '15'), '');

  const legacyLocalStorage = createStorage({ jwt: 'stale-participant-token' });
  const legacySessionStorage = createStorage({ jwt: 'current-manager-token' });
  assert.equal(getStoredAuthToken({ local: legacyLocalStorage, session: legacySessionStorage }), '');
  assert.equal(legacyLocalStorage.getItem('jwt'), null);
  assert.equal(legacySessionStorage.getItem('jwt'), null);

  const managerLocalStorage = createStorage({ jwt: 'manager-token' });
  const participantSessionStorage = createStorage();
  setStoredAuthToken('participant-token', {
    local: managerLocalStorage,
    session: participantSessionStorage,
  }, { persistLocal: false });
  assert.equal(managerLocalStorage.getItem('jwt'), null);
  assert.equal(participantSessionStorage.getItem('jwt'), null);
  assert.deepEqual(buildAuthHeaders({ Authorization: 'Bearer exposed-token', 'X-Test': 'ok' }), {
    'X-Test': 'ok',
  });

  console.log('TEST_AUTH_OK');
}

run();
