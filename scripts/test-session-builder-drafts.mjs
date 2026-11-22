import assert from 'node:assert/strict';

// Minimal Web Storage with a byte quota, to reproduce QuotaExceededError.
function createStorage(quota = Infinity) {
  const map = new Map();
  const size = () => [...map].reduce((sum, [k, v]) => sum + k.length + v.length, 0);
  return {
    get length() { return map.size; },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    removeItem: (key) => { map.delete(key); },
    setItem(key, value) {
      const previous = map.get(key);
      map.set(key, String(value));
      if (size() > quota) {
        if (previous === undefined) map.delete(key); else map.set(key, previous);
        const error = new Error('quota');
        error.name = 'QuotaExceededError';
        throw error;
      }
    },
    _map: map,
  };
}

globalThis.window = {};
globalThis.localStorage = createStorage(20_000);
globalThis.sessionStorage = createStorage();

const { persistDraftToStorage, readDraftFromStorage, stripCatalogOnlyConfig, toDraftChallenge } =
  await import('../lib/session-builder/drafts.js');

const library = { fr: Array.from({ length: 200 }, (_, i) => ({ id: `g${i}`, preview: [{ row: 1, col: 2 }] })) };
const crossword = {
  id: 42,
  engine_key: 'crossword_live_v1',
  description: 'x'.repeat(5000),
  engine_config: { templatesByLocale: library },
  config: { locale: 'fr', gridId: 'g3', templatesByLocale: library, timer: { duration_seconds: 900 } },
};

assert.deepEqual(stripCatalogOnlyConfig(crossword.config), { locale: 'fr', gridId: 'g3', timer: { duration_seconds: 900 } });
assert.deepEqual(toDraftChallenge(crossword), {
  id: 42,
  engine_key: 'crossword_live_v1',
  config: { locale: 'fr', gridId: 'g3', timer: { duration_seconds: 900 } },
});

// Full storage: old drafts and the legacy full copy are dropped instead of crashing the page.
localStorage.setItem('selectedChallenges', 'y'.repeat(8000));
persistDraftToStorage('6', [crossword]);
assert.equal(localStorage.getItem('selectedChallenges'), null);
localStorage.removeItem('sessionBuilderDraft:6');
localStorage.setItem('sessionBuilderDraft:old', 'z'.repeat(19_800));
const savedAt = persistDraftToStorage('7', [crossword]);
assert.ok(savedAt, 'the draft is saved after making room');
assert.equal(localStorage.getItem('sessionBuilderDraft:old'), null);
assert.equal(readDraftFromStorage('7').selectedChallenges[0].config.gridId, 'g3');

// Storage that refuses every write: no exception reaches React.
globalThis.localStorage = createStorage(0);
assert.equal(persistDraftToStorage('8', [crossword]), null);

console.log('session builder drafts: ok');
