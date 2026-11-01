// Pricing page amounts: everything is derived from the plan's MAD prices (the
// amounts billing actually charges), then converted for display only.

export const PRICING_CURRENCY_OPTIONS = [
  { code: 'MAD', label: 'DH', rate: 1 },
  { code: 'EUR', label: '€', rate: 0.092 },
  { code: 'USD', label: '$', rate: 0.1 },
];

const DEFAULT_ANNUAL_DISCOUNT = 20;

export function isAnnualBilling(selectedBilling) {
  return selectedBilling === 'annual' || selectedBilling === 'yearly';
}

function isOneTimePlan(plan) {
  return String(plan?.billing_cycle || '').trim().toLowerCase() === 'one_time';
}

export function getPlanMonthlyAmountDh(plan) {
  const cents = plan?.price_mad_cents == null ? NaN : Number(plan.price_mad_cents);
  if (Number.isFinite(cents) && cents >= 0) return cents / 100;

  const slug = String(plan?.slug || '').toLowerCase();
  if (slug.includes('free')) return 0;
  if (slug.includes('session')) return 49;
  if (slug.includes('pro+') || slug.includes('pro-plus')) return 696;
  if (slug.includes('pro')) return 390;
  return Math.max(0, Number(plan?.price_cents || 0) / 100);
}

export function getPlanAmountDh(plan, selectedBilling) {
  const monthly = getPlanMonthlyAmountDh(plan);
  if (!isAnnualBilling(selectedBilling) || isOneTimePlan(plan)) return monthly;

  const annualCents = plan?.annual_price_mad_cents == null ? NaN : Number(plan.annual_price_mad_cents);
  if (Number.isFinite(annualCents) && annualCents >= 0) return annualCents / 100;

  const discount = Number(plan?.annual_discount_percentage) || DEFAULT_ANNUAL_DISCOUNT;
  return monthly * 12 * (1 - discount / 100);
}

// Annual savings compared with paying the monthly price 12 times.
export function getAnnualSavings(plan, selectedBilling) {
  if (!isAnnualBilling(selectedBilling) || isOneTimePlan(plan)) return null;
  const fullYearDh = getPlanMonthlyAmountDh(plan) * 12;
  const annualDh = getPlanAmountDh(plan, selectedBilling);
  if (!(fullYearDh > 0) || annualDh >= fullYearDh) return null;
  return {
    originalAmountDh: fullYearDh,
    percentage: Math.round((1 - annualDh / fullYearDh) * 100),
  };
}

export function formatPlanAmount(amountDh, currencyCode = 'MAD', locale = 'fr') {
  const option = PRICING_CURRENCY_OPTIONS.find((entry) => entry.code === currencyCode) || PRICING_CURRENCY_OPTIONS[0];
  const isEn = locale === 'en';
  const value = Math.round(Number(amountDh || 0) * option.rate);
  const number = value.toLocaleString(isEn ? 'en-US' : 'fr-FR');
  if (isEn && option.code !== 'MAD') return `${option.label}${number}`;
  return `${number} ${option.label}`;
}
