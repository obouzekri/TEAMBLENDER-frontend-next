"use client";

import { PRICING_BILLING_CYCLE_LABELS } from '@/lib/admin/constants';
import PricingLocalizedContentEditor from '../PricingLocalizedContentEditor';
import { getAdminPricingPlanSummary, getLocalizedLabel, getPricingBillingCycleLabel } from '@/lib/admin/utils';

// Onglet « pricing » de la console admin : rendu seul, l'état et les actions restent dans AdminClient.
export default function PricingTab({
  beginEditPricingPlan,
  busyDeleteKey,
  busySaveKey,
  editingPricingPlan,
  filteredPricingPlans,
  handleDeletePricingPlan,
  locale,
  newPricingMessage,
  newPricingPlan,
  pricingPlans,
  pricingQuery,
  setEditingPricingPlan,
  setNewPricingMessage,
  setNewPricingPlan,
  setPricingQuery,
  setShowNewPricingPlanForm,
  showNewPricingPlanForm,
  submitEditPricingPlan,
  submitNewPricingPlan,
  t,
}) {
  return (
    <div>
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.pricing')}</h1>
          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
            {t('adminConsole.createAndManageYourCommercialOffers')}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditingPricingPlan(null);
            setNewPricingMessage('');
            setShowNewPricingPlanForm((current) => !current);
          }}
        >
          {showNewPricingPlanForm ? t('adminConsole.closeForm') : t('adminConsole.createPricingPlan')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {showNewPricingPlanForm ? (
          <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createPricingPlan')}</h2>
            <form className="auth-form" onSubmit={submitNewPricingPlan}>
              <label>{t('adminConsole.offerName')}<input value={newPricingPlan.name} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, name: e.target.value }))} required /></label>
              <label>{t('adminConsole.shortDescription')}<textarea rows={3} value={newPricingPlan.description} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, description: e.target.value }))} /></label>
              <label>{t('adminConsole.includedFeatures1Line1Bullet')}
                <textarea rows={5} value={newPricingPlan.features} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, features: e.target.value }))} placeholder={t('adminConsole.exampleManagerDashboardLiveSessionEmail')} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label>{t('adminConsole.price')}<input type="number" min="0" step="0.01" value={newPricingPlan.price} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, price: e.target.value }))} required /></label>
                <label>{t('adminConsole.currency')}<input value={newPricingPlan.currency} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={3} /></label>
              </div>
              <label>{t('adminConsole.annualPrice')}<input type="number" min="0" step="0.01" value={newPricingPlan.annual_price} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, annual_price: e.target.value }))} /></label>
              <label>{t('adminConsole.billingCycle')}
                <select value={newPricingPlan.billing_cycle} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, billing_cycle: e.target.value }))}>
                  <option value="monthly">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.monthly, locale)}</option>
                  <option value="yearly">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.yearly, locale)}</option>
                  <option value="one_time">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.one_time, locale)}</option>
                  <option value="custom">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.custom, locale)}</option>
                </select>
              </label>
              <label>{t('adminConsole.ctaButtonLabel')}<input value={newPricingPlan.cta_label} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
              <label>{t('adminConsole.maxUsers')}<input type="number" min="0" value={newPricingPlan.max_users} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, max_users: e.target.value }))} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <label>{t('adminConsole.supportLevel')}<input value={newPricingPlan.support_level} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, support_level: e.target.value }))} placeholder={t('adminConsole.emailPriority')} /></label>
                <label>{t('adminConsole.trialDays')}<input type="number" min="0" value={newPricingPlan.trial_days} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, trial_days: e.target.value }))} /></label>
                <label>{t('adminConsole.displayOrder')}<input type="number" min="0" value={newPricingPlan.display_order} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
              </div>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={newPricingPlan.is_active} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, is_active: e.target.checked }))} />
                  {t('adminConsole.activeOffer')}
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={newPricingPlan.highlighted} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, highlighted: e.target.checked }))} />
                  {t('adminConsole.highlighted')}
                </label>
              </div>
              <PricingLocalizedContentEditor draft={newPricingPlan} setDraft={setNewPricingPlan} t={t} locale={locale} idPrefix="new-pricing-plan" />
              <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:pricing-plan'}>
                {busySaveKey === 'create:pricing-plan' ? t('adminConsole.creating') : t('adminConsole.createPlan')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowNewPricingPlanForm(false);
                  setNewPricingMessage('');
                }}
              >
                {t('adminConsole.cancel')}
              </button>
            </form>
            {newPricingMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newPricingMessage}</p> : null}
          </div>
        ) : null}

        {editingPricingPlan ? (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--modal-scrim, rgba(0,0,0,0.45))', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
            onClick={(e) => { if (e.target === e.currentTarget) setEditingPricingPlan(null); }}
          >
            <div style={{ background: 'var(--surface-elevated, #fff)', border: '1px solid var(--accent, var(--color-primary, #4f46e5))', borderRadius: '12px', width: '100%', maxWidth: '760px', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('adminConsole.editPricingPlan')}</h2>
                <button
                  type="button"
                  onClick={() => setEditingPricingPlan(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--ink-soft, #6b7280)', padding: '2px 8px', lineHeight: 1 }}
                  aria-label={t('adminConsole.closeWindow')}
                >
                  ✕
                </button>
              </div>
            <form className="auth-form" onSubmit={submitEditPricingPlan}>
                <label>{t('adminConsole.offerName')}<input value={editingPricingPlan.name} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, name: e.target.value }))} required /></label>
                <label>{t('adminConsole.shortDescription')}<textarea rows={3} value={editingPricingPlan.description} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, description: e.target.value }))} /></label>
                <label>{t('adminConsole.includedFeatures1Line1Bullet')}
                  <textarea rows={5} value={editingPricingPlan.features} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, features: e.target.value }))} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label>{t('adminConsole.price')}<input type="number" min="0" step="0.01" value={editingPricingPlan.price} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, price: e.target.value }))} required /></label>
                  <label>{t('adminConsole.currency')}<input value={editingPricingPlan.currency} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={3} /></label>
                </div>
                <label>{t('adminConsole.annualPrice')}<input type="number" min="0" step="0.01" value={editingPricingPlan.annual_price} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, annual_price: e.target.value }))} /></label>
                <label>{t('adminConsole.billingCycle')}
                  <select value={editingPricingPlan.billing_cycle} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, billing_cycle: e.target.value }))}>
                    <option value="monthly">{getPricingBillingCycleLabel('monthly', locale)}</option>
                    <option value="yearly">{getPricingBillingCycleLabel('yearly', locale)}</option>
                    <option value="one_time">{getPricingBillingCycleLabel('one_time', locale)}</option>
                    <option value="custom">{getPricingBillingCycleLabel('custom', locale)}</option>
                  </select>
                </label>
                <label>{t('adminConsole.ctaButtonLabel')}<input value={editingPricingPlan.cta_label} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                <label>{t('adminConsole.maxUsers')}<input type="number" min="0" value={editingPricingPlan.max_users} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, max_users: e.target.value }))} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <label>{t('adminConsole.supportLevel')}<input value={editingPricingPlan.support_level} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, support_level: e.target.value }))} /></label>
                  <label>{t('adminConsole.trialDays')}<input type="number" min="0" value={editingPricingPlan.trial_days} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, trial_days: e.target.value }))} /></label>
                  <label>{t('adminConsole.displayOrder')}<input type="number" min="0" value={editingPricingPlan.display_order} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                </div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={editingPricingPlan.is_active} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, is_active: e.target.checked }))} />
                    {t('adminConsole.activeOffer')}
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={editingPricingPlan.highlighted} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, highlighted: e.target.checked }))} />
                    {t('adminConsole.highlighted')}
                  </label>
                </div>
                <PricingLocalizedContentEditor key={String(editingPricingPlan.id)} draft={editingPricingPlan} setDraft={setEditingPricingPlan} t={t} locale={locale} idPrefix={`edit-pricing-plan-${editingPricingPlan.id}`} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:pricing-plan:${editingPricingPlan.id}`}>
                    {busySaveKey === `save:pricing-plan:${editingPricingPlan.id}` ? t('adminConsole.saving') : t('adminConsole.save')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingPricingPlan(null)}>{t('adminConsole.cancel')}</button>
                </div>
            </form>
            </div>
          </div>
        ) : null}

        <div style={{ background: 'var(--surface-elevated, #fff)', border: '1px solid var(--line, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              {t('adminConsole.list')} {pricingPlans.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--ink-soft, #6b7280)', fontSize: '13px' }}>({filteredPricingPlans.length}/{pricingPlans.length})</span> : null}
            </h2>
            <input
              type="search"
              className="inline-input"
              placeholder={t('adminConsole.searchAPlan')}
              value={pricingQuery}
              onChange={(e) => setPricingQuery(e.target.value)}
              style={{ width: 'min(360px, 100%)' }}
            />
          </div>

          <ul className="session-list" style={{ margin: 0 }}>
            {filteredPricingPlans.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingPlan')}</li> : null}
            {filteredPricingPlans.map((plan) => {
              const summary = getAdminPricingPlanSummary(plan, locale);
              return (
              <li key={String(plan.id)} className="session-item" style={{ alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <p className="session-title">
                    {summary.name}
                    {summary.badge ? <span className="pricing-badge admin-pricing-inline-badge">{summary.badge}</span> : null}
                  </p>
                  <p className="session-meta">
                    {summary.publicPrice}
                    {summary.billedPrice ? ` (${t('adminConsole.billedPrice', { amount: summary.billedPrice })})` : null}
                    {' · '}
                    {getPricingBillingCycleLabel(plan.billing_cycle, locale)}
                    {' · '}
                    {plan.is_active ? t('adminConsole.active2') : t('adminConsole.inactive2')}
                  </p>
                </div>
                <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-action-btn"
                    onClick={() => beginEditPricingPlan(plan)}
                    title={t('adminConsole.edit')}
                    aria-label={t('adminConsole.editPlan')}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-danger"
                    onClick={() => handleDeletePricingPlan(plan)}
                    disabled={busyDeleteKey === `pricing-plan:${plan.id}`}
                    title={t('adminConsole.delete')}
                    aria-label={t('adminConsole.deletePlan')}
                  >
                    {busyDeleteKey === `pricing-plan:${plan.id}` ? '…' : '🗑'}
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
