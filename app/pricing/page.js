"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';
import { startBillingCheckout } from '@/lib/account';
import useI18n from '@/lib/i18n/useI18n';
import { getCheckoutRedirectUrl } from '@/lib/billing-utils';

function getStoredCurrentUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
};

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

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

function normalizePricingPlanName(plan) {
  const slug = String(plan?.slug || '').trim().toLowerCase();
  const name = String(plan?.name || '').trim().toLowerCase();
  const raw = slug || name;

  if (raw.includes('free') || Number(plan?.price_cents || 0) === 0) return 'Free';
  if (raw.includes('pay') && raw.includes('session')) return 'Pay-per-session';
  if (raw.includes('pro+') || raw.includes('proplus') || raw.includes('pro plus')) return 'Pro+';
  if (raw.includes('pro')) return 'Pro';
  return String(plan?.name || 'Plan').trim() || 'Plan';
}

function getPricingPeriodSuffix(plan, selectedBilling) {
  const billingCycle = String(plan?.billing_cycle || '').trim().toLowerCase();

  if (billingCycle === 'one_time') {
    return '/session';
  }

  if (selectedBilling === 'annual' || selectedBilling === 'yearly') {
    return '/an';
  }

  return '/mois';
}

function getPricingPlanCopy(plan, selectedBilling, cardVariant = 'standard') {
  const normalizedName = normalizePricingPlanName(plan);
  const planKey = normalizedName.toLowerCase();
  const billingCycle = String(plan?.billing_cycle || '').trim().toLowerCase();
  const isOneTimeSession = billingCycle === 'one_time';

  if (planKey === 'free') {
    return {
      displayName: 'Free',
      priceSuffix: getPricingPeriodSuffix(plan, selectedBilling),
      meta: [],
      features: [
        '2 sessions / mois · max 3 participants',
        'Accès catalogue limité (3 challenges)',
        'Pas d’export',
        'Pas d’insights avancés',
      ],
      ctaLabel: 'Commencer gratuitement',
    };
  }

  if (planKey === 'pay-per-session') {
    return {
      displayName: isOneTimeSession ? 'Pay-per-session' : 'Forfait session',
      priceSuffix: getPricingPeriodSuffix(plan, selectedBilling),
      meta: isOneTimeSession
        ? ['20 utilisateurs max', '1 session incluse']
        : ['20 utilisateurs max', '1 session incluse / mois'],
      features: [],
      ctaLabel: 'Acheter une session',
    };
  }

  if (planKey === 'pro') {
    return {
      displayName: cardVariant === 'enterprise' ? 'Enterprise' : 'Pro',
      priceSuffix: getPricingPeriodSuffix(plan, selectedBilling),
      meta: ['50 utilisateurs max'],
      features: [
        'Sessions illimitées',
        'Jusqu’à 50 participants',
        'Accès catalogue complet',
        'Résultats & scoring',
        'Dashboard manager',
        'Live facilitation',
        'Insights',
      ],
      highlightedLabel: cardVariant === 'enterprise' ? 'Sur mesure' : 'Recommandé',
      ctaLabel: cardVariant === 'enterprise' ? 'Contacter l’équipe' : 'Démarrer l’essai gratuit',
      ctaHref: cardVariant === 'enterprise' ? '/contact' : null,
    };
  }

  if (planKey === 'pro+') {
    return {
      displayName: 'Pro+',
      priceSuffix: getPricingPeriodSuffix(plan, selectedBilling),
      meta: [],
      features: [
        'Tout Pro',
        'Multi-managers',
        'Historique sessions',
        'Export CSV/PDF',
        'Insights avancés',
        'Support prioritaire',
      ],
    };
  }

  return {
    displayName: String(plan?.name || 'Plan').trim() || 'Plan',
    priceSuffix: getPricingPeriodSuffix(plan, selectedBilling),
    meta: [],
    features: Array.isArray(plan?.features) ? plan.features : [],
  };
}

