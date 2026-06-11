"use client";

import { useEffect, useMemo, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import useToast from '@/lib/useToast';
import {
  listPricingPlans,
  startBillingCheckout,
  createProRequest,
  getStoredCurrentUser,
} from '@/lib/account';
import useI18n from '@/lib/i18n/useI18n';

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

function normalizeDisplayName(user) {
  if (!user) return '';
  const first = String(user.first_name || '').trim();
  const last = String(user.last_name || '').trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  return String(user.email || '').trim();
}

export default function CheckoutPage() {
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const { t, locale, withLocalePath } = useI18n();

  const [guard, setGuard] = useState({ loading: true, allowed: false, user: null });
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeMethod, setActiveMethod] = useState(null); // 'paypal' | 'bank_transfer'
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [wireNote, setWireNote] = useState('');
  const [paypalRedirectUrl, setPaypalRedirectUrl] = useState(null);

  // Auth guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const current = getStoredCurrentUser?.() || null;
    if (!token || !current) {
      window.location.replace(withLocalePath('/login'));
      return;
    }
    setGuard({ loading: false, allowed: true, user: current });
  }, []);

  // Read params and load plans
  useEffect(() => {
    if (!guard.allowed) return;
    const params = new URLSearchParams(window.location.search);
    const planId = String(params.get('plan_id') || '').trim();
    const method = String(params.get('method') || '').trim();
    if (method === 'paypal' || method === 'bank_transfer') {
      setActiveMethod(method);
    }
    listPricingPlans()
      .then((data) => {
        const allPlans = Array.isArray(data) ? data : [];
        setPlans(allPlans);
        if (planId) {
          const found = allPlans.find((p) => String(p.id) === planId);
          if (found) setSelectedPlan(found);
        }
        if (!planId && allPlans.length > 0) {
          const proPlan = allPlans.find((p) => String(p.name || '').toLowerCase().includes('pro')) || allPlans[allPlans.length - 1];
          setSelectedPlan(proPlan);
        }
      })
      .catch(() => {
        showError(t('checkout.loadPlansError'));
      });
  }, [guard.allowed, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const userLabel = useMemo(() => normalizeDisplayName(guard.user), [guard.user]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
  }

  async function handlePaypal() {
    if (!selectedPlan?.id) { showError(t('checkout.selectPlanError')); return; }
    if (processing) return;
    setProcessing(true);
    try {
      const response = await startBillingCheckout({ pricing_plan_id: selectedPlan.id, method: 'paypal' });
      const mode = String(response?.mode || '').trim().toLowerCase();
      const checkoutUrl = String(response?.url || response?.payment?.checkout_url || '').trim();
      if (mode === 'paypal_redirect' && checkoutUrl) {
        setPaypalRedirectUrl(checkoutUrl);
        // Auto-redirect after 1.5s; fallback button visible immediately
        setTimeout(() => {
          window.location.assign(checkoutUrl);
        }, 1500);
        return;
      }

      // Avoid misleading UX: if backend falls back to manual mode, do not present a fake PayPal redirect.
      if (mode && mode !== 'paypal_redirect') {
        showError(response?.message || t('checkout.paypalConfigError'));
        return;
      }

      showError(t('checkout.paypalNoUrlError'));
    } catch (err) {
      showError(err.message || t('checkout.paypalGenericError'));
    } finally {
      setProcessing(false);
    }
  }

  async function handleBankTransfer(event) {
    event.preventDefault();
    if (!selectedPlan?.id) { showError(t('checkout.selectPlanError')); return; }
    if (processing) return;
    setProcessing(true);
    try {
      const response = await createProRequest({
        pricing_plan_id: selectedPlan.id,
        method: 'bank_transfer',
        note: wireNote || '',
      });
      const reference = String(response?.reference || '').trim();
      const supportEmail = String(response?.support?.email || 'contact@teamblender.io').trim();
      setConfirmed(true);
      showSuccess(t('checkout.bankRequestSuccess', {
        ref: reference ? t('checkout.bankRef', { value: reference }) : '',
        email: supportEmail
      }));
    } catch (err) {
      showError(err.message || t('checkout.bankRequestError'));
    } finally {
      setProcessing(false);
    }
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('checkout.loading')}</h1>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className="shell auth-page checkout-page">

        {/* ─── PayPal redirect loading screen ─── */}
        {paypalRedirectUrl ? (
          <div className="paypal-redirect-wrap" role="status" aria-live="polite">
            <div className="paypal-redirect-card">
              <div className="paypal-redirect-card__icon" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="12" fill="#EEF4FF"/>
                  <path d="M20 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 4a1 1 0 1 1 2 0v4a1 1 0 0 1-.293.707l-2 2a1 1 0 0 1-1.414-1.414L19 19.586V16z" fill="#2F62FF"/>
                  <path d="M28 20a1 1 0 0 0 0 2h.5a1 1 0 0 0 0-2H28z" fill="#2F62FF" opacity=".4"/>
                </svg>
              </div>
              <div className="paypal-redirect-card__spinner" aria-hidden="true">
                <span className="paypal-spinner" />
              </div>
              <h2 className="paypal-redirect-card__title">{t('checkout.redirectTitle')}</h2>
              <p className="paypal-redirect-card__desc">
                {t('checkout.redirectDescription')}
              </p>
              {selectedPlan ? (
                <div className="paypal-redirect-card__plan">
                  <span className="paypal-redirect-card__plan-name">{selectedPlan.name}</span>
                  <span className="paypal-redirect-card__plan-price">
                    {formatPriceCents(selectedPlan.price_cents, selectedPlan.currency, locale)}<span>/mois</span>
                  </span>
                </div>
              ) : null}
              <p className="paypal-redirect-card__status">{t('checkout.redirectInProgress')}</p>
              <a
                href={paypalRedirectUrl}
                className="btn-primary paypal-redirect-card__btn"
                rel="noopener noreferrer"
              >
                {t('checkout.continuePaypal')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <p className="paypal-redirect-card__trust">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5l3.5-.5L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                {t('checkout.paypalTrust')}
              </p>
            </div>
          </div>
        ) : (
          <>
        <section className="checkout-hero">
          <p className="eyebrow">{t('checkout.heroEyebrow')}</p>
          <h1>{t('checkout.heroTitle')}</h1>
          <p>{t('checkout.heroBody')}</p>
        </section>

        {/* Plan selector */}
        {plans.length > 0 ? (
          <div className="checkout-plan-selector">
            <p className="eyebrow">{t('checkout.selectedPlanEyebrow')}</p>
            <div className="checkout-plan-tabs">
              {plans.map((plan) => (
                <button
                  key={String(plan.id)}
                  type="button"
                  className={`checkout-plan-tab ${selectedPlan && String(selectedPlan.id) === String(plan.id) ? 'is-active' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <span className="checkout-plan-tab__name">{plan.name}</span>
                  <span className="checkout-plan-tab__price">{formatPriceCents(plan.price_cents, plan.currency, locale)}/mois</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Selected plan summary */}
        {selectedPlan ? (
          <div className="checkout-plan-summary">
            <div className="checkout-plan-summary__info">
              <strong>{selectedPlan.name}</strong>
              {selectedPlan.description ? <p>{selectedPlan.description}</p> : null}
            </div>
            <div className="checkout-plan-summary__price">
              {formatPriceCents(selectedPlan.price_cents, selectedPlan.currency, locale)}
              <span>/mois</span>
            </div>
          </div>
        ) : null}

        {/* Payment methods */}
        {confirmed ? (
          <section className="feature-card checkout-confirmed">
            <p className="eyebrow">{t('checkout.requestSentEyebrow')}</p>
            <h2>{t('checkout.requestSentTitle')}</h2>
            <p>{t('checkout.requestSentBody')}</p>
            <div className="participant-form-actions">
              <a href={withLocalePath('/account')} className="btn-primary">{t('checkout.backToAccount')}</a>
              <a href={withLocalePath('/app')} className="btn-secondary">{t('checkout.goToApp')}</a>
            </div>
          </section>
        ) : (
          <div className="checkout-methods">

            {/* PayPal */}
            <section
              className={`checkout-method-card ${activeMethod === 'paypal' ? 'checkout-method-card--active' : ''}`}
              onClick={() => setActiveMethod('paypal')}
              aria-selected={activeMethod === 'paypal'}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveMethod('paypal')}
            >
              <div className="checkout-method-card__header">
                <div className="checkout-method-card__radio">
                  <span className={activeMethod === 'paypal' ? 'checkout-radio--checked' : 'checkout-radio'} />
                </div>
                <div>
                  <strong>{t('checkout.paypalMethodTitle')}</strong>
                  <p>{t('checkout.paypalMethodBody')}</p>
                </div>
              </div>
              {activeMethod === 'paypal' ? (
                <div className="checkout-method-card__body">
                  <button
                    type="button"
                    className="btn-primary checkout-paypal-btn"
                    onClick={(e) => { e.stopPropagation(); handlePaypal(); }}
                    disabled={processing || !selectedPlan}
                  >
                    {processing ? t('checkout.paypalRedirectCta') : t('checkout.paypalContinueCta')}
                  </button>
                  <p className="checkout-secure-note">{t('checkout.paypalSecureNote')}</p>
                </div>
              ) : null}
            </section>

            {/* Virement bancaire */}
            <section
              className={`checkout-method-card ${activeMethod === 'bank_transfer' ? 'checkout-method-card--active' : ''}`}
              onClick={() => setActiveMethod('bank_transfer')}
              aria-selected={activeMethod === 'bank_transfer'}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveMethod('bank_transfer')}
            >
              <div className="checkout-method-card__header">
                <div className="checkout-method-card__radio">
                  <span className={activeMethod === 'bank_transfer' ? 'checkout-radio--checked' : 'checkout-radio'} />
                </div>
                <div>
                  <strong>{t('checkout.wireMethodTitle')}</strong>
                  <p>{t('checkout.wireMethodBody')}</p>
                </div>
              </div>
              {activeMethod === 'bank_transfer' ? (
                <div className="checkout-method-card__body">
                  <form onSubmit={handleBankTransfer}>
                    <div className="participant-form-grid">
                      <div className="account-field-card account-field-card--full">
                        <label>
                          {t('checkout.optionalMessage')}
                          <textarea
                            className="checkout-textarea"
                            value={wireNote}
                            onChange={(e) => setWireNote(e.target.value)}
                            placeholder={t('checkout.wirePlaceholder')}
                            rows={3}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="participant-form-actions" style={{ marginTop: '1rem' }}>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={processing || !selectedPlan}
                      >
                        {processing ? t('checkout.sending') : t('checkout.sendRequest')}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </section>

          </div>
        )}

        <div className="checkout-back-link">
          <a href={withLocalePath('/account')}>&larr; {t('checkout.backToAccount')}</a>
        </div>
          </>
        )}

      </main>
      <Footer />
    </>
  );
}
