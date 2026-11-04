import assert from 'node:assert/strict';
// L'arabe est une langue bêta : sans ce flag, elle retombe sur le français.
process.env.NEXT_PUBLIC_ENABLED_BETA_LOCALES = 'ar';
const { translate } = await import('../lib/i18n/index.js');
const { pluralCategory } = await import('../lib/i18n/plural.js');
const { formatCurrency, formatDate, formatNumber } = await import('../lib/i18n/format.js');
const { resolveLocale } = await import('../lib/i18n/detectLocale.js');

// Pluriels : 2 formes en FR/EN, 6 en arabe (Intl.PluralRules).
assert.equal(translate('fr', 'managerHome.participantsTotal', { count: 1 }), '1 participant au total');
assert.equal(translate('fr', 'managerHome.participantsTotal', { count: 0 }), '0 participant au total');
assert.equal(translate('fr', 'managerHome.participantsTotal', { count: 4 }), '4 participants au total');
assert.equal(translate('en', 'managerHome.participantsTotal', { count: 0 }), '0 participants in total');
assert.deepEqual([0, 1, 2, 3, 11, 100].map((count) => pluralCategory(count, 'ar')), ['zero', 'one', 'two', 'few', 'many', 'other']);
assert.equal(translate('ar', 'managerHome.participantsTotal', { count: 2 }), 'مشاركان إجمالًا');
assert.equal(translate('ar', 'managerHome.participantsTotal', { count: 5 }), '5 مشاركين إجمالًا');
// Forme absente dans une langue : `other`.
assert.equal(translate('ar', 'challengeVom.votesReceived', { count: 1, answered: 1, total: 3 }), 'وصلت 1/3 إجابات');

// Arabe : chiffres occidentaux, pas les chiffres arabes orientaux (٠١٢٣…).
const easternDigits = /[٠-٩۰-۹]/;
assert.doesNotMatch(formatNumber(1234567.5, 'ar'), easternDigits);
assert.match(formatNumber(1234, 'ar'), /1.?234/);
assert.doesNotMatch(formatCurrency(390, 'ar', 'EUR'), easternDigits);
assert.doesNotMatch(formatDate('2026-11-04T10:00:00Z', 'ar'), easternDigits);

// Détection : l'arabe seulement par choix manuel ou Accept-Language ; le pays ne le choisit jamais.
assert.equal(resolveLocale({ acceptLanguage: 'ar-MA,ar;q=0.9,fr;q=0.8' }), 'ar');
assert.equal(resolveLocale({ acceptLanguage: 'fr-FR,fr;q=0.9,ar;q=0.8' }), 'fr');
assert.equal(resolveLocale({ cookie: 'ar', acceptLanguage: 'en-US' }), 'ar');
for (const country of ['MA', 'DZ', 'TN']) assert.equal(resolveLocale({ acceptLanguage: 'de-DE', country }), 'fr');
assert.equal(resolveLocale({ country: 'SA' }), 'en');

console.log('TEST_I18N_PLURAL_OK');
