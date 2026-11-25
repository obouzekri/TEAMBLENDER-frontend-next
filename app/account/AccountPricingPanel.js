"use client";

import { getAccountFeatureLabel, getAccountPlanCopy, getAccountPlanPriceLabel } from '@/lib/account-page/pricing';

// Onglet « Formules » de la page Compte : rendu seul, état et actions restent dans page.js.
export default function AccountPricingPanel({
  activePlan,
  activeTab,
  billingStatusHint,
  currentPlanId,
  currentPlanLabel,
  handleChoosePlan,
  isFreePlanActive,
  locale,
  plans,
  selectedBilling,
  setSelectedBilling,
  t,
  usageSubtitle,
}) {
  return (
    <section id="account-pricing" role="tabpanel" aria-labelledby="account-tab-pricing" tabIndex={0} className={`account-saas-card account-panel ${activeTab === 'pricing' ? 'is-active' : ''}`} hidden={activeTab !== 'pricing'}>
        <header className="account-saas-card__header">
            <h2 className="account-saas-card__title">{t('account.pricingHeaderTitle')}</h2>
            <p className="account-saas-card__subtitle">{t('account.pricingHeaderDescription')}</p>
        </header>
      <div className="account-saas-card__body">

        <div className="account-pricing-controls" aria-label="Options de facturation et d'affichage">
          <div className="account-pricing-control-group">
            <span className="account-pricing-control-label">{t('account.billingFrequency')}</span>
            <div className="account-pricing-toggle" role="group" aria-label={t('account.billingFrequency')}>
              <button type="button" className={selectedBilling === 'monthly' ? 'is-active' : ''} onClick={() => setSelectedBilling('monthly')}>
                {t('account.monthly')}
              </button>
              <button type="button" className={selectedBilling === 'annual' ? 'is-active' : ''} onClick={() => setSelectedBilling('annual')}>
                {t('account.annual')}
              </button>
            </div>
          </div>
        </div>

        <div className="account-usage-banner" aria-label="Résumé d’utilisation">
          <div className="account-usage-banner__head">
            <p className="account-usage-banner__plan">{t('account.currentPlanLabel')} <strong>{currentPlanLabel}</strong></p>
          </div>

          <p className="account-usage-banner__details">{usageSubtitle}</p>
          {billingStatusHint ? <p className="account-usage-banner__hint">{billingStatusHint}</p> : null}
        </div>

        {plans.length > 0 ? (
          <div className="account-plan-cards-grid account-plan-cards-grid--aligned">
            {plans.map((plan, planIndex) => {
              const planId = String(plan.id);
                const planCopy = getAccountPlanCopy(plan, locale);
              const isCurrent = planId === String(currentPlanId || '');
                const isFreePlan = plan.plan_code === 'trial' || String(plan.slug || plan.name || '').toLowerCase().includes('free') || Number(plan?.price_cents || 0) === 0;
              const currentPriceCents = Number(activePlan?.price_cents || 0);
              const planPriceCents = Number(plan?.price_cents || 0);
              const isUpgrade = isFreePlanActive ? !isFreePlan : planPriceCents > currentPriceCents;
                const priceFmt = getAccountPlanPriceLabel(plan, selectedBilling, locale);
                const actionLabel = planCopy.ctaLabel || (isUpgrade ? t('account.upgradeToPro') : t('account.changePlan'));
              return (
                <article
                  key={planId}
                  className={[
                    'pricing-card account-pricing-card',
                    isCurrent ? 'account-pricing-card--current' : '',
                      plan.plan_code === 'enterprise' ? 'account-pricing-card--pro' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <div className="pricing-card-top">
                    {isCurrent ? <span className="account-current-badge">{t('account.yourPlan')}</span> : null}
                    <div className="account-pricing-title-row">
                      <p className="eyebrow">{planCopy.displayName}</p>
                        {planCopy.badge ? <span className="pricing-badge account-pricing-badge">{planCopy.badge}</span> : null}
                    </div>
                  </div>
                  <h3 className="pricing-price account-pricing-price">
                    {priceFmt}
                  </h3>
                  {selectedBilling === 'annual' && planCopy.priceSecondaryLabel ? <p className="pricing-tax-note">{planCopy.priceSecondaryLabel}</p> : null}
                  {planCopy.description ? <p className="pricing-description">{planCopy.description}</p> : null}
                  {Array.isArray(planCopy.features) && planCopy.features.length > 0 ? (
                    <ul className="pricing-feature-list">
                      {planCopy.features.map((item, i) => (
                        <li key={i}>{getAccountFeatureLabel(item)}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="pricing-meta-row">
                    {planCopy.meta.map((item, index) => <span key={`${planId}-meta-${index}`}>{item}</span>)}
                  </div>
                  {isCurrent ? (
                    <div className="pricing-actions account-plan-card-actions">
                      <button type="button" className="account-plan-card-actions__current pricing-cta" disabled>
                        {t('account.currentPlanButton')}
                      </button>
                    </div>
                  ) : (
                    <div className="pricing-actions account-plan-card-actions">
                      <button type="button" className="btn-primary pricing-cta pricing-cta--main cta-surface account-plan-card-actions__primary" onClick={() => handleChoosePlan(plan.id)}>
                        {actionLabel}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="field-help">{t('account.noPlans')}</p>
        )}

      </div>
    </section>
  );
}
