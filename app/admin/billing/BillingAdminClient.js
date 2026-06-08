'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  adminChangeUserPlan,
  adminCreateManualPayment,
  adminGenerateInvoicePdf,
  adminRefundInvoice,
  getBillingOverview,
  getBillingTimeline,
} from '@/lib/admin-billing';
import { listPricingPlans } from '@/lib/account';
import './billing.css';

function userLabel(user) {
  const first = String(user?.first_name || '').trim();
  const last = String(user?.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user?.email || `Utilisateur #${user?.id || '?'}`;
}

function money(amountCents, currency) {
  const amount = Number(amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: String(currency || 'EUR').toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${String(currency || 'EUR').toUpperCase()}`;
  }
}

export default function BillingAdminClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const [overview, timelinePayload, pricingPlans] = await Promise.all([
        getBillingOverview({ q: query, provider, status, limit: 100 }),
        getBillingTimeline(150),
        listPricingPlans(),
      ]);
      setUsers(Array.isArray(overview?.items) ? overview.items : []);
      setTimeline(Array.isArray(timelinePayload?.items) ? timelinePayload.items : []);
      setPlans(Array.isArray(pricingPlans) ? pricingPlans : []);
    } catch (err) {
      setError(err.message || 'Chargement billing impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const selectedUser = useMemo(
    () => users.find((entry) => String(entry.id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  async function handleApplyPlan() {
    if (!selectedUserId || !selectedPlanId) return;
    setError('');
    setNotice('');
    try {
      await adminChangeUserPlan(selectedUserId, {
        pricing_plan_id: selectedPlanId,
        reason: 'Admin backoffice change',
      });
      setNotice('Plan mis a jour.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Echec changement de plan.');
    }
  }

  async function handleRecordManualPayment() {
    if (!selectedUserId || !selectedPlanId) return;
    setError('');
    setNotice('');
    const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId));
    try {
      await adminCreateManualPayment(selectedUserId, {
        pricing_plan_id: selectedPlanId,
        amount_cents: Number(selectedPlan?.price_cents || 0),
        currency: selectedPlan?.currency || 'EUR',
        billing_cycle: selectedPlan?.billing_cycle || 'monthly',
        provider: 'manual',
      });
      setNotice('Paiement manuel enregistre et subscription synchronisee.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Echec enregistrement paiement manuel.');
    }
  }

  async function handleRefund(invoiceId) {
    setError('');
    setNotice('');
    try {
      await adminRefundInvoice(invoiceId, { reason: 'Refund requested by support' });
      setNotice('Facture remboursee.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Remboursement impossible.');
    }
  }

  async function handleGeneratePdf(invoiceId) {
    setError('');
    setNotice('');
    try {
      const payload = await adminGenerateInvoicePdf(invoiceId);
      if (payload?.pdf_url) {
        window.open(payload.pdf_url, '_blank', 'noopener,noreferrer');
      }
      setNotice('PDF facture genere.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Generation PDF impossible.');
    }
  }

  return (
    <main className="admin-billing-shell">
      <header className="admin-billing-header">
        <div>
          <p className="eyebrow">Backoffice Paiements</p>
          <h1>Abonnements, facturation et operations</h1>
          <p>Console centralisee pour upgrades, downgrades, paiements, remboursements et suivi provider.</p>
        </div>
        <div className="admin-billing-header-actions">
          <Link href="/admin" className="btn-ghost">Retour admin</Link>
          <button type="button" className="btn-primary" onClick={refresh} disabled={loading}>Rafraichir</button>
        </div>
      </header>

      <section className="admin-billing-filters">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher email, prenom, nom" />
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">Tous providers</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
          <option value="manual">Manual</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="active">active</option>
          <option value="past_due">past_due</option>
          <option value="incomplete">incomplete</option>
          <option value="canceled">canceled</option>
        </select>
        <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>Appliquer</button>
      </section>

      {error ? <p className="admin-billing-message error">{error}</p> : null}
      {notice ? <p className="admin-billing-message success">{notice}</p> : null}

      <section className="admin-billing-grid">
        <article className="admin-billing-card">
          <h2>Comptes & abonnements</h2>
          {loading ? <p>Chargement...</p> : null}
          <div className="admin-billing-users">
            {users.map((user) => {
              const subscription = Array.isArray(user.subscriptions) ? user.subscriptions[0] : null;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={`user-row ${String(selectedUserId) === String(user.id) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedUserId(String(user.id));
                    setSelectedPlanId(String(subscription?.pricing_plan_id || user.pricing_plan_id || ''));
                  }}
                >
                  <strong>{userLabel(user)}</strong>
                  <span>{subscription?.pricing_plan?.name || user?.pricing_plan?.name || 'Sans plan'}</span>
                  <span>{subscription?.status || 'incomplete'} | {subscription?.payment_status || 'none'} | {subscription?.provider || 'none'}</span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="admin-billing-card">
          <h2>Actions operateur</h2>
          {selectedUser ? (
            <>
              <p><strong>Compte:</strong> {userLabel(selectedUser)}</p>
              <div className="admin-billing-actions">
                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                  <option value="">Selectionner un plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} - {money(plan.price_cents, plan.currency)}</option>
                  ))}
                </select>
                <button type="button" className="btn-primary" onClick={handleApplyPlan}>Upgrade/Downgrade</button>
                <button type="button" className="btn-secondary" onClick={handleRecordManualPayment}>Valider paiement manuel</button>
              </div>
              <h3>Factures</h3>
              <div className="admin-billing-invoices">
                {(selectedUser.invoices || []).map((invoice) => (
                  <div key={invoice.id} className="invoice-row">
                    <span>{invoice.invoice_number}</span>
                    <span>{money(invoice.amount_cents, invoice.currency)}</span>
                    <span>{invoice.status}</span>
                    <div className="invoice-actions">
                      <button type="button" onClick={() => handleGeneratePdf(invoice.id)}>PDF</button>
                      <button type="button" onClick={() => handleRefund(invoice.id)}>Refund</button>
                    </div>
                  </div>
                ))}
                {(selectedUser.invoices || []).length === 0 ? <p>Aucune facture.</p> : null}
              </div>
            </>
          ) : (
            <p>Selectionnez un compte pour administrer son abonnement.</p>
          )}
        </article>
      </section>

      <section className="admin-billing-card timeline">
        <h2>Timeline operationnelle recente</h2>
        <div className="timeline-list">
          {timeline.map((event) => (
            <div key={event.id} className="timeline-row">
              <span>{new Date(event.createdAt).toLocaleString('fr-FR')}</span>
              <span>{event.type}</span>
              <span>{event.status}</span>
              <span>{event.provider}</span>
              <span>{event.user?.email || '-'}</span>
              <span>{event.message || '-'}</span>
            </div>
          ))}
          {timeline.length === 0 ? <p>Aucun evenement recent.</p> : null}
        </div>
      </section>
    </main>
  );
}
