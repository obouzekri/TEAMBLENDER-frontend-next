import assert from 'node:assert/strict';
import { buildRecoveryUrl, readRecoveries, readPersonalLink, saveRecovery, removeRecovery } from '../lib/participant-recovery.js';

function store() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const api = { local: store(), session: store() };
const recovery = { deviceToken: 'a'.repeat(64), linkToken: 'b'.repeat(64), expiresAt: '2099-01-01T00:00:00.000Z' };
saveRecovery({ sessionId: 12, user: { name: 'Alex Martin' }, recovery }, api);
assert.equal(readRecoveries(api)[0].participantName, 'Alex Martin');
assert.equal(readRecoveries({ local: api.local, session: store() })[0].deviceToken, recovery.deviceToken);
assert.equal(readPersonalLink(12, api).linkToken, recovery.linkToken);
assert.ok(!api.local.getItem('tb_participant_recoveries').includes(recovery.linkToken));
assert.equal(readRecoveries(api, Date.parse('2100-01-01')).length, 0);
assert.equal(new URL(buildRecoveryUrl(recovery.linkToken, 'https://example.test', 'en')).pathname, '/en/resume');
assert.equal(new URL(buildRecoveryUrl(recovery.linkToken, 'https://example.test')).search, '');
assert.throws(() => buildRecoveryUrl('bad', 'https://example.test'));
removeRecovery(12, api);
assert.equal(readRecoveries(api).length, 0);
assert.equal(readPersonalLink(12, api), null);
api.local.setItem('tb_participant_recoveries', '{bad');
assert.throws(() => readRecoveries(api));
console.log('PARTICIPANT_RECOVERY_UNIT_OK');
