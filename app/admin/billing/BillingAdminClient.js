'use client';

import { useEffect, useMemo, useState } from 'react';
import AppNav from '@/components/AppNav';
import { clearSessionAuth, getStoredCurrentUser } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';
import { formatDate as formatLocaleDate, NUMERIC_DATE_TIME } from '@/lib/i18n/format';
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
import { translate } from '@/lib/i18n';

function userLabel(user, locale) {
  const first = String(user?.first_name || '').trim();
  const last = String(user?.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user?.email || `${translate(locale, 'adminBilling.user')} #${user?.id || '?'}`;
}

function money(amountCents, priceMadCents) {
  const amount = Number.isFinite(Number(priceMadCents))
    ? Math.max(0, Math.round(Number(priceMadCents) / 100))
    : Math.max(0, Math.round(Number(amountCents || 0) / 100));
  return `${amount} DH`;
}

function formatDate(value, locale) {
  if (!value) return '-';
  return formatLocaleDate(value, locale, NUMERIC_DATE_TIME) || '-';
}

function normalizeStatus(value, fallback = 'unknown') {
  return String(value || fallback).trim().toLowerCase();
}

function buildStatusLabel(value, locale) {
  const normalized = normalizeStatus(value);
  const labels = {
    active: translate(locale, 'adminBilling.active'),
    canceled: translate(locale, 'adminBilling.cancelled'),
    past_due: translate(locale, 'adminBilling.pastDue'),
    incomplete: translate(locale, 'adminBilling.incomplete'),
    trialing: translate(locale, 'adminBilling.trial'),
    paused: translate(locale, 'adminBilling.paused'),
    paid: translate(locale, 'adminBilling.paid'),
    pending: translate(locale, 'adminBilling.pending'),
    failed: translate(locale, 'adminBilling.failed'),
    refunded: translate(locale, 'adminBilling.refunded'),
    none: translate(locale, 'adminBilling.none'),
    paypal: 'PayPal',
    stripe: 'Stripe',
    manual: translate(locale, 'adminBilling.manual'),
    unknown: translate(locale, 'adminBilling.unknown'),
  };
  return labels[normalized] || normalized;
}

export default function BillingAdminClient() {
  const { locale, withLocalePath, t } = useI18n();
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
      setError(err.message || t('adminBilling.unableToLoadBilling'));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSessionAuth();
    window.location.replace(withLocalePath('/login'));
  }

  useEffect(() => {
    setSessionUser(getStoredCurrentUser());
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
      setNotice(t('adminBilling.planUpdated'));
      await refresh();
    } catch (err) {
      setError(err.message || t('adminBilling.failedToChangePlan'));
    }
  }

  async function handleRecordManualPayment() {
    if (!selectedUserId || !selectedPlanId) return;
    setError('');
    setNotice('');
    const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId));
    const hasMadPrice = Number.isFinite(Number(selectedPlan?.price_mad_cents));
    try {
      await adminCreateManualPayment(selectedUserId, {
        pricing_plan_id: selectedPlanId,
        amount_cents: hasMadPrice ? Number(selectedPlan.price_mad_cents) : Number(selectedPlan?.price_cents || 0),
        currency: hasMadPrice ? 'MAD' : (selectedPlan?.currency || 'EUR'),
        billing_cycle: selectedPlan?.billing_cycle || 'monthly',
        provider: 'manual',
      });
      setNotice(t('adminBilling.manualPaymentRecordedAndSubscriptionSynchronized'));
      await refresh();
    } catch (err) {
      setError(err.message || t('adminBilling.failedToRecordManualPayment'));
    }
  }

  async function handleRefund(invoiceId) {
    setError('');
    setNotice('');
    try {
      await adminRefundInvoice(invoiceId, { reason: 'Refund requested by support' });
      setNotice(t('adminBilling.invoiceRefunded'));
      await refresh();
    } catch (err) {
      setError(err.message || t('adminBilling.unableToRefund'));
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
      setNotice(t('adminBilling.invoicePdfGenerated'));
      await refresh();
    } catch (err) {
      setError(err.message || t('adminBilling.unableToGeneratePdf'));
    }
  }

  return (
    <>
      <AppNav userLabel={userLabel(sessionUser, locale)} onLogout={logout} role="admin" />
      <main className="admin-billing-shell">
        <header className="admin-billing-header">
          <div>
            <p className="eyebrow">{t('adminBilling.paymentBackOffice')}</p>
            <h1>{t('adminBilling.subscriptionsBillingAndOperations')}</h1>
            <p>{t('adminBilling.centralizedConsoleForPlanChangesPayments')}</p>
          </div>
          <div className="admin-billing-header-actions" />
        </header>

        <section className="admin-billing-filters">
        <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('adminBilling.searchAccounts')} placeholder={t('adminBilling.searchEmailFirstNameLastName')} />
        <select value={provider} onChange={(e) => setProvider(e.target.value)} aria-label={t('adminBilling.paymentProvider')}>
          <option value="">{t('adminBilling.allProviders')}</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
          <option value="manual">{t('adminBilling.manual')}</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t('adminBilling.subscriptionStatus')}>
          <option value="">{t('adminBilling.allStatuses')}</option>
          <option value="active">{buildStatusLabel('active', locale)}</option>
          <option value="past_due">{buildStatusLabel('past_due', locale)}</option>
          <option value="incomplete">{buildStatusLabel('incomplete', locale)}</option>
          <option value="canceled">{buildStatusLabel('canceled', locale)}</option>
        </select>
        <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>{t('adminBilling.apply')}</button>
        </section>

        <section className="admin-billing-kpis" aria-label={t('adminBilling.paymentKpis')}>
        <article className="kpi-card">
          <p>{t('adminBilling.managedAccounts')}</p>
          <strong>{stats.managedAccounts}</strong>
        </article>
        <article className="kpi-card">
          <p>{t('adminBilling.activeSubscriptions')}</p>
          <strong>{stats.activeSubscriptions}</strong>
        </article>
        <article className="kpi-card is-warning">
          <p>{t('adminBilling.atRiskSubscriptions')}</p>
          <strong>{stats.riskSubscriptions}</strong>
        </article>
        <article className="kpi-card">
          <p>{t('adminBilling.pendingInvoices')}</p>
          <strong>{stats.pendingInvoices}</strong>
        </article>
        <article className="kpi-card is-danger">
          <p>{t('adminBilling.failedInvoices')}</p>
          <strong>{stats.failedInvoices}</strong>
        </article>
        <article className="kpi-card">
          <p>{t('adminBilling.timelineEvents')}</p>
          <strong>{stats.timelineEvents}</strong>
        </article>
        </section>

        {error ? <p className="admin-billing-message error">{error}</p> : null}
        {notice ? <p className="admin-billing-message success">{notice}</p> : null}

        <section className="admin-billing-grid">
        <article className="admin-billing-card">
          <h2>{t('adminBilling.accountsSubscriptions')}</h2>
          {loading ? <p>{t('adminBilling.loading')}</p> : null}
          <div className="admin-billing-users">
            {users.map((user) => {
              const subscription = Array.isArray(user.subscriptions) ? user.subscriptions[0] : null;
              return (
                <button
                  key={user.id}
                  type="button"
                  className={`user-row ${String(selectedUserId) === String(user.id) ? 'active' : ''}`}
                  aria-pressed={String(selectedUserId) === String(user.id)}
                  onClick={() => {
                    setSelectedUserId(String(user.id));
                    setSelectedPlanId(String(subscription?.pricing_plan_id || user.pricing_plan_id || ''));
                  }}
                >
                  <div className="user-row-top">
                    <strong>{userLabel(user, locale)}</strong>
                    <span className={`status-chip status-${normalizeStatus(subscription?.status, 'incomplete')}`}>
                      {buildStatusLabel(subscription?.status || 'incomplete', locale)}
                    </span>
                  </div>
                  <span className="user-row-plan">{subscription?.pricing_plan?.name || user?.pricing_plan?.name || t('adminBilling.noPlan')}</span>
                  <div className="user-row-meta">
                    <span className={`status-chip status-${normalizeStatus(subscription?.payment_status, 'none')}`}>
                      {t('adminBilling.payment')}{buildStatusLabel(subscription?.payment_status || 'none', locale)}
                    </span>
                    <span className={`status-chip status-${normalizeStatus(subscription?.provider, 'none')}`}>
                      {buildStatusLabel(subscription?.provider || 'none', locale)}
                    </span>
                  </div>
                </button>
              );
            })}
            {!loading && users.length === 0 ? <p className="empty-state">{t('adminBilling.noAccountsFoundWithThisFilter')}</p> : null}
          </div>
        </article>

        <article className="admin-billing-card">
          <h2>{t('adminBilling.operatorActions')}</h2>
          {selectedUser ? (
            <>
              <div className="selected-user-summary">
                <p><strong>{t('adminBilling.account')}</strong> {userLabel(selectedUser, locale)}</p>
                <p><strong>{t('adminBilling.activePlan')}</strong> {selectedSubscription?.pricing_plan?.name || selectedUser?.pricing_plan?.name || t('adminBilling.noPlan')}</p>
                <p><strong>{t('adminBilling.renewal')}</strong> {formatDate(selectedSubscription?.current_period_end, locale)}</p>
              </div>
              <div className="admin-billing-actions">
                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} aria-label={t('adminBilling.subscriptionPlan')}>
                  <option value="">{t('adminBilling.selectAPlan')}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} - {money(plan.price_cents, plan.price_mad_cents)}</option>
                  ))}
                </select>
                <button type="button" className="btn-primary" onClick={handleApplyPlan} disabled={!selectedPlanId || loading}>{t('adminBilling.changePlan')}</button>
                <button type="button" className="btn-secondary" onClick={handleRecordManualPayment} disabled={!selectedPlanId || loading}>{t('adminBilling.recordManualPayment')}</button>
              </div>
              <h3>{t('adminBilling.invoices')}</h3>
              <div className="admin-billing-invoices">
                {(selectedUser.invoices || []).map((invoice) => (
                  <div key={invoice.id} className="invoice-row">
                    <div className="invoice-main">
                      <span className="invoice-number">{invoice.invoice_number}</span>
                      <span>{money(invoice.amount_cents, plans.find((plan) => String(plan.id) === String(invoice.pricing_plan_id))?.price_mad_cents)}</span>
                      <span className={`status-chip status-${normalizeStatus(invoice.status, 'pending')}`}>{buildStatusLabel(invoice.status, locale)}</span>
                      <span className="invoice-date">{formatDate(invoice.createdAt, locale)}</span>
                    </div>
                    <div className="invoice-actions">
                      <button type="button" onClick={() => handleGeneratePdf(invoice.id)} disabled={loading}>PDF</button>
                      <button type="button" onClick={() => handleRefund(invoice.id)} disabled={loading || normalizeStatus(invoice.status) === 'refunded'}>{t('adminBilling.refund')}</button>
                    </div>
                  </div>
                ))}
                {(selectedUser.invoices || []).length === 0 ? <p className="empty-state">{t('adminBilling.noInvoices')}</p> : null}
              </div>
            </>
          ) : (
            <p className="empty-state">{t('adminBilling.selectAnAccountToManageIts')}</p>
          )}
        </article>
        </section>

        <section className="admin-billing-card timeline">
        <h2>{t('adminBilling.recentOperationalTimeline')}</h2>
        <div className="timeline-list">
          {timeline.map((event) => (
            <div key={event.id} className="timeline-row">
              <div className="timeline-row-top">
                <span>{formatDate(event.createdAt, locale)}</span>
                <span className={`status-chip status-${normalizeStatus(event.status, 'pending')}`}>{buildStatusLabel(event.status, locale)}</span>
              </div>
              <div className="timeline-row-main">
                <strong>{event.type}</strong>
                <span className={`status-chip status-${normalizeStatus(event.provider, 'none')}`}>{buildStatusLabel(event.provider, locale)}</span>
              </div>
              <span>{event.user?.email || '-'}</span>
              <span>{event.message || '-'}</span>
            </div>
          ))}
          {timeline.length === 0 ? <p className="empty-state">{t('adminBilling.noRecentEvents')}</p> : null}
        </div>
        </section>
      </main>
    </>
  );
}
