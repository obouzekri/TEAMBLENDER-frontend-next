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
assert.equal(fallbackByCode.team.max_users, 25);
assert.equal(fallbackByCode.team.price_cents, 3900);
assert.equal(fallbackByCode.team.annual_price_cents, 34800);
assert.equal(fallbackByCode.enterprise.max_users, 100);
assert.equal(fallbackByCode.enterprise.price_cents, 180000);
assert.equal(fallbackPlans.every((plan) => plan.currency === 'EUR'), true);
assert.equal(fallbackPlans.every((plan) => plan.max_sessions_per_month === null), true);
assert.equal(fallbackPlans.every((plan) => ['fr', 'en', 'ar'].every((locale) => plan.localized_content[locale])), true);

console.log('PASS canonical pricing contract');
