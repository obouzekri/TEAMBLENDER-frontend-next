"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';
import useI18n from '@/lib/i18n/useI18n';
import { getPricingPlansFallback } from '@/lib/pricingFallbackPlans';

function getPlanContent(plan, locale) {
  return plan?.localized_content?.[locale] || plan?.localized_content?.fr || {};
}

function getPlanPriceLabel(plan, content, selectedBilling, locale) {
  const isAnnual = selectedBilling === 'annual';
  const configuredLabel = isAnnual ? content.price_annual_label : content.price_monthly_label;
  if (configuredLabel || content.price_label) return configuredLabel || content.price_label;

  const cents = isAnnual && plan.annual_price_cents != null
    ? Number(plan.annual_price_cents)
    : Number(plan.price_cents || 0);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: plan.currency || 'EUR',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// Trial starts self-service; paid plans are activated by the team after a request.
function getPlanCtaHref(plan) {
  const code = String(plan?.plan_code || '').toLowerCase();
  if (code === 'trial') return '/signup';
  if (code === 'team' || code === 'enterprise') return `/contact?plan=${code}`;
  return '/contact';
}

const FAQ_ITEMS = [
  { q: 'pricingPage.faqParticipantQ', a: 'pricingPage.faqParticipantA' },
  { q: 'pricingPage.faqTrialEndQ', a: 'pricingPage.faqTrialEndA' },
  { q: 'pricingPage.faqPaymentQ', a: 'pricingPage.faqPaymentA' },
  { q: 'pricingPage.faqBiggerTeamQ', a: 'pricingPage.faqBiggerTeamA' },
];

function buildPricingCards(plans, selectedBilling, locale) {
  return plans.map((plan) => {
    const content = getPlanContent(plan, locale);
    return {
      ...plan,
      content,
      priceLabel: getPlanPriceLabel(plan, content, selectedBilling, locale),
      isFeatured: Boolean(plan.highlighted),
    };
  });
}

function getDarkModeSectionStyle() {
  return {
    backgroundColor: 'var(--surface-panel, #ffffff)',
    borderColor: 'var(--surface-soft-border, rgba(148, 163, 184, 0.22))',
    boxShadow: 'var(--shadow-lg, 0 18px 40px rgba(2, 6, 23, 0.18))',
  };
}

function getDarkModeTextStyle() {
  return { color: 'var(--text-muted, #cbd5e1)' };
}

function getDarkModeHeadingStyle() {
  return { color: 'var(--text-strong, #e2e8f0)' };
}

export default function PricingPageClient({ initialPlans = [] }) {
  const { locale, t, withLocalePath } = useI18n();
  const [plans, setPlans] = useState(initialPlans);
  const [loading, setLoading] = useState(initialPlans.length === 0);
  const [error, setError] = useState('');
  const [selectedBilling, setSelectedBilling] = useState('monthly');

  const hasInitialLivePlans = initialPlans.some((plan) => !plan?.is_fallback);
  const hasFallbackPlans = useMemo(() => plans.some((plan) => Boolean(plan?.is_fallback)), [plans]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);

    async function loadPlans() {
      try {
        setError('');
        const response = await fetch(getApiUrl('/pricing-plans'), { signal: controller.signal });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(t('pricingPage.unableToLoadPricing'));
        }
        const list = Array.isArray(payload) ? payload : [];
        setPlans(list.length > 0 ? list : getPricingPlansFallback());
      } catch (err) {
        if (hasInitialLivePlans) {
          // Server-rendered live plans are already shown: keep them silently.
          return;
        }
        setPlans(getPricingPlansFallback());
        const timeoutError = err?.name === 'AbortError';
        setError(
          timeoutError
            ? t('pricingPage.pricingServiceIsTakingTooLong')
            : (err.message || t('pricingPage.pricingLoadError'))
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale, hasInitialLivePlans]);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (Number(a.display_order || 0) !== Number(b.display_order || 0)) {
        return Number(a.display_order || 0) - Number(b.display_order || 0);
      }
      return Number(a.price_cents || 0) - Number(b.price_cents || 0);
    });
  }, [plans]);

  const displayedPlans = useMemo(() => buildPricingCards(sortedPlans, selectedBilling, locale), [sortedPlans, selectedBilling, locale]);
  const annualDiscount = useMemo(
    () => Math.max(0, ...sortedPlans.map((plan) => Number(plan.annual_discount_percentage || 0))),
    [sortedPlans]
  );

  return (
    <>
      <TopNav />
      <main className="shell pricing-page">
        <section className="pricing-hero reveal-up" aria-label={t('pricingPage.teamblenderPricing')}>
          <div className="pricing-hero__copy">
            <h1 style={getDarkModeHeadingStyle()}>{t('pricingPage.simplePlansToScaleYourTeam')}</h1>
            <p className="pricing-hero__context" style={getDarkModeTextStyle()}>
              {t('pricingPage.challengesAreDesignedForTeamsOf')}
            </p>
          </div>
        </section>

        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-how reveal-up" aria-label={t('pricingPage.howTitle')}>
            <ol className="pricing-how__steps">
              <li><strong>20</strong><span style={getDarkModeTextStyle()}>{t('pricingPage.howStep1')}</span></li>
              <li aria-hidden="true" className="pricing-how__arrow">→</li>
              <li><strong>4 × 5</strong><span style={getDarkModeTextStyle()}>{t('pricingPage.howStep2')}</span></li>
              <li aria-hidden="true" className="pricing-how__arrow">→</li>
              <li><strong>1</strong><span style={getDarkModeTextStyle()}>{t('pricingPage.howStep3')}</span></li>
            </ol>
            <p className="pricing-how__note" style={getDarkModeTextStyle()}>{t('pricingPage.joinNote')}</p>
          </section>
        ) : null}

        {/* Billing cycle selector */}
        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-controls reveal-up" aria-label={t('pricingPage.billingCycle')}>
            <div className="pricing-controls__row">
              <span id="pricing-billing-label" className="pricing-controls__label" style={getDarkModeTextStyle()}>{t('pricingPage.billingCycle')}</span>
              <div className="toggle-group toggle-group--compact" role="group" aria-labelledby="pricing-billing-label">
                <button
                  type="button"
                  className={`toggle-btn toggle-btn--soft ${selectedBilling === 'monthly' ? 'active' : ''}`}
                  aria-pressed={selectedBilling === 'monthly'}
                  onClick={() => setSelectedBilling('monthly')}
                >
                  {t('pricingPage.monthly')}
                </button>
                <button
                  type="button"
                  className={`toggle-btn toggle-btn--soft ${selectedBilling === 'annual' ? 'active' : ''}`}
                  aria-pressed={selectedBilling === 'annual'}
                  onClick={() => setSelectedBilling('annual')}
                >
                  {t('pricingPage.yearly')}
                  {annualDiscount > 0 ? (
                    <span className="toggle-savings-badge">{t('pricingPage.saveDiscountpercentage', { discountPercentage: annualDiscount })}</span>
                  ) : null}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className="feature-card" aria-label="Chargement des formules" style={getDarkModeSectionStyle()}>
            <p>{t('pricingPage.loadingPlans')}</p>
          </section>
        ) : null}

        {error ? (
          <section className="feature-card" aria-label={t('pricingPage.pricingErrorAria')} style={getDarkModeSectionStyle()}>
            <p className="form-error">{error}</p>
            <p style={getDarkModeTextStyle()}>
              {t(hasFallbackPlans ? 'pricingPage.fallbackPlansShown' : 'pricingPage.pricingCouldNotBeLoaded')}
            </p>
            <div className="hero-actions">
              <Link href={withLocalePath('/contact')} className="btn-primary">{t('pricingPage.talkToAnExpert')}</Link>
              <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
                {t('pricingPage.retry')}
              </button>
            </div>
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length === 0 ? (
          <section className="pricing-empty reveal-up" aria-label="Aucune formule" style={getDarkModeSectionStyle()}>
            <div className="pricing-empty-icon">💬</div>
            <h2 style={getDarkModeHeadingStyle()}>{t('pricingPage.plansAreBeingFinalized')}</h2>
            <p style={getDarkModeTextStyle()}>
              {t('pricingPage.ourTeamIsPreparingTheOffers')}
            </p>
            <div className="hero-actions">
              <Link href={withLocalePath('/contact')} className="btn-primary">{t('pricingPage.talkToAnExpert')}</Link>
              <Link href={withLocalePath('/signup')} className="btn-secondary">{t('pricingPage.createAccount')}</Link>
            </div>
          </section>
        ) : null}

        {!loading && sortedPlans.length > 0 ? (
          <div className="pricing-grid-wrap">
            <section className="pricing-grid reveal-up" aria-label={t('pricingPage.availablePlans')} style={{ background: 'transparent' }}>
            {displayedPlans.map((plan) => {
              const content = plan.content;
              const planName = content.name || plan.name;
              const ctaHref = getPlanCtaHref(plan);
              const badge = content.badge || (plan.isFeatured ? t('pricingPage.recommended') : null);
              // Trial and Enterprise have one price line: their secondary label is always shown.
              const showSecondary = Boolean(content.price_secondary_label)
                && (selectedBilling === 'annual' || !content.price_monthly_label);

              return (
              <article key={String(plan.id)} className={`feature-card pricing-card flex h-full flex-col${plan.isFeatured ? ' pricing-card-featured' : ''}`}>
                <div className="pricing-card-top">
                  <div className="pricing-plan-title-row">
                    <p className="eyebrow" style={getDarkModeTextStyle()}>{planName}</p>
                    {badge ? (
                      <span className={`pricing-badge ${plan.isFeatured ? 'pricing-badge--featured' : 'pricing-badge--soft'}`}>{badge}</span>
                    ) : null}
                  </div>
                </div>

                <div className="pricing-price-block">
                  {content.price_prefix_label ? (
                    <p className="pricing-price-prefix" style={getDarkModeTextStyle()}>{content.price_prefix_label}</p>
                  ) : null}
                  <h2 className="pricing-price" style={getDarkModeHeadingStyle()}>
                    {plan.priceLabel}
                  </h2>
                  {showSecondary ? (
                    <p className="pricing-original" style={getDarkModeTextStyle()}>{content.price_secondary_label}</p>
                  ) : null}
                </div>
                {content.description ? <p className="pricing-description" style={getDarkModeTextStyle()}>{content.description}</p> : null}

                {Array.isArray(content.features) && content.features.length > 0 ? (
                  <ul className="pricing-feature-list">
                    {content.features.map((item, index) => (
                      <li key={`${plan.id}-${index}`} style={getDarkModeTextStyle()}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="pricing-actions pricing-actions--card mt-auto">
                  <Link
                    href={withLocalePath(ctaHref)}
                    className={plan.isFeatured
                      ? 'btn-primary pricing-cta pricing-cta--main cta-surface'
                      : 'btn-secondary pricing-cta pricing-cta--outline'}
                  >
                    {content.cta_label || plan.cta_label}
                  </Link>
                </div>
              </article>
            );
            })}
            </section>
            <p className="pricing-terms-note" style={getDarkModeTextStyle()}>{t('pricingPage.unlimitedSessionsNote')}</p>
          </div>
        ) : null}

        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-faq reveal-up" aria-label={t('pricingPage.faqTitle')}>
            <h2 style={getDarkModeHeadingStyle()}>{t('pricingPage.faqTitle')}</h2>
            <div className="pricing-faq__grid">
              {FAQ_ITEMS.map(({ q, a }) => (
                <article key={q} className="pricing-faq__item">
                  <h3 style={getDarkModeHeadingStyle()}>{t(q)}</h3>
                  <p style={getDarkModeTextStyle()}>{t(a)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-footer-cta reveal-up" aria-label={t('pricingPage.salesSupport')}>
            <div className="pricing-footer-cta__inner">
              <div className="pricing-footer-cta__copy">
                <p className="eyebrow" style={getDarkModeTextStyle()}>{t('pricingPage.needSupport')}</p>
                <h2 style={getDarkModeHeadingStyle()}>{t('pricingPage.ourTeamRepliesWithinAFew')}</h2>
              </div>
              <Link href={withLocalePath('/contact')} className="btn-primary pricing-footer-cta__button cta-surface">{t('pricingPage.talkToAnExpert')}</Link>
            </div>
          </section>
        ) : null}
      </main>
      <style jsx global>{`
        .pricing-page {
          width: min(100%, 80rem);
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          background: var(--bg);
        }

        .pricing-page .pricing-hero {
          margin-bottom: 1.5rem;
          padding: 1.25rem 0.5rem;
          background: none;
        }

        .pricing-page .pricing-hero__copy {
          display: grid;
          justify-items: center;
          gap: 0.75rem;
          width: min(100%, 46rem);
          margin: 0 auto;
          text-align: center;
        }

        .pricing-page .pricing-hero .eyebrow {
          margin: 0;
          padding: 0.42rem 0.8rem;
          border: 1px solid rgba(47, 98, 255, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          color: #3157c8 !important;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .pricing-page .pricing-hero h1 {
          max-width: 24ch;
          margin: 0;
          font-size: clamp(1.8rem, 3.4vw, 2.6rem);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: -0.03em;
          text-wrap: balance;
        }

        .pricing-page .pricing-hero__lede {
          margin: 0;
          max-width: 49rem;
          font-size: clamp(1rem, 1.8vw, 1.15rem);
          line-height: 1.75;
          color: var(--text-muted, #cbd5e1);
        }

        .pricing-page .pricing-hero__context {
          max-width: 58ch;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: none;
          font-size: 1.02rem;
          line-height: 1.7;
        }

        .pricing-page .pricing-controls {
          margin-bottom: 1.5rem;
        }

        .pricing-page .pricing-controls__row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.75rem 1rem;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }

        .pricing-page .pricing-how {
          width: min(100%, 60rem);
          margin: 0 auto 1.75rem;
          padding: 1.1rem 1.25rem;
          border: 1px solid rgba(47, 98, 255, 0.14);
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(241, 246, 255, 0.9), rgba(255, 255, 255, 0.96));
          text-align: center;
        }

        .pricing-page .pricing-how__steps {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.75rem 1.25rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .pricing-page .pricing-how__steps li {
          display: grid;
          gap: 0.15rem;
          min-width: 9rem;
        }

        .pricing-page .pricing-how__steps strong {
          font-size: 1.6rem;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #1f46d2;
        }

        .pricing-page .pricing-how__steps span {
          font-size: 0.88rem;
          line-height: 1.4;
        }

        .pricing-page .pricing-how__arrow {
          min-width: 0;
          font-size: 1.4rem;
          color: rgba(47, 98, 255, 0.5);
        }

        [dir='rtl'] .pricing-page .pricing-how__arrow {
          transform: scaleX(-1);
        }

        .pricing-page .pricing-how__note {
          margin: 0.85rem 0 0;
          font-size: 0.88rem;
          line-height: 1.5;
        }

        .pricing-page .pricing-grid-wrap {
          width: 100%;
          padding: 0;
        }

        .pricing-page .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(17rem, 22rem));
          justify-content: center;
          align-items: stretch;
          width: 100%;
        }

        .pricing-page .pricing-cta--outline {
          border: 1.5px solid rgba(47, 98, 255, 0.35);
          background: rgba(255, 255, 255, 0.9);
          color: #1f46d2;
          box-shadow: none;
        }

        .pricing-page .pricing-cta--outline:hover {
          background: rgba(47, 98, 255, 0.08);
          border-color: #1f46d2;
        }

        .pricing-page .pricing-badge--soft {
          border: 1px solid rgba(47, 98, 255, 0.2);
          background: rgba(47, 98, 255, 0.08);
          color: #1f46d2;
          font-weight: 700;
        }

        .pricing-page .pricing-price-block {
          display: grid;
          gap: 0.3rem;
          min-height: 5.6rem;
          align-content: start;
        }

        .pricing-page .pricing-price-prefix {
          margin: 0;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .pricing-page .pricing-faq {
          width: min(100%, 64rem);
          margin: 2.5rem auto 0;
        }

        .pricing-page .pricing-faq h2 {
          margin: 0 0 1rem;
          font-size: clamp(1.3rem, 2.2vw, 1.7rem);
          letter-spacing: -0.02em;
          text-align: center;
        }

        .pricing-page .pricing-faq__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
          gap: 1rem;
        }

        .pricing-page .pricing-faq__item {
          padding: 1.1rem 1.2rem;
          border: 1px solid rgba(47, 70, 120, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
        }

        .pricing-page .pricing-faq__item h3 {
          margin: 0 0 0.45rem;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .pricing-page .pricing-faq__item p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .pricing-page .pricing-terms-note {
          margin: 1.25rem auto 0;
          font-size: 0.85rem;
          text-align: center;
        }

        .pricing-page .pricing-terms-note a {
          color: inherit;
          text-decoration: underline;
        }

        .pricing-page .control-section {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          flex-wrap: nowrap;
        }

        .pricing-page .pricing-controls__toggle,
        .pricing-page .pricing-controls__currency {
          justify-content: flex-start;
        }

        .pricing-page .pricing-controls__label,
        .pricing-page .pricing-controls__currency label {
          margin-bottom: 0;
          min-width: max-content;
        }

        .pricing-page .pricing-controls__label,
        .pricing-page .pricing-controls__currency label {
          display: block;
          margin-bottom: 0;
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
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(47, 98, 255, 0.18);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
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
          color: #334155;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .pricing-page .toggle-btn:focus-visible,
        .pricing-page .currency-select:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--accent) 58%, transparent);
          outline-offset: 3px;
        }

        .pricing-page .toggle-btn.active {
          background: var(--accent-gradient);
          color: var(--text-on-accent, #fff);
          box-shadow: var(--button-primary-shadow);
        }

        .pricing-page .toggle-btn:not(.active):hover {
          background: rgba(47, 98, 255, 0.08);
          color: #1f46d2;
        }

        .pricing-page .toggle-savings-badge {
          padding: 0.16rem 0.5rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 700;
          background: color-mix(in srgb, #34d399 16%, transparent);
          color: #34d399;
          border: 1px solid color-mix(in srgb, #34d399 30%, transparent);
        }

        .pricing-page .toggle-btn.active .toggle-savings-badge {
          background: color-mix(in srgb, var(--text-on-accent) 24%, transparent);
          color: var(--text-on-accent, #fff);
          border-color: color-mix(in srgb, var(--text-on-accent) 32%, transparent);
        }

        .pricing-page .currency-select {
          min-height: 2.85rem;
          padding: 0 1rem;
          border-radius: 14px;
          border: 1px solid rgba(47, 98, 255, 0.2);
          background: rgba(255, 255, 255, 0.95);
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .pricing-page .currency-select:hover,
        .pricing-page .currency-select:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.95);
          color: #0f172a;
          border-color: var(--control-border-strong);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 14%, transparent);
        }

        .pricing-page .pricing-grid {
          align-items: stretch;
          gap: 1.25rem;
        }

        .pricing-page .pricing-card {
          min-height: 100%;
          padding: 1.55rem 1.4rem 1.35rem;
          border-radius: 24px;
          gap: 1rem;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(47, 70, 120, 0.12);
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.07), 0 1px 0 rgba(255, 255, 255, 0.7) inset;
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        }

        .pricing-page .pricing-card::before {
          content: '';
          position: absolute;
          inset: 0 0 auto;
          height: 5px;
          pointer-events: none;
          background: linear-gradient(90deg, #3b6cff, #9b75ff);
          opacity: 0;
          transition: opacity 180ms ease;
        }

        .pricing-page .pricing-card:hover {
          transform: translateY(-4px);
          border-color: rgba(47, 98, 255, 0.28);
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.11);
        }

        .pricing-page .pricing-card:hover::before,
        .pricing-page .pricing-card-featured::before {
          opacity: 1;
        }

        .pricing-page .pricing-card-top {
          min-height: 3.25rem;
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 0.45rem;
        }

        .pricing-page .pricing-plan-title-row {
          width: 100%;
          margin-top: 0;
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }

        .pricing-page .pricing-card-top .eyebrow {
          margin: 0;
          color: #25324a !important;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.015em;
        }

        .pricing-page .pricing-badge,
        .pricing-page .pricing-discount-badge {
          font-size: 0.72rem;
          line-height: 1;
          padding: 0.36rem 0.65rem;
          border-radius: 999px;
          align-self: flex-start;
        }

        .pricing-page .pricing-card .pricing-cta {
          margin-top: auto;
        }

        .pricing-page .pricing-actions {
          width: 100%;
          display: flex;
          align-items: stretch;
          margin-top: auto;
          background: transparent;
          border: 0;
          padding: 0;
        }

        .pricing-page .pricing-badge--featured {
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 12px 26px rgba(47, 98, 255, 0.24);
        }

        .pricing-page .pricing-price {
          margin: 0;
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
          flex-wrap: wrap;
          font-size: clamp(2.15rem, 2.8vw, 2.7rem);
          line-height: 1;
          letter-spacing: -0.055em;
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
          margin: 0 0 0.75rem;
          padding: 0;
          list-style: none;
          display: grid;
          align-content: start;
          gap: 0.6rem;
          flex: 1;
        }

        .pricing-page .pricing-feature-list li {
          position: relative;
          padding-inline-start: 1.55rem;
          font-size: 0.92rem;
          line-height: 1.5;
          color: var(--text-muted, #cbd5e1);
        }

        .pricing-page .pricing-feature-list li::before {
          content: '✓';
          position: absolute;
          inset-inline-start: 0;
          top: 0.08rem;
          display: grid;
          width: 1.05rem;
          height: 1.05rem;
          place-items: center;
          border-radius: 999px;
          background: #e8f8f1;
          color: #11835b;
          font-size: 0.68rem;
          font-weight: 900;
        }

        .pricing-page .pricing-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 0.75rem;
          min-height: 1.7rem;
          margin-top: 0.1rem;
          padding-top: 0.35rem;
          border-top: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.14));
          color: var(--text-subtle, #94a3b8);
          font-size: 0.8rem;
        }

        .pricing-page .pricing-actions {
          display: flex;
          align-items: stretch;
          margin-top: 0.25rem;
        }

        .pricing-page .pricing-actions--card {
          width: 100%;
          padding: 0;
          margin-top: auto;
          background: transparent;
          border: 0;
          box-shadow: none;
          border-radius: 0;
        }

        .pricing-page .pricing-actions--card > * {
          width: 100%;
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
          box-shadow: var(--button-primary-shadow);
        }

        .pricing-page .pricing-cta--enterprise {
          border: 1px solid var(--surface-soft-border, rgba(148, 163, 184, 0.28));
          background: var(--surface-control);
        }

        .pricing-page .pricing-cta--enterprise:hover {
          background: var(--surface-control-hover);
          border-color: var(--control-border-strong);
        }

        .pricing-page .pricing-card-featured {
          border-color: rgba(47, 98, 255, 0.6);
          border-width: 2px;
          background: linear-gradient(165deg, rgba(241, 246, 255, 0.98), #ffffff 42%);
          box-shadow: 0 22px 50px rgba(47, 98, 255, 0.15), 0 0 0 1px rgba(47, 98, 255, 0.1);
          transform: translateY(-5px);
        }

        .pricing-page .pricing-card-featured .pricing-badge--featured {
          background: var(--accent-gradient);
          color: var(--text-on-accent, #fff);
          border-color: color-mix(in srgb, var(--text-on-accent) 14%, transparent);
        }

        .pricing-page .pricing-footer-cta {
          margin-top: 2.25rem;
          padding: 0;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          overflow: visible;
        }

        .pricing-page .pricing-footer-cta__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem 1.5rem;
          width: min(100%, 72rem);
          margin: 0 auto;
          padding: 1.55rem 1.65rem;
          border: 1px solid rgba(47, 98, 255, 0.2);
          border-radius: 20px;
          background:
            radial-gradient(circle at 92% 0%, rgba(53, 160, 255, 0.12), transparent 34%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.96));
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .pricing-page .pricing-footer-cta__copy {
          display: grid;
          gap: 0.45rem;
          width: min(100%, 58rem);
          max-width: none;
        }

        .pricing-page .pricing-footer-cta__copy h2 {
          margin: 0;
          font-size: clamp(1.2rem, 2vw, 1.55rem);
          line-height: 1.25;
          letter-spacing: -0.02em;
          text-wrap: balance;
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page {
          background:
            radial-gradient(ellipse 60% 45% at 8% 0%, rgba(53, 160, 255, 0.12) 0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 92% 100%, rgba(124, 58, 237, 0.1) 0%, transparent 55%),
            var(--bg);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-proof-pill,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .currency-select,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-card {
          border-color: var(--surface-soft-border, rgba(148, 163, 184, 0.16));
          background: var(--surface-panel);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-controls,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-controls__row,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .toggle-group--compact {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none;
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-proof-pill,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .toggle-btn,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .currency-select {
          color: var(--text-strong, #e2e8f0);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-card-top .eyebrow {
          color: var(--text-strong, #e2e8f0) !important;
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-card-featured {
          background: var(--surface-panel);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-hero .eyebrow {
          border-color: var(--surface-soft-border);
          background: var(--surface-panel);
          color: var(--text-strong, #e2e8f0) !important;
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-hero__context {
          border-color: var(--surface-soft-border);
          background: color-mix(in srgb, var(--surface-panel) 76%, transparent);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-how,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-faq__item {
          border-color: var(--surface-soft-border, rgba(148, 163, 184, 0.16));
          background: var(--surface-panel);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-how__steps strong,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-cta--outline,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-badge--soft {
          color: var(--text-strong, #e2e8f0);
        }

        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-cta--outline,
        :is(html[data-theme='dark'], body[data-theme='dark'], .dark) .pricing-page .pricing-badge--soft {
          background: var(--surface-control);
          border-color: var(--surface-soft-border-strong, rgba(148, 163, 184, 0.3));
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
            min-height: 32rem;
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
            padding: 0.5rem 0.75rem 2.5rem;
          }

          .pricing-page .pricing-hero {
            margin-bottom: 1.25rem;
            padding: 1rem 0;
          }

          .pricing-page .pricing-footer-cta__inner {
            padding: 1rem;
            border-radius: 18px;
          }

          .pricing-page .pricing-controls__row {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 0.6rem;
            justify-items: center;
          }

          .pricing-page .pricing-how__steps {
            flex-direction: column;
          }

          .pricing-page .pricing-how__arrow,
          [dir='rtl'] .pricing-page .pricing-how__arrow {
            transform: rotate(90deg);
          }

          .pricing-page .pricing-controls__toggle {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 0.5rem;
            width: 100%;
          }

          .pricing-page .toggle-group--compact {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100%;
          }

          .pricing-page .toggle-btn {
            justify-content: center;
            min-width: 0;
            padding-inline: 0.5rem;
          }

          .pricing-page .pricing-controls__currency {
            display: flex;
            justify-content: space-between;
            width: 100%;
            gap: 0.75rem;
          }

          .pricing-page .pricing-controls__label,
          .pricing-page .pricing-controls__currency label {
            font-size: 0.68rem;
          }

          .pricing-page .currency-select {
            min-width: 6rem;
          }

          .pricing-page .pricing-card {
            padding: 1.2rem 1rem 1.05rem;
            border-radius: 18px;
          }

          .pricing-page .pricing-price {
            font-size: 2rem;
          }

          .pricing-page .pricing-card-featured {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pricing-page .pricing-card,
          .pricing-page .pricing-card::before {
            transition: none;
          }
        }
      `}</style>
      <Footer />
    </>
  );
}
