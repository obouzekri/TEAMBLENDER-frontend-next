export function normalizePricingPlanName(plan) {
  const slug = String(plan?.slug || '').trim().toLowerCase();
  const name = String(plan?.name || '').trim().toLowerCase();
  const raw = slug || name;

  if (raw.includes('free')) return 'Free';
  if (raw.includes('pay') && raw.includes('session')) return 'Pay-per-session';
  if (raw.includes('pro+') || raw.includes('proplus') || raw.includes('pro plus')) return 'Pro+';
  if (raw.includes('enterprise')) return 'Pro+';
  if (raw.includes('pro')) return 'Pro';
  // Only fall back to the price once the slug/name gave no hint: plans served
  // without the legacy `price_cents` field (fallback plans) are not free.
  if (Number(plan?.price_mad_cents ?? plan?.price_cents ?? 0) === 0) return 'Free';
  return String(plan?.name || 'Plan').trim() || 'Plan';
}

export function getPricingPlanVariantLabel(plan, cardVariant = 'standard') {
  const normalizedName = normalizePricingPlanName(plan).toLowerCase();

  if (normalizedName === 'pro') {
    return cardVariant === 'enterprise' ? 'Pro +' : 'Pro';
  }

  if (normalizedName === 'pro+') {
    return 'Pro +';
  }

  return normalizePricingPlanName(plan);
}

export function getPricingPlanBadgeLabel(plan, cardVariant = 'standard') {
  const normalizedName = normalizePricingPlanName(plan).toLowerCase();

  if (normalizedName === 'pro' && cardVariant === 'standard') {
    return 'Plus populaire';
  }

  // No badge for Pro + / enterprise variant: the "Pro +" title already carries that meaning.
  return '';
}