function buildPricingCards(plans, selectedBilling) {
  let proVariantIndex = 0;

  return plans.map((plan) => {
    const normalizedName = normalizePricingPlanName(plan).toLowerCase();
    let cardVariant = 'standard';

    if (normalizedName === 'pro') {
      proVariantIndex += 1;
      if (proVariantIndex > 1) {
        cardVariant = 'enterprise';
      }
    }

    const basePriceCents = Number(plan.price_cents || 0);
    let displayPriceCents = basePriceCents;
    let originalPriceCents = null;
    let discountPercentage = 0;
    const billingCycle = String(plan.billing_cycle || '').trim().toLowerCase();
    const useAnnualDisplay = selectedBilling === 'annual' || selectedBilling === 'yearly';

    if (useAnnualDisplay && billingCycle !== 'one_time') {
      discountPercentage = Number(plan.annual_discount_percentage || (normalizedName === 'pro' ? 20 : 0));
      if (discountPercentage > 0) {
        originalPriceCents = basePriceCents;
        displayPriceCents = Math.round(basePriceCents * (1 - discountPercentage / 100));
      }
    }

    return {
      ...plan,
      cardVariant,
      isFeatured: normalizedName === 'pro' && cardVariant === 'standard',
      displayPriceCents,
      originalPriceCents,
      discountPercentage,
      planCopy: getPricingPlanCopy(plan, selectedBilling, cardVariant),
    };
  });
}

function getDarkModeSectionStyle() {
  return {
    backgroundColor: 'var(--surface-panel, rgba(17, 26, 46, 0.96))',
    borderColor: 'var(--surface-soft-border, rgba(148, 163, 184, 0.22))',
    boxShadow: '0 18px 40px rgba(2, 6, 23, 0.42)',
  };
}

function getDarkModeTextStyle() {
  return { color: 'var(--text-muted, #cbd5e1)' };
}

function getDarkModeHeadingStyle() {
  return { color: 'var(--text-strong, #e2e8f0)' };
}

