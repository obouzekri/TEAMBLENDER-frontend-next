import assert from 'node:assert/strict';
import { formatPlanAmount, getAnnualSavings, getPlanAmountDh } from '../lib/pricing-display.mjs';
import { normalizePricingPlanName } from '../lib/pricing-labels.js';
import { getPricingPlansFallback } from '../lib/pricingFallbackPlans.js';

const plans = Object.fromEntries(getPricingPlansFallback().map((plan) => [plan.slug, plan]));
const nbsp = (value) => value.replace(/[  ]/g, ' ');

// Plans without the legacy price_cents field must keep their own name.
assert.deepEqual(
  getPricingPlansFallback().map((plan) => normalizePricingPlanName(plan)),
  ['Free', 'Pay-per-session', 'Pro', 'Pro+'],
);

// Monthly and annual amounts come from the MAD prices billing charges.
assert.equal(getPlanAmountDh(plans.pro, 'monthly'), 390);
assert.equal(getPlanAmountDh(plans.pro, 'annual'), 3744);
assert.equal(getPlanAmountDh(plans['pro+'], 'monthly'), 696);
assert.equal(getPlanAmountDh(plans['pro+'], 'annual'), 6681.6);
assert.equal(getPlanAmountDh(plans.free, 'annual'), 0);
// A single session keeps its price whatever the billing toggle says.
assert.equal(getPlanAmountDh(plans['pay-per-session'], 'annual'), 49);
// Without an annual price, the annual discount is applied to 12 months.
assert.equal(getPlanAmountDh({ price_mad_cents: 10000, annual_price_mad_cents: null }, 'annual'), 960);

// Annual savings: crossed-out amount is 12 monthly payments, not one.
assert.deepEqual(getAnnualSavings(plans.pro, 'annual'), { originalAmountDh: 4680, percentage: 20 });
assert.deepEqual(getAnnualSavings(plans['pro+'], 'annual'), { originalAmountDh: 8352, percentage: 20 });
assert.equal(getAnnualSavings(plans.pro, 'monthly'), null);
assert.equal(getAnnualSavings(plans.free, 'annual'), null);
assert.equal(getAnnualSavings(plans['pay-per-session'], 'annual'), null);

// Display currencies: whole amounts, locale formatting.
assert.equal(nbsp(formatPlanAmount(3744, 'MAD', 'fr')), '3 744 DH');
assert.equal(formatPlanAmount(3744, 'MAD', 'en'), '3,744 DH');
assert.equal(formatPlanAmount(390, 'EUR', 'fr'), '36 €');
assert.equal(formatPlanAmount(3744, 'EUR', 'fr'), '344 €');
assert.equal(formatPlanAmount(3744, 'USD', 'fr'), '374 $');
assert.equal(formatPlanAmount(696, 'USD', 'en'), '$70');
assert.equal(formatPlanAmount(390, 'EUR', 'en'), '€36');
assert.equal(formatPlanAmount(6681.6, 'EUR', 'fr'), '615 €');

console.log('PASS pricing display');
