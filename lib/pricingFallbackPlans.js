export const FALLBACK_PRICING_PLANS = Object.freeze([
  {
    id: 'fallback-free',
    name: 'Free',
    slug: 'free',
    billing_cycle: 'monthly',
    currency: 'MAD',
    price_mad_cents: 0,
    annual_price_mad_cents: 0,
    display_order: 1,
    features: [],
    is_fallback: true,
  },
  {
    id: 'fallback-session',
    name: 'Pay per session',
    slug: 'pay-per-session',
    billing_cycle: 'one_time',
    currency: 'MAD',
    price_mad_cents: 4900,
    annual_price_mad_cents: null,
    display_order: 2,
    features: [],
    is_fallback: true,
  },
  {
    id: 'fallback-pro',
    name: 'Pro',
    slug: 'pro',
    billing_cycle: 'monthly',
    currency: 'MAD',
    price_mad_cents: 39000,
    annual_price_mad_cents: 374400,
    display_order: 3,
    features: [],
    is_fallback: true,
  },
  {
    id: 'fallback-pro-plus',
    name: 'Pro +',
    slug: 'pro+',
    billing_cycle: 'monthly',
    currency: 'MAD',
    price_mad_cents: 69000,
    annual_price_mad_cents: 662400,
    display_order: 4,
    features: [],
    is_fallback: true,
  },
]);

export function getPricingPlansFallback() {
  return FALLBACK_PRICING_PLANS.map((plan) => ({ ...plan }));
}
