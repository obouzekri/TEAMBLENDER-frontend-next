// Account page pricing: plan amounts and currencies, feature labels, invoices and plan copy.
import { translate } from '@/lib/i18n';
import { getPricingPlanContent, getPricingPlanPriceLabel } from '@/lib/pricing-plan-content';

export function buildDhPriceByPlanId(plans) {
  const map = {};
  normalizePlanList(plans).forEach((plan) => {
    const cents = Number(plan?.price_mad_cents);
    map[String(plan.id)] = Number.isFinite(cents) && cents >= 0
      ? Math.round(cents / 100)
      : Math.max(0, Math.round(Number(plan?.price_cents || 0) / 100));
  });
  return map;
}

export function formatDhAmount(amountDh) {
  const value = Number(amountDh || 0);
  return `${value} DH`;
}

export function getAccountPlanPriceLabel(plan, billingCycle, locale = 'fr') {
  return getPricingPlanPriceLabel(plan, getPricingPlanContent(plan, locale), billingCycle, locale);
}

export function getAccountFeatureLabel(feature) {
  return String(feature || '').replace(/^\s*[✓✔❌]\s*/u, '').trim();
}

export function buildInvoiceDownload(entry, locale) {
  const external = String(
    entry?.invoice_pdf_url || entry?.pdf_url || entry?.invoice_url || entry?.receipt_url || ''
  ).trim();
  if (external) {
    return {
      href: external,
      filename: `invoice-${String(entry?.id || Date.now())}.pdf`,
      external: true,
    };
  }

  const invoiceText = [
    translate(locale, 'pricingPage.invoice'),
    `Reference: ${String(entry?.id || Date.now())}`,
    `${translate(locale, 'pricingPage.date')}: ${String(entry?.at || '')}`,
    `${translate(locale, 'pricingPage.plan')}: ${String(entry?.to || '-')}`,
    `${translate(locale, 'pricingPage.amount')}: ${String(entry?.amount_label || '0 DH HT')}`,
  ].join('\n');

  const blob = new Blob([invoiceText], { type: 'application/pdf' });
  return {
    href: URL.createObjectURL(blob),
    filename: `invoice-${String(entry?.id || Date.now())}.pdf`,
    external: false,
  };
}

export function resolveHistoryAmountLabel(entry, plans, dhPriceByPlanId) {
  const explicit = String(entry?.amount_label || '').trim();
  if (explicit) {
    return explicit
      .replace(/\bDH\s*HT\b/gi, 'DH HT')
      .replace(/\bExcl\. taxes\b/gi, 'HT');
  }

  const byPlanId = String(entry?.to_plan_id || '').trim();
  if (byPlanId && Object.prototype.hasOwnProperty.call(dhPriceByPlanId, byPlanId)) {
    return `${formatDhAmount(dhPriceByPlanId[byPlanId])} HT`;
  }

  const planName = String(entry?.to || '').trim().toLowerCase();
  if (planName) {
    const match = plans.find((plan) => String(plan?.name || '').trim().toLowerCase() === planName);
    if (match) {
      const amountDh = Number(dhPriceByPlanId[String(match.id)] || 0);
      return `${formatDhAmount(amountDh)} HT`;
    }
  }

  return '0 DH HT';
}

export function normalizePlanList(plans) {
  const list = Array.isArray(plans) ? plans : [];
  return [...list].sort((a, b) => {
    const byOrder = Number(a.display_order || 0) - Number(b.display_order || 0);
    if (byOrder !== 0) return byOrder;
    return Number(a.price_cents || 0) - Number(b.price_cents || 0);
  });
}

export function getAccountPlanCopy(plan, locale = 'fr', cardVariant = 'standard') {
  const content = getPricingPlanContent(plan, locale);
  return {
    displayName: content.name || 'Plan',
    description: content.description,
    features: content.features,
    meta: [],
    ctaLabel: content.cta_label,
    badge: content.badge || '',
    priceSecondaryLabel: content.price_secondary_label || '',
  };
}
