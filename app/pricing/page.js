"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';
import { startBillingCheckout } from '@/lib/account';
import { startPaddleCheckout } from '@/lib/paddle';
import useI18n from '@/lib/i18n/useI18n';

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

export default function PricingPage() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [checkoutPlanId, setCheckoutPlanId] = useState('');
  const [paddleCheckoutPlanId, setPaddleCheckoutPlanId] = useState('');

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

  const displayedPlans = useMemo(() => {
    return sortedPlans.map((plan) => {
      const basePriceCents = Number(plan.price_cents || 0);
      let displayPriceCents = basePriceCents;
      let originalPriceCents = null;
      let discountPercentage = 0;

      if (selectedBilling === 'annual' || selectedBilling === 'yearly') {
        discountPercentage = Number(plan.annual_discount_percentage || 0);
        if (discountPercentage > 0) {
          originalPriceCents = basePriceCents;
          displayPriceCents = Math.round(basePriceCents * (1 - discountPercentage / 100));
        }
      }

      return {
        ...plan,
        displayPriceCents,
        originalPriceCents,
        discountPercentage,
      };
    });
  }, [sortedPlans, selectedBilling]);

  async function handlePaypalCheckout(plan) {
    const token = typeof window !== 'undefined'
      ? (window.localStorage.getItem('jwt') || window.sessionStorage.getItem('jwt') || '')
      : '';

    if (!token) {
      window.location.assign(withLocalePath(`/login?next=${encodeURIComponent('/pricing')}`));
      return;
    }

    setCheckoutPlanId(String(plan?.id || ''));
    setError('');

    try {
      const response = await startBillingCheckout({
        pricing_plan_id: plan.id,
        method: 'paypal',
        billing_cycle: selectedBilling,
      });

      const checkoutUrl = String(response?.url || response?.payment?.checkout_url || '').trim();
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      if (response?.mode === 'manual_pro_request') {
        window.location.assign(withLocalePath(`/account?source=pricing&billing=manual&reference=${encodeURIComponent(String(response?.reference || ''))}`));
        return;
      }

      throw new Error(isEn ? 'PayPal checkout is temporarily unavailable.' : 'Le paiement PayPal est temporairement indisponible.');
    } catch (err) {
      setError(err.message || (isEn ? 'PayPal payment is currently unavailable.' : 'Paiement PayPal impossible pour le moment.'));
    } finally {
      setCheckoutPlanId('');
    }
  }

  async function handlePaddleCheckout(plan) {
    const token = typeof window !== 'undefined'
      ? (window.localStorage.getItem('jwt') || window.sessionStorage.getItem('jwt') || '')
      : '';

    if (!token) {
      window.location.assign(withLocalePath(`/login?next=${encodeURIComponent('/pricing')}`));
      return;
    }

    setPaddleCheckoutPlanId(String(plan?.id || ''));
    setError('');

    try {
      await startPaddleCheckout({
        pricing_plan_id: plan.id,
        billing_cycle: selectedBilling,
        customer_email: '',
        onComplete: () => {
          window.location.assign(withLocalePath('/account?billing=paddle_success'));
        },
      });
    } catch (err) {
      setError(err.message || (isEn ? 'Paddle payment is currently unavailable.' : 'Paiement Paddle impossible pour le moment.'));
    } finally {
      setPaddleCheckoutPlanId('');
    }
  }

  return (
    <>
      <TopNav />
      <main className="shell pricing-page">
        <section className="pricing-hero feature-card reveal-up" aria-label="Tarification TeamBlender">
          <p className="eyebrow">{isEn ? 'Pricing' : 'Tarification'}</p>
          <h1>{isEn ? 'Simple plans to scale your team sessions.' : 'Des formules simples pour faire grandir vos sessions d\'équipe.'}</h1>
          <p>
            {isEn
              ? 'Start light, then scale with more capabilities, support, and customization.'
              : 'Commencez avec une offre légère, puis montez en puissance avec plus de capacités, d\'accompagnement et de personnalisation.'}
          </p>
        </section>

        {/* Billing Cycle & Currency Selector */}
        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-controls feature-card reveal-up" aria-label="Options d'affichage">
            <div className="controls-group">
              <div className="control-section">
                <label>{isEn ? 'Billing cycle' : 'Fréquence de facturation'}</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${selectedBilling === 'monthly' ? 'active' : ''}`}
                    onClick={() => setSelectedBilling('monthly')}
                  >
                    {isEn ? 'Monthly' : 'Mensuel'}
                  </button>
                  <button
                    className={`toggle-btn ${selectedBilling === 'annual' ? 'active' : ''}`}
                    onClick={() => setSelectedBilling('annual')}
                  >
                    {isEn ? 'Yearly' : 'Annuel'}
                  </button>
                </div>
              </div>

              <div className="control-section">
                <label htmlFor="currency-select">{isEn ? 'Currency' : 'Devise'}</label>
                <select
                  id="currency-select"
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="currency-select"
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
          <section className="feature-card" aria-label="Chargement des formules">
            <p>{isEn ? 'Loading plans...' : 'Chargement des formules en cours...'}</p>
          </section>
        ) : null}

        {error ? (
          <section className="feature-card" aria-label="Erreur tarification">
            <p className="form-error">{error}</p>
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length === 0 ? (
          <section className="pricing-empty reveal-up" aria-label="Aucune formule">
            <div className="pricing-empty-icon">💬</div>
            <h2>{isEn ? 'Plans are being finalized' : 'Formules en cours de finalisation'}</h2>
            <p>
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
          <section className="pricing-grid reveal-up" aria-label="Formules disponibles">
            {displayedPlans.map((plan) => (
              <article key={String(plan.id)} className={`feature-card pricing-card${plan.highlighted ? ' pricing-card-featured' : ''}`}>
                <div className="pricing-card-top">
                  {plan.highlighted ? <span className="pricing-badge">{isEn ? 'Recommended' : 'Recommandé'}</span> : null}
                  {plan.discountPercentage > 0 && (selectedBilling === 'annual' || selectedBilling === 'yearly') ? (
                    <span className="pricing-discount-badge">{isEn ? `Save ${plan.discountPercentage}%` : `Économisez ${plan.discountPercentage}%`}</span>
                  ) : null}
                  <p className="eyebrow">{plan.name}</p>
                </div>

                <h2 className="pricing-price">
                  {formatPriceCents(plan.displayPriceCents, selectedCurrency, locale)}
                  <span>{selectedBilling === 'annual' ? (isEn ? '/year' : '/an') : (isEn ? '/month' : '/mois')}</span>
                </h2>
                {plan.originalPriceCents ? (
                  <p className="pricing-original">
                    <s>{formatPriceCents(plan.originalPriceCents, selectedCurrency, locale)}</s>
                  </p>
                ) : null}
                {plan.description ? <p className="pricing-description">{plan.description}</p> : null}

                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                  <ul className="pricing-feature-list">
                    {plan.features.map((item, index) => (
                      <li key={`${plan.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="pricing-meta-row">
                  {plan.max_users ? <span>{plan.max_users} {isEn ? 'max users' : 'utilisateurs max'}</span> : null}
                  {plan.max_sessions_per_month ? <span>{plan.max_sessions_per_month} {isEn ? 'sessions / month' : 'sessions / mois'}</span> : null}
                  {plan.trial_days ? <span>{plan.trial_days} {isEn ? 'trial days' : 'jours d\'essai'}</span> : null}
                  {plan.support_level ? <span>{isEn ? 'Support' : 'Support'} {plan.support_level}</span> : null}
                </div>

                <div className="hero-actions pricing-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handlePaypalCheckout(plan)}
                    disabled={checkoutPlanId === String(plan.id)}
                  >
                    {checkoutPlanId === String(plan.id) ? (isEn ? 'Opening PayPal...' : 'Ouverture de PayPal...') : (isEn ? 'Pay with PayPal' : 'Payer avec PayPal')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handlePaddleCheckout(plan)}
                    disabled={paddleCheckoutPlanId === String(plan.id)}
                  >
                    {paddleCheckoutPlanId === String(plan.id)
                      ? (isEn ? 'Opening Paddle...' : 'Ouverture de Paddle...')
                      : (isEn ? 'Pay with Paddle' : 'Payer avec Paddle')}
                  </button>
                  <Link href={withLocalePath('/contact')} className="btn-secondary">{isEn ? 'Talk to the team' : 'Parler à l\'équipe'}</Link>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length > 0 ? (
          <section className="pricing-footer-cta feature-card reveal-up">
            <p>{isEn ? 'Any question about plans?' : 'Une question sur les formules ?'}</p>
            <Link href={withLocalePath('/contact')} className="btn-secondary">{isEn ? 'Contact the team' : 'Contacter l\'équipe'}</Link>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