export default function PricingPage() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [checkoutPlanId, setCheckoutPlanId] = useState('');

  useEffect(() => {
    async function loadPlans() {
      try {
        setError('');
        const response = await fetch(getApiUrl('/pricing-plans'));
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(isEn ? 'Unable to load pricing.' : 'Impossible de charger la tarification.');
        }
        const list = Array.isArray(payload) ? payload : [];
        setPlans(list);
      } catch (err) {
        setError(err.message || (isEn ? 'Pricing load error.' : 'Erreur de chargement de la tarification.'));
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, [isEn]);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (Number(a.display_order || 0) !== Number(b.display_order || 0)) {
        return Number(a.display_order || 0) - Number(b.display_order || 0);
      }
      return Number(a.price_cents || 0) - Number(b.price_cents || 0);
    });
  }, [plans]);

  const displayedPlans = useMemo(() => buildPricingCards(sortedPlans, selectedBilling), [sortedPlans, selectedBilling]);

  async function handleProviderCheckout(plan, provider) {
    const currentUser = getStoredCurrentUser();

    if (!currentUser) {
      window.location.assign(withLocalePath(`/login?next=${encodeURIComponent('/pricing')}`));
      return;
    }

    setCheckoutPlanId(String(plan?.id || ''));
    setError('');

    try {
      const response = await startBillingCheckout({
        pricing_plan_id: plan.id,
        method: provider,
        billing_cycle: selectedBilling,
      });

      const checkoutUrl = getCheckoutRedirectUrl(response);
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      if (response?.mode === 'manual_pro_request') {
        window.location.assign(withLocalePath(`/account?source=pricing&billing=manual&reference=${encodeURIComponent(String(response?.reference || ''))}`));
        return;
      }

      throw new Error(provider === 'payoneer'
        ? (isEn ? 'Payoneer checkout is temporarily unavailable.' : 'Le paiement Payoneer est temporairement indisponible.')
        : (isEn ? 'PayPal checkout is temporarily unavailable.' : 'Le paiement PayPal est temporairement indisponible.'));
    } catch (err) {
      setError(err.message || (provider === 'payoneer'
        ? (isEn ? 'Payoneer payment is currently unavailable.' : 'Paiement Payoneer impossible pour le moment.')
        : (isEn ? 'PayPal payment is currently unavailable.' : 'Paiement PayPal impossible pour le moment.')));
    } finally {
      setCheckoutPlanId('');
    }
  }

  return (
    <>
      <TopNav />
      <main
        className="shell pricing-page"
        style={{
          background: 'radial-gradient(circle at top left, rgba(53, 160, 255, 0.08), transparent 34%), radial-gradient(circle at right 10%, rgba(124, 58, 237, 0.08), transparent 28%), linear-gradient(180deg, rgba(8, 15, 30, 0.98) 0%, rgba(12, 18, 34, 0.98) 100%)',
          color: 'var(--text-strong, #e2e8f0)',
        }}
      >
        <section className="pricing-hero reveal-up text-center mb-16" aria-label="Tarification TeamBlender">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <p className="eyebrow" style={getDarkModeTextStyle()}>{isEn ? 'Pricing' : 'Tarification'}</p>
            <h1 style={getDarkModeHeadingStyle()}>{isEn ? 'Simple plans to scale your team sessions.' : 'Des formules simples pour faire grandir vos sessions d\'équipe.'}</h1>
            <p style={getDarkModeTextStyle()}>
              {isEn
                ? 'Start light, then scale with more capabilities, support, and customization.'
                : 'Commencez avec une offre légère, puis montez en puissance avec plus de capacités, d\'accompagnement et de personnalisation.'}
            </p>
            <p style={getDarkModeTextStyle()}>
              {isEn
                ? '14-day free trial, no credit card required.'
                : 'Essai gratuit 14 jours, sans carte bancaire.'}
            </p>
          </div>
        </section>

        {/* Billing Cycle & Currency Selector */}
        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-controls reveal-up mb-12" aria-label="Options d'affichage">
            <div className="pricing-controls__row mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="control-section pricing-controls__toggle">
                <label className="pricing-controls__label" style={getDarkModeTextStyle()}>{isEn ? 'Billing cycle' : 'Fréquence de facturation'}</label>
                <div className="toggle-group toggle-group--compact">
                  <button
                    type="button"
                    className={`toggle-btn toggle-btn--soft ${selectedBilling === 'monthly' ? 'active' : ''}`}
                    onClick={() => setSelectedBilling('monthly')}
                  >
                    {isEn ? 'Monthly' : 'Mensuel'}
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn toggle-btn--soft ${selectedBilling === 'annual' ? 'active' : ''}`}
                    onClick={() => setSelectedBilling('annual')}
                  >
                    <span>{isEn ? 'Yearly' : 'Annuel'}</span>
                    <span className="toggle-savings-badge">-20%</span>
                  </button>
                </div>
              </div>

              <div className="control-section pricing-controls__currency">
                <label htmlFor="currency-select" style={getDarkModeTextStyle()}>{isEn ? 'Currency' : 'Devise'}</label>
                <select
                  id="currency-select"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="currency-select currency-select--compact"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr} {CURRENCY_SYMBOLS[curr] || ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className="feature-card" aria-label="Chargement des formules" style={{ ...getDarkModeSectionStyle(), backgroundColor: 'rgba(17, 26, 46, 0.98)' }}>
            <p>{isEn ? 'Loading plans...' : 'Chargement des formules en cours...'}</p>
          </section>
        ) : null}

        {error ? (
          <section className="feature-card" aria-label="Erreur tarification" style={{ ...getDarkModeSectionStyle(), backgroundColor: 'rgba(17, 26, 46, 0.98)' }}>
            <p className="form-error">{error}</p>
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length === 0 ? (
          <section className="pricing-empty reveal-up" aria-label="Aucune formule" style={{ ...getDarkModeSectionStyle(), backgroundColor: 'rgba(17, 26, 46, 0.98)' }}>
            <div className="pricing-empty-icon">💬</div>
            <h2 style={getDarkModeHeadingStyle()}>{isEn ? 'Plans are being finalized' : 'Formules en cours de finalisation'}</h2>
            <p style={getDarkModeTextStyle()}>
              {isEn
                ? 'Our team is preparing the offers. Contact us for a proposal adapted to your context.'
                : 'Notre équipe prépare les offres. Contactez-nous pour recevoir une proposition adaptée à votre contexte.'}
            </p>
            <div className="hero-actions">
              <Link href={withLocalePath('/contact')} className="btn-primary">{isEn ? 'Request a proposal' : 'Demander une proposition'}</Link>
              <Link href={withLocalePath('/signup')} className="btn-secondary">{isEn ? 'Create account' : 'Créer un compte'}</Link>
            </div>
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length > 0 ? (
          <div className="mx-auto w-full max-w-7xl px-4">
            <section className="pricing-grid reveal-up grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8" aria-label="Formules disponibles" style={{ background: 'transparent' }}>
            {displayedPlans.map((plan) => {
              const isEnterprise = plan.cardVariant === 'enterprise';
              const ctaLabel = isEnterprise ? (isEn ? 'Contact the team' : 'Contacter l’équipe') : (plan.planCopy.ctaLabel || (isEn ? 'Pay now' : 'Payer maintenant'));
              const ctaHref = isEnterprise ? withLocalePath('/contact') : plan.planCopy.ctaHref;

              return (
              <article key={String(plan.id)} className={`feature-card pricing-card flex h-full flex-col${plan.isFeatured ? ' pricing-card-featured' : ''}`} style={getDarkModeSectionStyle()}>
                <div className="pricing-card-top">
                  {plan.isFeatured ? <span className="pricing-badge pricing-badge--featured">{isEn ? 'Most popular' : 'Plus populaire'}</span> : null}
                  {!plan.isFeatured && plan.highlighted ? <span className="pricing-badge">{isEnterprise ? (isEn ? 'Custom' : 'Sur mesure') : (isEn ? 'Recommended' : 'Recommandé')}</span> : null}
                  {plan.discountPercentage > 0 && (selectedBilling === 'annual' || selectedBilling === 'yearly') ? (
                    <span className="pricing-discount-badge">{isEn ? `Save ${plan.discountPercentage}%` : `Économisez ${plan.discountPercentage}%`}</span>
                  ) : null}
                  <p className="eyebrow" style={getDarkModeTextStyle()}>
                    {plan.planCopy.displayName}
                    {plan.highlighted && !isEnterprise ? (isEn ? ' (Recommended)' : ' (Recommandé)') : null}
                    {isEnterprise ? (isEn ? ' (Custom)' : ' (Sur mesure)') : null}
                  </p>
                </div>

                <h2 className="pricing-price" style={getDarkModeHeadingStyle()}>
                  {formatPriceCents(plan.displayPriceCents, selectedCurrency, locale)}
                  <span style={getDarkModeTextStyle()}>{plan.planCopy.priceSuffix}</span>
                </h2>
                {plan.originalPriceCents ? (
                  <p className="pricing-original" style={getDarkModeTextStyle()}>
                    <s>{formatPriceCents(plan.originalPriceCents, selectedCurrency, locale)}</s>
                  </p>
                ) : null}
                {plan.description ? <p className="pricing-description" style={getDarkModeTextStyle()}>{plan.description}</p> : null}

                {Array.isArray(plan.planCopy.features) && plan.planCopy.features.length > 0 ? (
                  <ul className="pricing-feature-list">
                    {plan.planCopy.features.map((item, index) => (
                      <li key={`${plan.id}-${index}`} style={getDarkModeTextStyle()}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="pricing-meta-row">
                  {plan.planCopy.meta.map((item, index) => (
                    <span key={`${plan.id}-meta-${index}`} style={getDarkModeTextStyle()}>{item}</span>
                  ))}
                  {plan.trial_days ? <span>{plan.trial_days} {isEn ? 'trial days' : 'jours d\'essai'}</span> : null}
                  {plan.support_level ? <span>{isEn ? 'Support' : 'Support'} {plan.support_level}</span> : null}
                </div>

                <div className="hero-actions pricing-actions mt-auto">
                  {isEnterprise ? (
                    <Link href={ctaHref || withLocalePath('/contact')} className="btn-outline pricing-cta pricing-cta--enterprise">
                      {ctaLabel}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`btn-primary pricing-cta pricing-cta--main${plan.isFeatured ? ' pricing-cta--featured' : ''}`}
                      onClick={() => handleProviderCheckout(plan, 'payoneer')}
                      disabled={checkoutPlanId === String(plan.id)}
                    >
                      {checkoutPlanId === String(plan.id) ? (isEn ? 'Opening checkout...' : 'Ouverture du paiement...') : ctaLabel}
                    </button>
                  )}
                </div>
              </article>
            );
            })}
            </section>
          </div>
        ) : null}

        {!loading && !error && sortedPlans.length > 0 ? (
          <section className="pricing-footer-cta reveal-up" aria-label="Assistance commerciale">
            <div className="pricing-footer-cta__inner">
              <div className="pricing-footer-cta__copy">
                <p className="eyebrow" style={getDarkModeTextStyle()}>{isEn ? 'Need support?' : 'Besoin d\'un accompagnement ?'}</p>
                <h2 style={getDarkModeHeadingStyle()}>{isEn ? 'Need support? Our team replies within a few hours.' : 'Besoin d\'un accompagnement ? Notre équipe vous répond sous quelques heures'}</h2>
              </div>
              <Link href={withLocalePath('/contact')} className="btn-primary pricing-footer-cta__button">{isEn ? 'Contact the team' : 'Contacter l\'équipe'}</Link>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

