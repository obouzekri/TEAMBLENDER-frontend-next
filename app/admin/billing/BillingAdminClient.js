'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import useI18n from '@/lib/i18n/useI18n';
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
  return full || user?.email || `User #${user?.id || '?'}`;
}

function money(amountCents, currency, isEn) {
  const amount = Number(amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat(isEn ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency: String(currency || 'EUR').toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${String(currency || 'EUR').toUpperCase()}`;
  }
}

function formatDate(value, isEn) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(isEn ? 'en-US' : 'fr-FR');
}

function normalizeStatus(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase();
}

function buildStatusLabel(value, isEn) {
  const normalized = normalizeStatus(value);
  const labels = {
    active: isEn ? 'Active' : 'Actif',
    canceled: isEn ? 'Cancelled' : 'Annule',
    past_due: isEn ? 'Past due' : 'Impayé',
    incomplete: isEn ? 'Incomplete' : 'Incomplet',
    trialing: isEn ? 'Trial' : 'Essai',
    paused: isEn ? 'Paused' : 'Pause',
    paid: isEn ? 'Paid' : 'Payé',
    pending: isEn ? 'Pending' : 'En attente',
    failed: isEn ? 'Failed' : 'Échoué',
    refunded: isEn ? 'Refunded' : 'Remboursé',
    none: isEn ? 'None' : 'Aucun',
    paypal: 'PayPal',
    stripe: 'Stripe',
    manual: isEn ? 'Manual' : 'Manuel',
  };
  return labels[normalized] || normalized;
}

export default function BillingAdminClient() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [sessionUser, setSessionUser] = useState(null);
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
      setError(err.message || (isEn ? 'Unable to load billing.' : 'Chargement billing impossible.'));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace(withLocalePath('/login'));
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('currentUser');
      setSessionUser(raw ? JSON.parse(raw) : null);
    } catch {
      setSessionUser(null);
    }
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      const first = users[0];
      const subscription = Array.isArray(first?.subscriptions) ? first.subscriptions[0] : null;
      setSelectedUserId(String(first.id));
      setSelectedPlanId(String(subscription?.pricing_plan_id || first?.pricing_plan_id || ''));
    }
  }, [users, selectedUserId]);

  const selectedUser = useMemo(
    () => users.find((entry) => String(entry.id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const stats = useMemo(() => {
    const subs = users.map((user) => (Array.isArray(user.subscriptions) ? user.subscriptions[0] : null)).filter(Boolean);
    const invoices = users.flatMap((user) => (Array.isArray(user.invoices) ? user.invoices : []));
    return {
      managedAccounts: users.length,
      activeSubscriptions: subs.filter((sub) => normalizeStatus(sub.status) === 'active').length,
      riskSubscriptions: subs.filter((sub) => ['past_due', 'incomplete'].includes(normalizeStatus(sub.status))).length,
      pendingInvoices: invoices.filter((invoice) => normalizeStatus(invoice.status) === 'pending').length,
      failedInvoices: invoices.filter((invoice) => normalizeStatus(invoice.status) === 'failed').length,
      timelineEvents: timeline.length,
    };
  }, [users, timeline]);

  const selectedSubscription = useMemo(
    () => (Array.isArray(selectedUser?.subscriptions) ? selectedUser.subscriptions[0] : null),
    [selectedUser]
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
      setNotice(isEn ? 'Plan updated.' : 'Plan mis a jour.');
      await refresh();
    } catch (err) {
      setError(err.message || (isEn ? 'Failed to change plan.' : 'Echec changement de plan.'));
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
      setNotice(isEn ? 'Manual payment recorded and subscription synchronized.' : 'Paiement manuel enregistre et subscription synchronisee.');
      await refresh();
    } catch (err) {
      setError(err.message || (isEn ? 'Failed to record manual payment.' : 'Echec enregistrement paiement manuel.'));
    }
  }

  async function handleRefund(invoiceId) {
    setError('');
    setNotice('');
    try {
      await adminRefundInvoice(invoiceId, { reason: 'Refund requested by support' });
      setNotice(isEn ? 'Invoice refunded.' : 'Facture remboursee.');
      await refresh();
    } catch (err) {
      setError(err.message || (isEn ? 'Unable to refund.' : 'Remboursement impossible.'));
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
      setNotice(isEn ? 'Invoice PDF generated.' : 'PDF facture genere.');
      await refresh();
    } catch (err) {
      setError(err.message || (isEn ? 'Unable to generate PDF.' : 'Generation PDF impossible.'));
    }
  }

  return (
    <>
      <AppNav userLabel={userLabel(sessionUser)} onLogout={logout} role="admin" />
      <main className="admin-billing-shell">
        <header className="admin-billing-header">
          <div>
            <p className="eyebrow">{isEn ? 'Payment Backoffice' : 'Backoffice Paiements'}</p>
            <h1>{isEn ? 'Subscriptions, billing and operations' : 'Abonnements, facturation et operations'}</h1>
            <p>{isEn ? 'Centralized console for upgrades, downgrades, payments, refunds and provider tracking.' : 'Console centralisee pour upgrades, downgrades, paiements, remboursements et suivi provider.'}</p>
          </div>
          <div className="admin-billing-header-actions" />
        </header>

        <section className="admin-billing-filters">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isEn ? 'Search email, first name, last name' : 'Rechercher email, prenom, nom'} />
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">{isEn ? 'All providers' : 'Tous les prestataires'}</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
          <option value="manual">{isEn ? 'Manual' : 'Manuel'}</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{isEn ? 'All statuses' : 'Tous statuts'}</option>
          <option value="active">{buildStatusLabel('active', isEn)}</option>
          <option value="past_due">{buildStatusLabel('past_due', isEn)}</option>
          <option value="incomplete">{buildStatusLabel('incomplete', isEn)}</option>
          <option value="canceled">{buildStatusLabel('canceled', isEn)}</option>
        </select>
        <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>{isEn ? 'Apply' : 'Appliquer'}</button>
        </section>

        <section className="admin-billing-kpis" aria-label={isEn ? 'Payment KPIs' : 'Indicateurs paiements'}>
        <article className="kpi-card">
          <p>{isEn ? 'Managed accounts' : 'Comptes suivis'}</p>
          <strong>{stats.managedAccounts}</strong>
        </article>
        <article className="kpi-card">
          <p>{isEn ? 'Active subscriptions' : 'Abonnements actifs'}</p>
          <strong>{stats.activeSubscriptions}</strong>
        </article>
        <article className="kpi-card is-warning">
          <p>{isEn ? 'At-risk subscriptions' : 'Abonnements a risque'}</p>
          <strong>{stats.riskSubscriptions}</strong>
        </article>
        <article className="kpi-card">
          <p>{isEn ? 'Pending invoices' : 'Factures en attente'}</p>
          <strong>{stats.pendingInvoices}</strong>
        </article>
        <article className="kpi-card is-danger">
          <p>{isEn ? 'Failed invoices' : 'Factures échouées'}</p>
          <strong>{stats.failedInvoices}</strong>
        </article>
        <article className="kpi-card">
          <p>{isEn ? 'Timeline events' : 'Événements timeline'}</p>
          <strong>{stats.timelineEvents}</strong>
        </article>
        </section>

        {error ? <p className="admin-billing-message error">{error}</p> : null}
        {notice ? <p className="admin-billing-message success">{notice}</p> : null}

        <section className="admin-billing-grid">
        <article className="admin-billing-card">
          <h2>{isEn ? 'Accounts & subscriptions' : 'Comptes & abonnements'}</h2>
          {loading ? <p>{isEn ? 'Loading...' : 'Chargement...'}</p> : null}
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
                  <div className="user-row-top">
                    <strong>{userLabel(user)}</strong>
                    <span className={`status-chip status-${normalizeStatus(subscription?.status, 'incomplete')}`}>
                      {buildStatusLabel(subscription?.status || 'incomplete', isEn)}
                    </span>
                  </div>
                  <span className="user-row-plan">{subscription?.pricing_plan?.name || user?.pricing_plan?.name || (isEn ? 'No plan' : 'Sans plan')}</span>
                  <div className="user-row-meta">
                    <span className={`status-chip status-${normalizeStatus(subscription?.payment_status, 'none')}`}>
                      {isEn ? 'Payment' : 'Paiement'} {buildStatusLabel(subscription?.payment_status || 'none', isEn)}
                    </span>
                    <span className={`status-chip status-${normalizeStatus(subscription?.provider, 'none')}`}>
                      {buildStatusLabel(subscription?.provider || 'none')}
                    </span>
                  </div>
                </button>
              );
            })}
            {!loading && users.length === 0 ? <p className="empty-state">{isEn ? 'No accounts found with this filter.' : 'Aucun compte trouve avec ce filtre.'}</p> : null}
          </div>
        </article>

        <article className="admin-billing-card">
          <h2>{isEn ? 'Operator actions' : 'Actions operateur'}</h2>
          {selectedUser ? (
            <>
              <div className="selected-user-summary">
                <p><strong>{isEn ? 'Account:' : 'Compte:'}</strong> {userLabel(selectedUser)}</p>
                <p><strong>{isEn ? 'Active plan:' : 'Plan actif:'}</strong> {selectedSubscription?.pricing_plan?.name || selectedUser?.pricing_plan?.name || (isEn ? 'No plan' : 'Sans plan')}</p>
                <p><strong>{isEn ? 'Renewal:' : 'Renouvellement:'}</strong> {formatDate(selectedSubscription?.current_period_end, isEn)}</p>
              </div>
              <div className="admin-billing-actions">
                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                  <option value="">{isEn ? 'Select a plan' : 'Selectionner un plan'}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} - {money(plan.price_cents, plan.currency, isEn)}</option>
                  ))}
                </select>
                <button type="button" className="btn-primary" onClick={handleApplyPlan} disabled={!selectedPlanId || loading}>{isEn ? 'Upgrade/Downgrade' : 'Upgrade/Downgrade'}</button>
                <button type="button" className="btn-secondary" onClick={handleRecordManualPayment} disabled={!selectedPlanId || loading}>{isEn ? 'Record manual payment' : 'Valider paiement manuel'}</button>
              </div>
              <h3>{isEn ? 'Invoices' : 'Factures'}</h3>
              <div className="admin-billing-invoices">
                {(selectedUser.invoices || []).map((invoice) => (
                  <div key={invoice.id} className="invoice-row">
                    <div className="invoice-main">
                      <span className="invoice-number">{invoice.invoice_number}</span>
                      <span>{money(invoice.amount_cents, invoice.currency, isEn)}</span>
                      <span className={`status-chip status-${normalizeStatus(invoice.status, 'pending')}`}>{buildStatusLabel(invoice.status, isEn)}</span>
                      <span className="invoice-date">{formatDate(invoice.createdAt, isEn)}</span>
                    </div>
                    <div className="invoice-actions">
                      <button type="button" onClick={() => handleGeneratePdf(invoice.id)} disabled={loading}>PDF</button>
                      <button type="button" onClick={() => handleRefund(invoice.id)} disabled={loading || normalizeStatus(invoice.status) === 'refunded'}>{isEn ? 'Refund' : 'Rembourser'}</button>
                    </div>
                  </div>
                ))}
                {(selectedUser.invoices || []).length === 0 ? <p className="empty-state">{isEn ? 'No invoices.' : 'Aucune facture.'}</p> : null}
              </div>
            </>
          ) : (
            <p className="empty-state">{isEn ? 'Select an account to manage its subscription.' : 'Selectionnez un compte pour administrer son abonnement.'}</p>
          )}
        </article>
        </section>

        <section className="admin-billing-card timeline">
        <h2>{isEn ? 'Recent operational timeline' : 'Timeline operationnelle recente'}</h2>
        <div className="timeline-list">
          {timeline.map((event) => (
            <div key={event.id} className="timeline-row">
              <div className="timeline-row-top">
                <span>{formatDate(event.createdAt, isEn)}</span>
                <span className={`status-chip status-${normalizeStatus(event.status, 'pending')}`}>{buildStatusLabel(event.status, isEn)}</span>
              </div>
              <div className="timeline-row-main">
                <strong>{event.type}</strong>
                <span className={`status-chip status-${normalizeStatus(event.provider, 'none')}`}>{buildStatusLabel(event.provider, isEn)}</span>
              </div>
              <span>{event.user?.email || '-'}</span>
              <span>{event.message || '-'}</span>
            </div>
          ))}
          {timeline.length === 0 ? <p className="empty-state">{isEn ? 'No recent events.' : 'Aucun evenement recent.'}</p> : null}
        </div>
        </section>
      </main>
    </>
  );
}
