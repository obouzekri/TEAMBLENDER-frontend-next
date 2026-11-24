// What a pricing plan shows to visitors, read the same way by /pricing, the account page and the admin.
//
// Copy lives in `localized_content[locale]` (managed from the admin "Pricing" tab). When a language has
// no entry the default language is used; when a field is missing there, the plan's base columns fill in
// (name, description, features, CTA), so a plan created from the admin without translations still shows
// its full card.
import { DEFAULT_LOCALE } from './i18n/routing.js';
import { formatCurrency } from './i18n/format.js';

// Text fields an admin can set per language. Order = order of the admin editor.
export const PRICING_LOCALIZED_TEXT_FIELDS = [
  'name',
  'description',
  'badge',
  'cta_label',
  'price_label',
  'price_monthly_label',
  'price_annual_label',
  'price_prefix_label',
  'price_secondary_label',
];

// Internal feature codes stored on canonical plans (e.g. `all_challenges`) are not visitor copy.
const FEATURE_CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features.map((item) => cleanText(String(item ?? ''))).filter(Boolean);
}

export function getReadablePlanFeatures(plan) {
  return cleanFeatures(plan?.features).filter((item) => !FEATURE_CODE_PATTERN.test(item));
}

export function getLocalizedPlanEntry(plan, locale) {
  const map = plan?.localized_content;
  if (!map || typeof map !== 'object') return {};
  const entry = map[locale] || map[DEFAULT_LOCALE];
  return entry && typeof entry === 'object' ? entry : {};
}

export function getPricingPlanContent(plan, locale) {
  const entry = getLocalizedPlanEntry(plan, locale);
  const localizedFeatures = cleanFeatures(entry.features);
  return {
    ...entry,
    name: cleanText(entry.name) || cleanText(plan?.name),
    description: cleanText(entry.description) || cleanText(plan?.description),
    features: localizedFeatures.length > 0 ? localizedFeatures : getReadablePlanFeatures(plan),
    cta_label: cleanText(entry.cta_label) || cleanText(plan?.cta_label),
  };
}

// billing: 'monthly' | 'annual'. A label written by the admin wins; otherwise the amount is computed.
export function getPricingPlanPriceLabel(plan, content, billing, locale) {
  const isAnnual = billing === 'annual';
  const configuredLabel = cleanText(isAnnual ? content?.price_annual_label : content?.price_monthly_label);
  const genericLabel = cleanText(content?.price_label);
  if (configuredLabel || genericLabel) return configuredLabel || genericLabel;

  const cents = isAnnual && plan?.annual_price_cents != null
    ? Number(plan.annual_price_cents)
    : Number(plan?.price_cents || 0);
  const amount = (Number.isFinite(cents) ? cents : 0) / 100;
  const currency = String(plan?.currency || 'EUR').toUpperCase();
  try {
    return formatCurrency(amount, locale, currency, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
