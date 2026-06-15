"use client";

import { useEffect, useMemo, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import PaddleCheckoutButton from '@/components/PaddleCheckoutButton';
import useToast from '@/lib/useToast';
import {
  getMe,
  updateMe,
  updateMyPassword,
  resetMyPassword,
  listPricingPlans,
  updateMyPlan,
  capturePaypalOrder,
  getStoredCurrentUser,
  setStoredCurrentUser,
} from '@/lib/account';
import useI18n from '@/lib/i18n/useI18n';

const PLAN_HISTORY_STORAGE_KEY = 'accountPlanChangeHistory';

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
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || '').trim();
  const last = String(user.last_name || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

function normalizePlanList(plans) {
  const list = Array.isArray(plans) ? plans : [];
  return [...list].sort((a, b) => {
    const byOrder = Number(a.display_order || 0) - Number(b.display_order || 0);
    if (byOrder !== 0) return byOrder;
    return Number(a.price_cents || 0) - Number(b.price_cents || 0);
  });
}

function parseHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PLAN_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAN_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 15)));
}

function formatDate(dateValue, locale = 'fr') {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export default function AccountPage() {
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const { t, locale, withLocalePath } = useI18n();
  const [guard, setGuard] = useState({ loading: true, allowed: false, user: null });
  const [entrySource, setEntrySource] = useState('');

  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planHistory, setPlanHistory] = useState([]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const source = String(params.get('source') || '').trim().toLowerCase();
    setEntrySource(source);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const current = getStoredCurrentUser();

    if (!token || !current) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    if (current.role === 'participant') {
      window.location.replace(withLocalePath('/participant'));
      return;
    }

    setGuard({ loading: false, allowed: true, user: current });
  }, []);

  useEffect(() => {
    if (!guard.allowed) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const billing = String(params.get('billing') || '').trim();
    if (billing !== 'paypal_return') return;

    const paypalToken = String(params.get('token') || '').trim();
    const planId = String(params.get('plan_id') || '').trim() || null;

    if (!paypalToken) {
      showError(t('account.paypalReturnMissingOrder'));
      return;
    }

    window.history.replaceState({}, '', window.location.pathname);

    (async () => {
      try {
        const result = await capturePaypalOrder({ order_id: paypalToken, pricing_plan_id: planId });
        const planName = result?.plan?.name;
        showSuccess(
          planName
            ? t('account.paypalConfirmedWithPlan', { plan: planName })
            : t('account.paypalConfirmedGeneric')
        );

        const [updatedMe, updatedPlans] = await Promise.all([getMe(), listPricingPlans()]);
        if (updatedMe) {
          setMe(updatedMe);
          setSelectedPlanId(updatedMe.pricing_plan_id ? String(updatedMe.pricing_plan_id) : '');
          const mergedUser = {
            ...(guard.user || {}),
            pricing_plan_id: updatedMe.pricing_plan_id || null,
            pricing_plan: updatedMe.pricing_plan || null,
            picture_url: updatedMe.picture_url || null,
          };
          setStoredCurrentUser(mergedUser);
          setGuard((prev) => ({ ...prev, user: mergedUser }));
        }
        if (Array.isArray(updatedPlans)) setPlans(normalizePlanList(updatedPlans));
      } catch (err) {
        showError(err.message || t('account.paypalConfirmError'));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guard.allowed]);

  useEffect(() => {
    if (!guard.allowed) return;

    let cancelled = false;
    setLoading(true);

    Promise.allSettled([getMe(), listPricingPlans()])
      .then((results) => {
        if (cancelled) return;

        const [meResult, plansResult] = results;
        const mePayload = meResult.status === 'fulfilled' ? meResult.value : null;
        const plansPayload = plansResult.status === 'fulfilled' ? plansResult.value : [];

        if (meResult.status === 'rejected') {
          showError(meResult.reason?.message || t('account.loadAccountError'));
        }

        if (plansResult.status === 'rejected') {
          showError(plansResult.reason?.message || t('account.loadPlansError'));
        }

        const normalizedPlans = normalizePlanList(plansPayload);
        const currentPlanFromMe = mePayload?.pricing_plan;
        const hasCurrentPlanInList = normalizedPlans.some(
          (plan) => String(plan?.id) === String(currentPlanFromMe?.id)
        );

        const mergedPlans = currentPlanFromMe && !hasCurrentPlanInList
          ? normalizePlanList([...normalizedPlans, currentPlanFromMe])
          : normalizedPlans;

        setMe(mePayload || null);
        setPlans(mergedPlans);
        setProfileForm({
          first_name: String(mePayload?.first_name || '').trim(),
          last_name: String(mePayload?.last_name || '').trim(),
          job_title: String(mePayload?.job_title || '').trim(),
          department: String(mePayload?.department || '').trim(),
        });
        setSelectedPlanId(mePayload?.pricing_plan_id ? String(mePayload.pricing_plan_id) : '');

        const existingHistory = parseHistory();
        setPlanHistory(existingHistory);

        if (mePayload) {
          setGuard((prev) => {
            const mergedUser = {
              ...(prev.user || {}),
              first_name: mePayload?.first_name,
              last_name: mePayload?.last_name,
              name: mePayload?.name,
              job_title: mePayload?.job_title,
              department: mePayload?.department,
              picture_url: mePayload?.picture_url || null,
              pricing_plan_id: mePayload?.pricing_plan_id || null,
              pricing_plan: mePayload?.pricing_plan || null,
            };
            setStoredCurrentUser(mergedUser);
            return { ...prev, user: mergedUser };
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, showError, t]);

  const userLabel = useMemo(() => normalizeDisplayName(guard.user), [guard.user]);

  const currentPlanId = me?.pricing_plan_id ? String(me.pricing_plan_id) : '';
  const activePlan = useMemo(() => {
    if (!currentPlanId) return null;
    return plans.find((plan) => String(plan.id) === currentPlanId) || null;
  }, [plans, currentPlanId]);

  const isPaywallEntry = entrySource === 'paywall';
  const currentPlanLabel = activePlan?.name || t('account.noPlan');
  const historyCount = planHistory.length;
  const roleLabel = String(guard.user?.role || '').toLowerCase() === 'admin' ? t('account.roleAdmin') : t('account.roleManager');

  const recommendedPlan = useMemo(() => {
    const bySlug = plans.find((plan) => String(plan.slug || '').toLowerCase() === 'pro');
    if (bySlug) return bySlug;
    const byName = plans.find((plan) => String(plan.name || '').toLowerCase().includes('pro'));
    return byName || null;
  }, [plans]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (savingProfile) return;

    setSavingProfile(true);
    try {
      const payload = {
        job_title: profileForm.job_title || null,
        department: profileForm.department || null,
      };
      const updated = await updateMe(payload);
      setMe((prev) => ({
        ...(prev || {}),
        ...updated,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
      }));
      showSuccess(t('account.profileUpdated'));
    } catch (err) {
      showError(err.message || t('account.profileUpdateError'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(event) {
    event.preventDefault();
    if (savingPassword) return;

    const currentPassword = String(passwordForm.current_password || '').trim();
    const nextPassword = String(passwordForm.new_password || '').trim();
    const confirmPassword = String(passwordForm.confirm_password || '').trim();

    if (!currentPassword || !nextPassword || !confirmPassword) {
      showError(t('account.passwordAllRequired'));
      return;
    }
    if (nextPassword.length < 8) {
      showError(t('account.passwordMin'));
      return;
    }
    if (nextPassword !== confirmPassword) {
      showError(t('account.passwordConfirmMismatch'));
      return;
    }

    setSavingPassword(true);
    try {
      await updateMyPassword(currentPassword, nextPassword);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showSuccess(t('account.passwordUpdated'));
    } catch (err) {
      showError(err.message || t('account.passwordUpdateError'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleResetPassword() {
    if (resettingPassword || !me?.id) return;

    const confirmed = window.confirm(t('account.passwordResetConfirm'));
    if (!confirmed) return;

    setResettingPassword(true);
    try {
      const result = await resetMyPassword(me.id);
      const temp = String(result?.tempPassword || '').trim();
      if (!temp) {
        showSuccess(t('account.passwordResetDone'));
        return;
      }

      showSuccess(t('account.passwordResetTemp', { temp }));
      if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(temp).catch(() => undefined);
      }
    } catch (err) {
      showError(err.message || t('account.passwordResetError'));
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleChangePlan(event) {
    event.preventDefault();
    if (savingPlan) return;

    const nextPlanId = selectedPlanId || null;
    if (String(nextPlanId || '') === String(currentPlanId || '')) {
      showError(t('account.currentPlanAlreadyActive'));
      return;
    }

    setSavingPlan(true);
    try {
      const updatedUser = await updateMyPlan(nextPlanId);
      const previousPlan = activePlan;
      const latestPlanId = updatedUser?.pricing_plan_id ? String(updatedUser.pricing_plan_id) : '';
      const latestPlan = plans.find((plan) => String(plan.id) === latestPlanId) || null;

      setMe(updatedUser);
      setSelectedPlanId(latestPlanId);

      const mergedUser = {
        ...(guard.user || {}),
        pricing_plan_id: updatedUser?.pricing_plan_id || null,
        pricing_plan: updatedUser?.pricing_plan || null,
      };
      setStoredCurrentUser(mergedUser);
      setGuard((prev) => ({ ...prev, user: mergedUser }));

      const historyEntry = {
        id: Date.now(),
        at: new Date().toISOString(),
        from: previousPlan ? previousPlan.name : 'No plan',
        to: latestPlan ? latestPlan.name : 'No plan',
      };
      const nextHistory = [historyEntry, ...planHistory].slice(0, 15);
      setPlanHistory(nextHistory);
      saveHistory(nextHistory);

      showSuccess(t('account.planUpdated'));
    } catch (err) {
      if (err.code === 'PRICING_SCHEMA_UNAVAILABLE') {
        showError(t('account.pricingUnavailable'));
      } else {
        showError(err.message || t('account.planChangeError'));
      }
    } finally {
      setSavingPlan(false);
    }
  }

  function handleGoToCheckout(method, planId) {
    const targetPlanId = planId || recommendedPlan?.id || activePlan?.id;
    if (!targetPlanId) {
      showError(t('account.noPlanAvailable'));
      return;
    }
    window.location.assign(
      `${withLocalePath('/account/checkout')}?plan_id=${encodeURIComponent(String(targetPlanId))}&method=${encodeURIComponent(String(method))}`
    );
  }

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace(withLocalePath('/login'));
  }

  if (guard.loading || loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('account.loadingTitle')}</h1>
          <p>{t('account.loadingBody')}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className="shell app-home account-page">
        {isPaywallEntry ? (
          <section className="account-upgrade-banner" aria-label={t('account.paywallAria')}>
            <div className="account-upgrade-banner__body">
              <p className="eyebrow">{t('account.paywallEyebrow')}</p>
              <h2>{t('account.paywallTitle')}</h2>
              <p>{t('account.paywallBody')}</p>
            </div>
            <div className="account-upgrade-banner__actions">
              <button type="button" className="btn-primary" onClick={() => handleGoToCheckout('paypal')}>
                {t('account.checkoutPaypal')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleGoToCheckout('bank_transfer')}>
                {t('account.checkoutWire')}
              </button>
            </div>
          </section>
        ) : null}

        <section className="hero home-hero">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <p className="eyebrow">{t('account.heroEyebrow')}</p>
              <h1>{t('account.heroTitle')}</h1>
              <p>{t('account.heroBody')}</p>
              <div className="home-hero-trust">
                <a href="#account-profile">{t('account.heroProfile')}</a>
                <a href="#account-security">{t('account.heroSecurity')}</a>
                <a href="#account-pricing">{t('account.heroPricing')}</a>
              </div>
            </div>
            <aside className="home-hero-summary" aria-label={t('account.summaryAria')}>
              {String(me?.picture_url || guard.user?.picture_url || '').trim() ? (
                <img
                  src={String(me?.picture_url || guard.user?.picture_url || '').trim()}
                  alt={t('account.avatarAlt', { name: userLabel })}
                  className="account-avatar-photo"
                />
              ) : (
                <span className="account-avatar-fallback" aria-hidden="true">
                  {String(userLabel || 'M')
                    .split(' ')
                    .map((part) => String(part || '').trim().slice(0, 1).toUpperCase())
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('') || 'M'}
                </span>
              )}
              <p className="home-hero-summary__eyebrow">{t('account.yourAccount')}</p>
              <strong className="home-hero-summary__title">{String(me?.email || guard.user?.email || '').trim() || '-'}</strong>
              <ul className="home-hero-summary__list">
                <li>{t('account.activePlan')} <strong>{currentPlanLabel}</strong></li>
                <li>{t('account.role')} {roleLabel}</li>
              </ul>
            </aside>
          </div>
        </section>

        <div className="account-card-container">
          <section id="account-profile" className="account-saas-card">
            <header className="account-saas-card__header">
              <p className="eyebrow">{t('account.profileEyebrow')}</p>
              <h2 className="account-saas-card__title">{t('account.profileTitle')}</h2>
              <p className="account-saas-card__subtitle">{t('account.profileSubtitle')}</p>
            </header>
            <form className="account-saas-card__body" onSubmit={handleSaveProfile}>
              <div className="account-form-grid">
                <div className="account-form-field">
                  <label className="account-form-label" htmlFor="account-first-name">{t('account.firstName')}</label>
                  <input
                    id="account-first-name"
                    className="account-form-input account-form-input--disabled"
                    type="text"
                    value={profileForm.first_name}
                    disabled
                    readOnly
                  />
                </div>
                <div className="account-form-field">
                  <label className="account-form-label" htmlFor="account-last-name">{t('account.lastName')}</label>
                  <input
                    id="account-last-name"
                    className="account-form-input account-form-input--disabled"
                    type="text"
                    value={profileForm.last_name}
                    disabled
                    readOnly
                  />
                </div>
                <div className="account-form-field account-form-field--full">
                  <label className="account-form-label" htmlFor="account-job-title">{t('account.jobTitle')}</label>
                  <input
                    id="account-job-title"
                    className="account-form-input"
                    type="text"
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, job_title: e.target.value }))}
                    placeholder={t('account.jobTitlePlaceholder')}
                  />
                </div>
                <div className="account-form-field account-form-field--full">
                  <label className="account-form-label" htmlFor="account-department">{t('account.department')}</label>
                  <input
                    id="account-department"
                    className="account-form-input"
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder={t('account.departmentPlaceholder')}
                  />
                </div>
              </div>
              <p className="account-form-hint">{t('account.immutableNameHint')}</p>
              <div className="account-saas-card__actions">
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? t('account.savingProfile') : t('account.saveProfile')}
                </button>
              </div>
            </form>
          </section>

          <section id="account-security" className="account-saas-card">
            <header className="account-saas-card__header">
              <p className="eyebrow">{t('account.securityEyebrow')}</p>
              <h2 className="account-saas-card__title">{t('account.securityTitle')}</h2>
              <p className="account-saas-card__subtitle">{t('account.securitySubtitle')}</p>
            </header>
            <form className="account-saas-card__body" onSubmit={handleUpdatePassword}>
              <div className="account-form-grid">
                <div className="account-form-field account-form-field--full">
                  <label className="account-form-label" htmlFor="account-current-password">{t('account.currentPassword')}</label>
                  <input
                    id="account-current-password"
                    className="account-form-input"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                    placeholder={t('account.currentPasswordPlaceholder')}
                  />
                </div>
                <div className="account-form-field">
                  <label className="account-form-label" htmlFor="account-new-password">{t('account.newPassword')}</label>
                  <input
                    id="account-new-password"
                    className="account-form-input"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    placeholder={t('account.newPasswordPlaceholder')}
                    minLength={8}
                  />
                </div>
                <div className="account-form-field">
                  <label className="account-form-label" htmlFor="account-confirm-password">{t('account.confirmPassword')}</label>
                  <input
                    id="account-confirm-password"
                    className="account-form-input"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    placeholder={t('account.confirmPasswordPlaceholder')}
                  />
                </div>
              </div>
              <div className="account-saas-card__actions account-saas-card__actions--split">
                <button type="button" className="btn-secondary" onClick={handleResetPassword} disabled={resettingPassword}>
                  {resettingPassword ? t('account.generating') : t('account.forgotPassword')}
                </button>
                <button type="submit" className="btn-primary" disabled={savingPassword}>
                  {savingPassword ? t('account.updating') : t('account.changePassword')}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section id="account-pricing" className="account-pricing-section">
          <div className="account-pricing-surface">
            <header className="account-pricing-head">
              <div>
                <p className="eyebrow">{t('account.pricingEyebrow')}</p>
                <h2>{t('account.pricingTitle')}</h2>
                <p>{t('account.pricingSubtitle')}</p>
              </div>
              {activePlan ? (
                <div className="account-active-plan-badge">
                  <span className="eyebrow">{t('account.activeBadgeEyebrow')}</span>
                  <strong>{activePlan.name}</strong>
                </div>
              ) : null}
            </header>

            {plans.length > 0 ? (
              <div className="account-plan-cards-grid">
                {plans.map((plan) => {
                  const planId = String(plan.id);
                  const isCurrent = planId === String(currentPlanId || '');
                  const isRecommended = recommendedPlan && planId === String(recommendedPlan.id);
                  const priceFmt = formatPriceCents(plan.price_cents, plan.currency, locale);
                  return (
                    <article
                      key={planId}
                      className={[
                        'pricing-card account-pricing-card',
                        isCurrent ? 'account-pricing-card--current' : '',
                        isRecommended ? 'pricing-card-featured' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="pricing-card-top">
                        {isRecommended ? <span className="pricing-badge">{t('account.recommended')}</span> : null}
                        {isCurrent ? <span className="account-current-badge">{t('account.yourPlan')}</span> : null}
                        <p className="eyebrow">{plan.name}</p>
                      </div>
                      <h3 className="pricing-price">
                        {priceFmt}
                        <span>/mois</span>
                      </h3>
                      {plan.description ? <p className="pricing-description">{plan.description}</p> : null}
                      {Array.isArray(plan.features) && plan.features.length > 0 ? (
                        <ul className="pricing-feature-list">
                          {plan.features.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="pricing-meta-row">
                        {plan.max_users ? <span>{t('account.usersCount', { count: plan.max_users })}</span> : null}
                        {plan.max_sessions_per_month ? <span>{t('account.sessionsPerMonth', { count: plan.max_sessions_per_month })}</span> : null}
                      </div>
                      {isCurrent ? (
                        <div className="pricing-actions account-plan-card-actions">
                          <span className="account-current-plan-tag">{t('account.activePlanTag')}</span>
                        </div>
                      ) : (
                        <div className="pricing-actions account-plan-card-actions">
                          <PaddleCheckoutButton
                            pricingPlanId={plan.id}
                            billingCycle="monthly"
                            customerEmail={String(me?.email || guard.user?.email || '')}
                            className="btn-primary"
                            onSuccess={() => {
                              showSuccess(t('account.paddleSuccess') || 'Paiement reçu — votre plan sera mis à jour dans quelques instants.');
                              window.history.replaceState({}, '', window.location.pathname);
                            }}
                          />
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleGoToCheckout('paypal', plan.id)}
                          >
                            {t('account.checkoutPaypal')}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleGoToCheckout('bank_transfer', plan.id)}
                          >
                            {t('account.checkoutWire')}
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

            {planHistory.length > 0 ? (
              <div className="account-plan-history">
                <p className="eyebrow">{t('account.historyEyebrow')}</p>
                <ul className="session-list">
                  {planHistory.map((entry) => (
                    <li key={String(entry.id)} className="session-item">
                      <div>
                        <p className="session-title">{entry.from} {" -> "} {entry.to}</p>
                        <p className="session-meta">{formatDate(entry.at, locale)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {planHistory.length === 0 ? (
              <p className="account-history-empty">{t('account.noHistory')}</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
