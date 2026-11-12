import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { getPricingPlansFallback } from '../lib/pricingFallbackPlans.js';

const require = createRequire(import.meta.url);
const fallbackPlans = getPricingPlansFallback();
const fallbackByCode = Object.fromEntries(fallbackPlans.map((plan) => [plan.plan_code, plan]));

assert.deepEqual(
  fallbackPlans.map((plan) => plan.plan_code),
  ['trial', 'team', 'enterprise'],
);

const backendConfig = new URL('../../backend/src/config/canonical-pricing-plans.js', import.meta.url);
if (existsSync(backendConfig)) {
  const { CANONICAL_PRICING_PLANS } = require(fileURLToPath(backendConfig));
  for (const canonicalPlan of CANONICAL_PRICING_PLANS) {
    const { id, is_fallback, ...fallbackContract } = fallbackByCode[canonicalPlan.plan_code];
    assert.deepEqual(fallbackContract, canonicalPlan, `${canonicalPlan.plan_code} fallback must match backend seed`);
  }
} else {
  console.log('SKIP backend seed comparison: backend repository not available');
}

assert.equal(fallbackByCode.trial.max_users, 20);
assert.equal(fallbackByCode.trial.trial_days, 30);
// Trial: 5 sessions in total over the trial (the backend reads this field as a total for `trial`).
assert.equal(fallbackByCode.trial.max_sessions_per_month, 5);
assert.equal(fallbackByCode.team.name, 'Essentiel');
assert.equal(fallbackByCode.team.max_users, 40);
assert.equal(fallbackByCode.team.max_sessions_per_month, null);
assert.equal(fallbackByCode.team.price_cents, 3900);
assert.equal(fallbackByCode.team.annual_price_cents, 34800);
assert.equal(fallbackByCode.enterprise.name, 'Organisation');
assert.equal(fallbackByCode.enterprise.max_users, 100);
assert.equal(fallbackByCode.enterprise.max_sessions_per_month, null);
assert.equal(fallbackByCode.enterprise.price_cents, 180000);
assert.equal(fallbackPlans.every((plan) => plan.currency === 'EUR'), true);
// Every card opens with "all challenges" and lists the end-of-session summary.
for (const plan of fallbackPlans) {
  for (const locale of ['fr', 'en', 'ar']) {
    const features = plan.localized_content[locale].features;
    assert.equal(features.length >= 5, true, `${plan.plan_code}/${locale} lists the comparison lines`);
  }
  assert.equal(plan.localized_content.fr.features[0], 'Tous les défis');
  assert.equal(plan.localized_content.fr.features.includes('Synthèse à la fin de chaque session'), true);
}
assert.equal(fallbackPlans.every((plan) => ['fr', 'en', 'ar'].every((locale) => plan.localized_content[locale])), true);

console.log('PASS canonical pricing contract');
