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

function normalizeDisplayName(user) {
  if (!user) return '';
  const first = String(user.first_name || '').trim();
  const last = String(user.last_name || '').trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  return String(user.email || '').trim();
}

export default function CheckoutPage() {
  const { toasts, showSuccess, showError, removeToast } = useToast();

  const [guard, setGuard] = useState({ loading: true, allowed: false, user: null });
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeMethod, setActiveMethod] = useState(null); // 'paypal' | 'bank_transfer'
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [wireNote, setWireNote] = useState('');

  // Auth guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const current = getStoredCurrentUser?.() || null;
    if (!token || !current) {
      window.location.replace('/login');
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
        showError('Impossible de charger les formules disponibles.');
      });
  }, [guard.allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const userLabel = useMemo(() => normalizeDisplayName(guard.user), [guard.user]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
  }

  async function handlePaypal() {
    if (!selectedPlan?.id) { showError('Sélectionnez une formule.'); return; }
    if (processing) return;
    setProcessing(true);
    try {
      const response = await startBillingCheckout({ pricing_plan_id: selectedPlan.id, method: 'paypal' });
      const checkoutUrl = String(response?.url || response?.payment?.checkout_url || '').trim();
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      showError('Aucune URL PayPal reçue. Réessayez ou contactez le support.');
    } catch (err) {
      showError(err.message || 'Paiement PayPal impossible pour le moment.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleBankTransfer(event) {
    event.preventDefault();
    if (!selectedPlan?.id) { showError('Sélectionnez une formule.'); return; }
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
      showSuccess(`Demande envoyée${reference ? ` (réf. ${reference})` : ''}. Notre équipe vous contactera à ${supportEmail}.`);
    } catch (err) {
      showError(err.message || 'Envoi de la demande impossible pour le moment.');
    } finally {
      setProcessing(false);
    }
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Chargement…</h1>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className="shell auth-page checkout-page">

        <section className="checkout-hero">
          <p className="eyebrow">PAIEMENT</p>
          <h1>Choisissez votre mode de paiement</h1>
          <p>Activez votre formule en quelques secondes via PayPal, ou faites une demande de virement bancaire.</p>
        </section>

        {/* Plan selector */}
        {plans.length > 0 ? (
          <div className="checkout-plan-selector">
            <p className="eyebrow">FORMULE SÉLECTIONNÉE</p>
            <div className="checkout-plan-tabs">
              {plans.map((plan) => (
                <button
                  key={String(plan.id)}
                  type="button"
                  className={`checkout-plan-tab ${selectedPlan && String(selectedPlan.id) === String(plan.id) ? 'is-active' : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <span className="checkout-plan-tab__name">{plan.name}</span>
                  <span className="checkout-plan-tab__price">{formatPriceCents(plan.price_cents, plan.currency)}/mois</span>
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
              {formatPriceCents(selectedPlan.price_cents, selectedPlan.currency)}
              <span>/mois</span>
            </div>
          </div>
        ) : null}

        {/* Payment methods */}
        {confirmed ? (
          <section className="feature-card checkout-confirmed">
            <p className="eyebrow">DEMANDE ENVOYÉE</p>
            <h2>Merci pour votre demande !</h2>
            <p>Notre équipe va traiter votre demande et vous contacter prochainement pour confirmer l&apos;activation de votre formule.</p>
            <div className="participant-form-actions">
              <a href="/account" className="btn-primary">Retour au compte</a>
              <a href="/app" className="btn-secondary">Accéder à l&apos;application</a>
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
                  <strong>Payer avec PayPal</strong>
                  <p>Paiement immédiat et sécurisé. Votre formule est activée instantanément.</p>
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
                    {processing ? 'Redirection vers PayPal…' : 'Continuer avec PayPal →'}
                  </button>
                  <p className="checkout-secure-note">🔒 Redirection sécurisée vers PayPal. Aucune donnée bancaire n&apos;est stockée sur nos serveurs.</p>
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
                  <strong>Virement bancaire</strong>
                  <p>Envoyez une demande d&apos;activation. Notre équipe vous communique les coordonnées bancaires.</p>
                </div>
              </div>
              {activeMethod === 'bank_transfer' ? (
                <div className="checkout-method-card__body">
                  <form onSubmit={handleBankTransfer}>
                    <div className="participant-form-grid">
                      <div className="account-field-card account-field-card--full">
                        <label>
                          Message (facultatif)
                          <textarea
                            className="checkout-textarea"
                            value={wireNote}
                            onChange={(e) => setWireNote(e.target.value)}
                            placeholder="Précisez votre nom d'entreprise, référence commande, ou toute information utile…"
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
                        {processing ? 'Envoi en cours…' : 'Envoyer la demande'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </section>

          </div>
        )}

        <div className="checkout-back-link">
          <a href="/account">&larr; Retour au compte</a>
        </div>

      </main>
      <Footer />
    </>
  );
}
