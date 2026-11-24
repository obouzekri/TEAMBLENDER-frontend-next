import assert from 'node:assert/strict';
import { getPricingPlansFallback } from '../lib/pricingFallbackPlans.js';
import {
  getPricingPlanContent,
  getPricingPlanPriceLabel,
  getReadablePlanFeatures,
} from '../lib/pricing-plan-content.js';
import { buildLocalizedContentFromDraft, localizedContentToDraft } from '../lib/admin/pricingContentDraft.js';

const LOCALES = ['fr', 'en', 'ar'];

// 1. Canonical plans render exactly as before the shared helper (copy fully defined in localized_content).
function legacyContent(plan, locale) {
  return plan?.localized_content?.[locale] || plan?.localized_content?.fr || {};
}
function legacyPrice(content, billing) {
  const isAnnual = billing === 'annual';
  const configured = isAnnual ? content.price_annual_label : content.price_monthly_label;
  return configured || content.price_label;
}
for (const plan of getPricingPlansFallback()) {
  for (const locale of LOCALES) {
    const before = legacyContent(plan, locale);
    const after = getPricingPlanContent(plan, locale);
    for (const field of ['name', 'description', 'badge', 'cta_label', 'price_secondary_label', 'price_prefix_label']) {
      assert.equal(after[field] || '', before[field] || '', `${plan.plan_code}/${locale}/${field}`);
    }
    assert.deepEqual(after.features, before.features, `${plan.plan_code}/${locale}/features`);
    for (const billing of ['monthly', 'annual']) {
      assert.equal(getPricingPlanPriceLabel(plan, after, billing, locale), legacyPrice(before, billing), `${plan.plan_code}/${locale}/${billing}`);
    }
  }
}

// 2. A plan created from the admin without translations shows its base copy.
const adminPlan = {
  name: 'Starter',
  description: 'Pour une petite équipe.',
  features: ['Tableau de bord', 'all_challenges', ' '],
  cta_label: 'Choisir',
  price_cents: 1900,
  annual_price_cents: 18000,
  currency: 'EUR',
  localized_content: {},
};
const adminContent = getPricingPlanContent(adminPlan, 'en');
assert.equal(adminContent.name, 'Starter');
assert.equal(adminContent.description, 'Pour une petite équipe.');
assert.deepEqual(adminContent.features, ['Tableau de bord']);
assert.equal(adminContent.cta_label, 'Choisir');
assert.match(getPricingPlanPriceLabel(adminPlan, adminContent, 'monthly', 'fr'), /^19\s€$/u);
assert.match(getPricingPlanPriceLabel(adminPlan, adminContent, 'annual', 'fr'), /^180\s€$/u);
assert.equal(getPricingPlanPriceLabel(adminPlan, adminContent, 'monthly', 'en'), '€19');
assert.deepEqual(getReadablePlanFeatures({ features: ['all_challenges', 'email', 'Live'] }), ['email', 'Live']);

// 3. Partial translation: missing fields fall back to the base columns, filled ones win.
const partial = getPricingPlanContent({ ...adminPlan, localized_content: { en: { name: 'Starter EN', price_label: '€19/mo' } } }, 'en');
assert.equal(partial.name, 'Starter EN');
assert.equal(partial.description, 'Pour une petite équipe.');
assert.equal(getPricingPlanPriceLabel(adminPlan, partial, 'annual', 'en'), '€19/mo');

// 4. Admin draft round trip keeps every canonical entry intact, including unknown keys.
for (const plan of getPricingPlansFallback()) {
  const source = { ...plan.localized_content, fr: { ...plan.localized_content.fr, legacy_key: 'kept' } };
  const draft = localizedContentToDraft(source);
  assert.deepEqual(buildLocalizedContentFromDraft(draft), source, `${plan.plan_code} round trip`);
}

// 5. Admin edits: cleared fields are removed, empty locales dropped, features split per line.
const draft = localizedContentToDraft({ fr: { name: 'Essai', price_label: '0 €', features: ['A'] } });
draft.localized.fr.price_label = '  ';
draft.localized.fr.features = 'A\n\n B ';
draft.localized.en = { name: '', features: '' };
draft.localized.ar = { name: ' تجربة ' };
assert.deepEqual(buildLocalizedContentFromDraft(draft), {
  fr: { name: 'Essai', features: ['A', 'B'] },
  ar: { name: 'تجربة' },
});
assert.deepEqual(buildLocalizedContentFromDraft({ localized: {}, localized_original: {} }), {});
assert.deepEqual(localizedContentToDraft(null), { localized: {}, localized_original: {} });

console.log('PASS pricing plan content');
