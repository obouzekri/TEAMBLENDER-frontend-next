// Account page pricing: plan amounts and currencies, feature labels, invoices and plan copy.
import { getPricingPlanVariantLabel, normalizePricingPlanName } from '@/lib/pricing-labels';
import { formatDate } from './utils';

const PRO_PLUS_PRICE_DH = 696;
export const ACCOUNT_CURRENCY_OPTIONS = [
  { code: 'MAD', label: 'DH', rate: 1 },
  { code: 'EUR', label: '€', rate: 0.092 },
  { code: 'USD', label: '$', rate: 0.1 },
];

function formatPriceCents(priceCents, currency, locale = 'fr') {
  const amount = Number(priceCents || 0) / 100;
  const currencyCode = String(currency || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

export function buildDhPriceByPlanId(plans) {
  const map = {};
  normalizePlanList(plans).forEach((plan) => {
    const slug = String(plan?.slug || '').toLowerCase();
    const fallbackBySlug = slug.includes('free') ? 0 : slug.includes('session') ? 49 : slug.includes('pro+') || slug.includes('pro-plus') ? 690 : slug.includes('pro') ? 390 : null;
    const cents = Number(plan?.price_mad_cents);
    map[String(plan.id)] = Number.isFinite(cents) && cents >= 0
      ? Math.round(cents / 100)
      : (fallbackBySlug ?? Math.max(0, Math.round(Number(plan?.price_cents || 0) / 100)));
  });
  return map;
}

export function formatDhAmount(amountDh) {
  const value = Number(amountDh || 0);
  return `${value} DH`;
}

export function formatAccountPrice(amountDh, currencyCode) {
  const option = ACCOUNT_CURRENCY_OPTIONS.find((entry) => entry.code === currencyCode) || ACCOUNT_CURRENCY_OPTIONS[0];
  const converted = Number(amountDh || 0) * option.rate;
  const rounded = option.code === 'USD' ? Math.round(converted * 10) / 10 : Math.round(converted);
  return `${rounded} ${option.label}`;
}

export function getAccountPlanAmountDh(plan, billingCycle, dhPriceByPlanId) {
  const slug = String(plan?.slug || plan?.name || '').toLowerCase();
  if (slug.includes('pro+') || slug.includes('pro-plus')) {
    return billingCycle === 'annual' ? Math.round(PRO_PLUS_PRICE_DH * 12 * 0.8) : PRO_PLUS_PRICE_DH;
  }

  const annualCents = Number(plan?.annual_price_mad_cents);
  if (billingCycle === 'annual' && Number.isFinite(annualCents) && annualCents >= 0) {
    return annualCents / 100;
  }

  const monthlyAmount = Number(dhPriceByPlanId[String(plan?.id)] || 0);
  if (billingCycle === 'annual') {
    const discount = Number(plan?.annual_discount_percentage || 20);
    return Math.round(monthlyAmount * 12 * (1 - discount / 100));
  }
  return monthlyAmount;
}

function normalizeFeatureLabel(feature) {
  const raw = String(feature || '').trim();
  if (!raw) return '';
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .toLowerCase();

  const isExcluded = normalized.includes("pas d") || normalized.startsWith('no ');

  if (normalized.includes('export')) {
    return `${isExcluded ? '❌' : '✓'} CSV/PDF export`;
  }
  if (normalized.includes('insights avances') || normalized.includes('advanced insights')) {
    return `${isExcluded ? '❌' : '✓'} Insights avancés`;
  }

  if (normalized.includes('illimite') || normalized.includes('unlimited')) {
    if (normalized.includes('session')) {
      return `${isExcluded ? '❌' : '✓'} Sessions illimitées`;
    }
  }

  if (normalized.includes('participants max') || normalized.includes('utilisateurs max') || normalized.includes('participants/session')) {
    const numberMatch = raw.match(/\d+/);
    return `${isExcluded ? '❌' : '✓'} ${numberMatch ? `${numberMatch[0]} participants par session` : 'Participants par session'}`;
  }

  if (normalized.includes('sessions') && (normalized.includes('mois') || normalized.includes('month'))) {
    const numberMatch = raw.match(/\d+/);
    return `${isExcluded ? '❌' : '✓'} ${numberMatch ? `${numberMatch[0]} sessions / mois` : 'Sessions / mois'}`;
  }

  if (normalized.includes('catalogue limite') || normalized.includes('catalogue limite') || normalized.includes('limited catalog')) {
    return `${isExcluded ? '❌' : '✓'} Accès au catalogue limité`;
  }

  if (normalized.includes('jusqu') && normalized.includes('participant')) {
    const numberMatch = raw.match(/\d+/);
    return `${isExcluded ? '❌' : '✓'} ${numberMatch ? `Jusqu'a ${numberMatch[0]} participants` : 'Limite de participants'}`;
  }

  if (normalized.includes('dh ht') || normalized.includes('hors taxe')) {
    return `${isExcluded ? '❌' : '✓'} Hors taxes`;
  }

  if (normalized.includes('tout pro') || normalized.includes('all pro')) {
    return `${isExcluded ? '❌' : '✓'} Toutes les fonctionnalites Pro incluses`;
  }

  if (normalized.includes('support prioritaire') || normalized.includes('priority support')) {
    return `${isExcluded ? '❌' : '✓'} Support prioritaire`;
  }

  if (normalized.includes('automatisation') || normalized.includes('automation')) {
    return `${isExcluded ? '❌' : '✓'} Automatisation avancee`;
  }

  if (normalized.includes('personnalisation') || normalized.includes('branding')) {
    return `${isExcluded ? '❌' : '✓'} Personnalisation de marque`;
  }

  if (normalized.includes('integration') || normalized.includes('integrations')) {
    return `${isExcluded ? '❌' : '✓'} Integrations`;
  }

  if (normalized.includes('analytics') || normalized.includes('reporting')) {
    return `${isExcluded ? '❌' : '✓'} Analyses et reporting`;
  }

  const fallback = raw
    .replace(/^\s*[✓✔❌]\s*/u, '')
    .replace(/^\s*pas d[’']?\s*/iu, 'Pas de ')
    .replace(/\s*\/\s*mois/gi, ' / mois')
    .trim();
  return `${isExcluded ? '❌' : '✓'} ${fallback}`;
}

export function getAccountFeatureLabel(feature) {
  return normalizeFeatureLabel(feature).replace(/^\s*[✓✔❌]\s*/u, '').trim();
}

function getCheckoutRedirectUrl(response) {
  const topLevelUrl = String(response?.url || '').trim();
  if (topLevelUrl) return topLevelUrl;
  const paymentCheckoutUrl = String(response?.payment?.checkout_url || '').trim();
  if (paymentCheckoutUrl) return paymentCheckoutUrl;
  return '';
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
    locale === 'en' ? 'Invoice' : 'Facture',
    `Reference: ${String(entry?.id || Date.now())}`,
    `${locale === 'en' ? 'Date' : 'Date'}: ${String(entry?.at || '')}`,
    `${locale === 'en' ? 'Plan' : 'Formule'}: ${String(entry?.to || '-')}`,
    `${locale === 'en' ? 'Amount' : 'Montant'}: ${String(entry?.amount_label || '0 DH HT')}`,
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

export function getPlanCycleLabel(locale, me, activePlan) {
  const billingCycle = String(me?.billing_cycle || me?.billing_period || activePlan?.billing_cycle || 'monthly').toLowerCase();
  if (billingCycle === 'annual' || billingCycle === 'yearly') {
    return locale === 'en' ? 'Annual' : 'Annuel';
  }
  return locale === 'en' ? 'Monthly' : 'Mensuel';
}

export function getRenewalDate(me, locale = 'fr') {
  const raw = me?.billing_renews_at || me?.current_period_end || me?.renewal_date || me?.next_billing_at || null;
  const formatted = formatDate(raw, locale);
  return formatted || (locale === 'en' ? 'Not scheduled' : 'Non planifiée');
}

function normalizePlanDisplayName(planName) {
  const name = String(planName || '').trim();
  if (!name) return 'Plan';
  if (name.toLowerCase() === 'gratuit') return 'Free';
  return name;
}

export function getAccountPlanCopy(plan, locale = 'fr', cardVariant = 'standard') {
  const isEn = locale === 'en';
  const normalizedName = normalizePricingPlanName(plan);
  const planKey = normalizedName.toLowerCase();

  if (planKey === 'free') {
    return {
      displayName: 'Free',
      features: isEn ? [
        '1 user (admin/manager)',
        '1 session / month - max 4 participants',
        'Limited catalog access (4 challenges)',
        'No export',
        'No advanced insights',
      ] : [
        '1 utilisateur (admin/manager)',
        '1 sessions / mois · max 4 participants',
        'Accès catalogue limité (4 challenges)',
        'Pas d’export',
        'Pas d’insights avancés',
      ],
      meta: [],
      ctaLabel: isEn ? 'Start for free' : 'Commencer gratuitement',
    };
  }

  if (planKey === 'pay-per-session') {
    return {
      displayName: 'Pay-per-session',
      features: isEn ? [
        '1 user max', '20 participants max', '1 session included', 'Full catalog access',
        'Results & scoring', 'Manager dashboard', 'Live facilitation', 'Insights',
      ] : [
        '1 utilisateur max',
        '20 participants max',
        '1 session incluse',
        'Accès catalogue complet',
        'Résultats & scoring',
        'Dashboard manager',
        'Live facilitation',
        'Insights',
      ],
      meta: [],
    };
  }

  if (planKey === 'pro') {
    if (cardVariant === 'enterprise') {
      return {
        displayName: 'Pro +',
        features: isEn ? [
          '5 users (admins/managers)', 'Up to 150 participants', '60 sessions',
          'All features included in the PRO plan', 'Multi-account manager management',
        ] : [
          '5 utilisateurs (admins/managers)', 'Jusqu’à 150 participants', '60 sessions',
          'Toutes les fonctionnalités incluses dans l’offre PRO', 'Gestion multi-comptes managers',
        ],
        meta: [],
      };
    }

    return {
      displayName: getPricingPlanVariantLabel(plan),
      features: isEn ? [
        '1 user (admin/manager)', 'Up to 30 participants', '10 sessions', 'Full catalog access',
        'Results & scoring', 'Manager dashboard', 'Live facilitation', 'Insights',
      ] : [
        '1 utilisateur (admin/manager)',
        'Jusqu’à 30 participants',
        '10 sessions',
        'Accès catalogue complet',
        'Résultats & scoring',
        'Dashboard manager',
        'Live facilitation',
        'Insights',
      ],
      meta: [],
    };
  }

  if (planKey === 'pro+') {
    return {
      displayName: 'Pro +',
      features: isEn ? [
        '5 users (admins/managers)', 'Up to 150 participants', '60 sessions',
        'All features included in the PRO plan', 'Multi-account manager management',
      ] : [
        '5 utilisateurs (admins/managers)',
        'Jusqu’à 150 participants',
        '60 sessions',
        'Toutes les fonctionnalités incluses dans l’offre PRO',
        'Gestion multi-comptes managers',
      ],
      meta: [],
    };
  }

  return {
    displayName: normalizePlanDisplayName(plan?.name),
    features: Array.isArray(plan?.features) ? plan.features : [],
    meta: [],
  };
}
