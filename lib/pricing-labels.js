export function normalizePricingPlanName(plan) {
  const slug = String(plan?.slug || '').trim().toLowerCase();
  const name = String(plan?.name || '').trim().toLowerCase();
  const raw = slug || name;

  if (raw.includes('free') || Number(plan?.price_cents || 0) === 0) return 'Free';
  if (raw.includes('pay') && raw.includes('session')) return 'Pay-per-session';
  if (raw.includes('pro+') || raw.includes('proplus') || raw.includes('pro plus')) return 'Pro+';
  if (raw.includes('enterprise')) return 'Pro+';
  if (raw.includes('pro')) return 'Pro';
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

  if (normalizedName === 'pro' && cardVariant === 'enterprise') {
    return 'Pro +';
  }

  if (normalizedName === 'pro+') {
    return 'Pro +';
  }

  return '';
}
