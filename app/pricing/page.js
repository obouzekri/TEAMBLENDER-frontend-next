"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
};

const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

function formatPriceCents(priceCents, currency) {
  const amount = Number(priceCents || 0) / 100;
  const currencyCode = String(currency || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat('fr-FR', {
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
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');

  useEffect(() => {
    async function loadPlans() {
      try {
        setError('');
        const response = await fetch(getApiUrl('/pricing-plans'));
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error('Impossible de charger la tarification.');
        }
        const list = Array.isArray(payload) ? payload : [];
        setPlans(list);
      } catch (err) {
        setError(err.message || 'Erreur de chargement de la tarification.');
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

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

  return (
    <>
      <TopNav />
      <main className="shell pricing-page">
        <section className="pricing-hero reveal-up" aria-label="Tarification TEAMSPARK">
          <p className="eyebrow">Tarification</p>
          <h1>Des formules simples pour faire grandir vos sessions d'équipe.</h1>
          <p>
            Commencez avec une offre légère, puis montez en puissance avec plus de capacités,
            d'accompagnement et de personnalisation.
          </p>
        </section>

        {/* Billing Cycle & Currency Selector */}
        {!loading && sortedPlans.length > 0 ? (
          <section className="pricing-controls reveal-up" aria-label="Options d'affichage">
            <div className="controls-group">
              <div className="control-section">
                <label>Fréquence de facturation</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${selectedBilling === 'monthly' ? 'active' : ''}`}
                    onClick={() => setSelectedBilling('monthly')}
                  >
                    Mensuel
                  </button>
                  <button
                    className={`toggle-btn ${selectedBilling === 'annual' ? 'active' : ''}`}
                    onClick={() => setSelectedBilling('annual')}
                  >
                    Annuel
                  </button>
                </div>
              </div>

              <div className="control-section">
                <label htmlFor="currency-select">Devise</label>
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
            <p>Chargement des formules en cours...</p>
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
            <h2>Formules en cours de finalisation</h2>
            <p>
              Notre équipe prépare les offres. Contactez-nous pour recevoir une proposition adaptée à votre contexte.
            </p>
            <div className="hero-actions">
              <Link href="/contact" className="btn-primary">Demander une proposition</Link>
              <Link href="/signup" className="btn-secondary">Créer un compte</Link>
            </div>
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length > 0 ? (
          <section className="pricing-grid reveal-up" aria-label="Formules disponibles">
            {displayedPlans.map((plan) => (
              <article key={String(plan.id)} className={`feature-card pricing-card${plan.highlighted ? ' pricing-card-featured' : ''}`}>
                {plan.highlighted ? <span className="pricing-badge">Recommandé</span> : null}
                {plan.discountPercentage > 0 && (selectedBilling === 'annual' || selectedBilling === 'yearly') ? (
                  <span className="pricing-discount-badge">Économisez {plan.discountPercentage}%</span>
                ) : null}
                <p className="eyebrow">{plan.name}</p>
                <h2>
                  {formatPriceCents(plan.displayPriceCents, selectedCurrency)}
                  <span>{selectedBilling === 'annual' ? '/an' : '/mois'}</span>
                </h2>
                {plan.originalPriceCents ? (
                  <p className="pricing-original">
                    <s>{formatPriceCents(plan.originalPriceCents, selectedCurrency)}</s>
                  </p>
                ) : null}
                {plan.description ? <p>{plan.description}</p> : null}

                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                  <ul className="pricing-feature-list">
                    {plan.features.map((item, index) => (
                      <li key={`${plan.id}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="pricing-meta-row">
                  {plan.max_users ? <span>{plan.max_users} utilisateurs max</span> : null}
                  {plan.max_sessions_per_month ? <span>{plan.max_sessions_per_month} sessions / mois</span> : null}
                  {plan.trial_days ? <span>{plan.trial_days} jours d'essai</span> : null}
                  {plan.support_level ? <span>Support {plan.support_level}</span> : null}
                </div>

                <div className="hero-actions">
                  <Link href="/signup" className="btn-primary">{plan.cta_label || 'Choisir cette formule'}</Link>
                  <Link href="/contact" className="btn-secondary">Parler à l'équipe</Link>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && !error && sortedPlans.length > 0 ? (
          <section className="pricing-footer-cta reveal-up">
            <p>Une question sur les formules ?</p>
            <Link href="/contact" className="btn-secondary">Contacter l'équipe</Link>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
