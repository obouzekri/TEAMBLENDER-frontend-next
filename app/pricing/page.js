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
      <main className="shell pricing-page">
        <section className="pricing-hero reveal-up" aria-label="Tarification TeamBlender">
          <div className="pricing-hero__copy">
            <p className="eyebrow" style={getDarkModeTextStyle()}>{isEn ? 'Pricing' : 'Tarification'}</p>
            <h1 style={getDarkModeHeadingStyle()}>{isEn ? 'Simple plans to scale your team sessions.' : 'Des formules simples pour faire grandir vos sessions d\'équipe.'}</h1>
            <p className="pricing-hero__lede" style={getDarkModeTextStyle()}>
              {isEn
                ? 'Start light, then scale with more capabilities, support, and customization.'
                : 'Commencez avec une offre légère, puis montez en puissance avec plus de capacités, d\'accompagnement et de personnalisation.'}
            </p>
            <div className="pricing-proof-row">
              <span className="pricing-proof-pill">{isEn ? '14-day free trial' : 'Essai gratuit 14 jours'}</span>
              <span className="pricing-proof-pill">{isEn ? 'No credit card required' : 'Sans carte bancaire'}</span>
              <span className="pricing-proof-pill">{isEn ? 'Built for HR and managers' : 'Pensé pour RH et managers'}</span>
            </div>
          </div>
        </section>

        {/* Billing Cycle & Currency Selector */}
        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-controls reveal-up mb-8" aria-label="Options d'affichage">
            <div className="pricing-controls__row mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <section className="pricing-grid reveal-up grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-6" aria-label="Formules disponibles" style={{ background: 'transparent' }}>
            {displayedPlans.map((plan) => {
              const isEnterprise = plan.cardVariant === 'enterprise';
              const ctaLabel = isEnterprise ? (isEn ? 'Contact the team' : 'Contacter l’équipe') : (plan.planCopy.ctaLabel || (isEn ? 'Pay now' : 'Payer maintenant'));
              const ctaHref = isEnterprise ? withLocalePath('/contact') : plan.planCopy.ctaHref;

              return (
              <article key={String(plan.id)} className={`feature-card pricing-card flex h-full flex-col${plan.isFeatured ? ' pricing-card-featured' : ''}`}>
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
                    <Link href={ctaHref || withLocalePath('/contact')} className="btn-outline pricing-cta pricing-cta--enterprise cta-surface">
                      {ctaLabel}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`btn-primary pricing-cta pricing-cta--main cta-surface${plan.isFeatured ? ' pricing-cta--featured' : ''}`}
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
          <section className="pricing-footer-cta reveal-up pricing-footer-cta--flat" aria-label="Assistance commerciale">
            <div className="pricing-footer-cta__inner">
              <div className="pricing-footer-cta__copy">
                <p className="eyebrow" style={getDarkModeTextStyle()}>{isEn ? 'Need support?' : 'Besoin d\'un accompagnement ?'}</p>
                <h2 style={getDarkModeHeadingStyle()}>{isEn ? 'Need support? Our team replies within a few hours.' : 'Besoin d\'un accompagnement ? Notre équipe vous répond sous quelques heures'}</h2>
              </div>
              <Link href={withLocalePath('/contact')} className="btn-primary pricing-footer-cta__button cta-surface">{isEn ? 'Contact the team' : 'Contacter l\'équipe'}</Link>
            </div>
          </section>
        ) : null}
      </main>
      <style jsx global>{`
        .pricing-page {
          width: min(100%, 80rem);
          margin: 0 auto;
          padding: 1rem 1rem 2.5rem;
        }

        .pricing-page .pricing-hero {
          margin-bottom: 2.25rem;
        }

        .pricing-page .pricing-hero__copy {
          display: grid;
          gap: 0.95rem;
          max-width: 46rem;
        }

        .pricing-page .pricing-hero h1 {
          max-width: none;
          margin: 0;
          font-size: clamp(2.1rem, 3.6vw, 3.4rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .pricing-page .pricing-hero__lede {
          margin: 0;
          max-width: 58ch;
          font-size: 1.04rem;
          line-height: 1.7;
          color: var(--text-muted, #cbd5e1);
        }

        .pricing-page .pricing-proof-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin-top: 0.15rem;
        }

        .pricing-page .pricing-proof-pill {
          min-height: 2.6rem;
          display: inline-flex;
          align-items: center;
          padding: 0.55rem 0.95rem;
          border-radius: 999px;
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.2));
          background: rgba(255, 255, 255, 0.04);
          font-size: 0.86rem;
          font-weight: 600;
          color: var(--text-muted, #cbd5e1);
        }

        .pricing-page .pricing-controls {
          margin-bottom: 1.75rem;
        }

        .pricing-page .pricing-controls__row {
          padding: 1.15rem 1.3rem;
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.16));
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          box-shadow: 0 14px 30px rgba(2, 6, 23, 0.22);
        }

        .pricing-page .pricing-controls__label,
        .pricing-page .pricing-controls__currency label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-subtle, #94a3b8);
        }

        .pricing-page .toggle-group--compact {
          display: inline-flex;
          gap: 0.3rem;
          padding: 0.3rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.14));
        }

        .pricing-page .toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 2.85rem;
          padding: 0 1.15rem;
          border-radius: 999px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-muted, #cbd5e1);
          font-size: 0.9rem;
          font-weight: 600;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .pricing-page .toggle-btn.active {
          background: linear-gradient(135deg, #35a0ff 0%, #7c3aed 100%);
          color: #fff;
          box-shadow: 0 10px 22px rgba(53, 160, 255, 0.28);
        }

        .pricing-page .toggle-btn:not(.active):hover {
          background: rgba(255, 255, 255, 0.07);
          color: var(--text-strong, #e2e8f0);
        }

        .pricing-page .toggle-savings-badge {
          padding: 0.16rem 0.5rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 700;
          background: rgba(52, 211, 153, 0.16);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }

        .pricing-page .toggle-btn.active .toggle-savings-badge {
          background: rgba(255, 255, 255, 0.24);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.32);
        }

        .pricing-page .currency-select {
          min-height: 2.85rem;
          padding: 0 1rem;
          border-radius: 14px;
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.2));
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-strong, #e2e8f0);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .pricing-page .currency-select:hover,
        .pricing-page .currency-select:focus {
          outline: none;
          border-color: rgba(53, 160, 255, 0.42);
          box-shadow: 0 0 0 4px rgba(53, 160, 255, 0.14);
        }

        .pricing-page .pricing-grid {
          align-items: stretch;
        }

        .pricing-page .pricing-card {
          min-height: 100%;
          padding: 1.5rem 1.4rem 1.3rem;
          border-radius: 24px;
          gap: 0.95rem;
          position: relative;
          overflow: hidden;
          background: rgba(17, 26, 46, 0.94);
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.16));
          box-shadow: 0 16px 34px rgba(2, 6, 23, 0.3);
        }

        .pricing-page .pricing-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 22%);
        }

        .pricing-page .pricing-card-top {
          min-height: 4.3rem;
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 0.45rem;
        }

        .pricing-page .pricing-card-top .eyebrow {
          margin-top: auto;
          margin-bottom: 0;
          font-size: 0.84rem;
          letter-spacing: 0.05em;
        }

        .pricing-page .pricing-badge,
        .pricing-page .pricing-discount-badge {
          font-size: 0.72rem;
          line-height: 1;
          padding: 0.36rem 0.65rem;
          border-radius: 999px;
          align-self: flex-start;
        }

        .pricing-page .pricing-badge--featured {
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 12px 26px rgba(90, 75, 218, 0.24);
        }

        .pricing-page .pricing-price {
          margin: 0;
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
          flex-wrap: wrap;
          font-size: clamp(2rem, 2.6vw, 2.5rem);
          line-height: 1;
        }

        .pricing-page .pricing-price span {
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .pricing-page .pricing-original {
          margin: -0.35rem 0 0;
          font-size: 0.86rem;
        }

        .pricing-page .pricing-description {
          margin: 0.1rem 0 0;
          color: var(--text-muted, #cbd5e1);
          font-size: 0.94rem;
          line-height: 1.55;
        }

        .pricing-page .pricing-feature-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.6rem;
          flex: 1;
        }

        .pricing-page .pricing-feature-list li {
          position: relative;
          padding-left: 1.25rem;
          font-size: 0.92rem;
          line-height: 1.5;
          color: var(--text-muted, #cbd5e1);
        }

        .pricing-page .pricing-feature-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.56rem;
          width: 0.45rem;
          height: 0.45rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #35a0ff 0%, #7c3aed 100%);
          box-shadow: 0 0 0 4px rgba(53, 160, 255, 0.12);
        }

        .pricing-page .pricing-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 0.75rem;
          min-height: 1.7rem;
          margin-top: 0.1rem;
          padding-top: 0.35rem;
          border-top: 1px solid rgba(148, 163, 184, 0.14);
          color: var(--text-subtle, #94a3b8);
          font-size: 0.8rem;
        }

        .pricing-page .pricing-actions {
          display: flex;
          align-items: stretch;
          margin-top: 0.25rem;
        }

        .pricing-page .pricing-cta,
        .pricing-page .pricing-footer-cta__button {
          width: 100%;
          justify-content: center;
          min-height: 3.15rem;
          padding: 0.8rem 1.1rem;
          border-radius: 14px;
          font-size: 0.94rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          white-space: normal;
          text-align: center;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
        }

        .pricing-page .pricing-cta:hover {
          transform: translateY(-1px);
        }

        .pricing-page .pricing-cta--featured {
          box-shadow: 0 16px 30px rgba(53, 160, 255, 0.26);
        }

        .pricing-page .pricing-cta--enterprise {
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.28));
          background: rgba(255, 255, 255, 0.03);
        }

        .pricing-page .pricing-cta--enterprise:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(125, 211, 252, 0.4);
        }

        .pricing-page .pricing-card-featured {
          border-color: rgba(53, 160, 255, 0.36);
          box-shadow: 0 22px 48px rgba(53, 160, 255, 0.16), 0 18px 40px rgba(2, 6, 23, 0.36);
          transform: translateY(-2px);
        }

        .pricing-page .pricing-card-featured .pricing-badge--featured {
          background: linear-gradient(135deg, rgba(53, 160, 255, 0.24), rgba(124, 58, 237, 0.24));
          color: #e8f1ff;
          border-color: rgba(255, 255, 255, 0.14);
        }

        .pricing-page .pricing-footer-cta {
          margin-top: 1.6rem;
          padding: 0;
        }

        .pricing-page .pricing-footer-cta__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem 1.5rem;
          width: min(100%, 72rem);
          margin: 0 auto;
          padding: 1.35rem 1.5rem;
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.16));
          border-radius: 24px;
          background: rgba(17, 26, 46, 0.92);
          box-shadow: 0 18px 40px rgba(2, 6, 23, 0.3);
        }

        .pricing-page .pricing-footer-cta__copy {
          display: grid;
          gap: 0.45rem;
          max-width: 52ch;
        }

        .pricing-page .pricing-footer-cta__copy h2 {
          margin: 0;
          font-size: clamp(1.2rem, 2vw, 1.55rem);
          line-height: 1.25;
          letter-spacing: -0.02em;
          text-wrap: balance;
        }

        .pricing-page .pricing-footer-cta__copy .eyebrow {
          margin: 0;
        }

        .pricing-page .pricing-footer-cta__button {
          width: auto;
          min-width: 13rem;
          flex-shrink: 0;
        }

        @media (min-width: 1280px) {
          .pricing-page .pricing-card {
            min-height: 31rem;
          }
        }

        @media (max-width: 1024px) {
          .pricing-page .pricing-footer-cta__inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .pricing-page .pricing-footer-cta__button {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 640px) {
          .pricing-page {
            padding: 0.5rem 0.75rem 1.8rem;
          }

          .pricing-page .pricing-controls__row,
          .pricing-page .pricing-footer-cta__inner {
            padding: 1rem;
            border-radius: 18px;
          }

          .pricing-page .pricing-proof-pill {
            width: 100%;
            justify-content: center;
          }

          .pricing-page .pricing-card {
            padding: 1.2rem 1rem 1.05rem;
            border-radius: 18px;
          }

          .pricing-page .pricing-price {
            font-size: 2rem;
          }
        }
      `}</style>
      <Footer />
    </>
  );
}

