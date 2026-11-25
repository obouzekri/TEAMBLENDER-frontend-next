"use client";

import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Download, ReceiptText, ShieldCheck, UserRound } from 'lucide-react';
import AppNav from '@/components/AppNav';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import Footer from '@/components/Footer';
import Modal from '@/components/ui/Modal';
import ToastContainer from '@/components/ToastContainer';
import AccountInvoicesPanel from './AccountInvoicesPanel';
import AccountPricingPanel from './AccountPricingPanel';
import AccountProfilePanel from './AccountProfilePanel';
import AccountSecurityPanel from './AccountSecurityPanel';
import useToast from '@/lib/useToast';
import {
  getMe,
  getParticipantMe,
  updateMe,
  updateMyPassword,
  updateMyParticipantPassword,
  resetMyPassword,
  listPricingPlans,
  updateMyPlan,
  capturePaypalOrder,
  getStoredCurrentUser,
  setStoredCurrentUser,
} from '@/lib/account';
import { clearStoredAuth } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';
import {
  ensureUserAvatarProfile,
  resolveUserAvatar,
  updateUserAvatarProfile,
} from '@/lib/avatar-profile';
import {
  buildDhPriceByPlanId,
  buildInvoiceDownload,
  formatDhAmount,
  getAccountPlanPriceLabel,
  getPlanCycleLabel,
  getRenewalDate,
  normalizePlanList,
  resolveHistoryAmountLabel,
} from '@/lib/account-page/pricing';
import {
  formatCount,
  formatDate,
  normalizeDepartmentDisplay,
  normalizeDisplayName,
  parseHistory,
  saveHistory,
  toNameTitleCase,
} from '@/lib/account-page/utils';
import './account.css';

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
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [planHistory, setPlanHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    function readAccountLocation() {
      const params = new URLSearchParams(window.location.search);
      const tab = String(params.get('tab') || '').trim().toLowerCase();
      const participant = String(getStoredCurrentUser()?.role || '').toLowerCase() === 'participant';
      const nextTab = participant ? 'security' : ['profile', 'security', 'pricing', 'invoices'].includes(tab) ? tab : 'profile';
      setEntrySource(String(params.get('source') || '').trim().toLowerCase());
      setActiveTab(nextTab);
      if (params.has('tab') && params.get('tab') !== nextTab) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', nextTab);
        window.history.replaceState(null, '', url);
      }
    }
    readAccountLocation();
    window.addEventListener('popstate', readAccountLocation);
    return () => window.removeEventListener('popstate', readAccountLocation);
  }, []);

  useEffect(() => {
    const current = getStoredCurrentUser();
    if (!current) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    const normalizedCurrent = ensureUserAvatarProfile(current);
    setStoredCurrentUser(normalizedCurrent);
    setGuard({ loading: false, allowed: true, user: normalizedCurrent });
    if (String(current.role || '').toLowerCase() === 'participant') {
      setActiveTab('security');
    }
  }, []);

  useEffect(() => {
    if (!guard.allowed) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const billing = String(params.get('billing') || '').trim();
    const reference = String(params.get('reference') || '').trim();
    const planId = String(params.get('plan_id') || '').trim() || null;

    if (billing === 'payoneer_return') {
      if (!reference) {
        showError(t('account.payoneerReturnMissingReference'));
        return;
      }

      window.history.replaceState({}, '', window.location.pathname);

      (async () => {
        try {
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
            const withAvatarProfile = ensureUserAvatarProfile(mergedUser);
            setStoredCurrentUser(withAvatarProfile);
            setGuard((prev) => ({ ...prev, user: withAvatarProfile }));
          }
          if (Array.isArray(updatedPlans)) setPlans(normalizePlanList(updatedPlans));

          const planName = updatedMe?.pricing_plan?.name || null;
          showSuccess(
            planName
              ? t('account.payoneerConfirmedWithPlan', { plan: planName })
              : t('account.payoneerConfirmedGeneric')
          );
        } catch (err) {
          showError(err.message || t('account.payoneerConfirmError'));
        }
      })();
      return;
    }

    if (billing !== 'paypal_return') return;

    const paypalToken = String(params.get('token') || '').trim();

    if (!paypalToken) {
      showError(t('account.paypalReturnMissingOrder'));
      return;
    }

    window.history.replaceState({}, '', window.location.pathname);

    (async () => {
      try {
        const result = await capturePaypalOrder({ order_id: paypalToken, pricing_plan_id: planId, billing_cycle: params.get('billing_cycle') || 'monthly' });
        const planName = result?.plan?.name;
        showSuccess(
          planName
            ? t('account.paypalConfirmedWithPlan', { plan: planName })
            : t('account.paypalConfirmedGeneric')
        );

        const [updatedMe, updatedPlans] = await Promise.all([getMe(), listPricingPlans()]);
        const normalizedPlans = Array.isArray(updatedPlans) ? normalizePlanList(updatedPlans) : [];
        const dhMap = buildDhPriceByPlanId(normalizedPlans);
        if (updatedMe) {
          setMe(updatedMe);
          setSelectedPlanId(updatedMe.pricing_plan_id ? String(updatedMe.pricing_plan_id) : '');
          const mergedUser = {
            ...(guard.user || {}),
            pricing_plan_id: updatedMe.pricing_plan_id || null,
            pricing_plan: updatedMe.pricing_plan || null,
            picture_url: updatedMe.picture_url || null,
          };
          const withAvatarProfile = ensureUserAvatarProfile(mergedUser);
          setStoredCurrentUser(withAvatarProfile);
          setGuard((prev) => ({ ...prev, user: withAvatarProfile }));
        }
        if (normalizedPlans.length > 0) setPlans(normalizedPlans);

        const paypalPlanId = String(result?.plan?.id || planId || updatedMe?.pricing_plan_id || '').trim();
        if (paypalPlanId) {
          const amountDh = Number(dhMap[paypalPlanId] || 0);
          const historyEntry = {
            id: Date.now(),
            at: new Date().toISOString(),
            from: '',
            to: result?.plan?.name || updatedMe?.pricing_plan?.name || 'Plan',
            to_plan_id: paypalPlanId,
            amount_dh: amountDh,
            amount_label: `${formatDhAmount(amountDh)} HT`,
            invoice_pdf_url: String(result?.invoice_pdf_url || result?.pdf_url || '').trim() || null,
          };
          const existingHistory = parseHistory();
          const nextHistory = [historyEntry, ...existingHistory].slice(0, 15);
          setPlanHistory(nextHistory);
          saveHistory(nextHistory);
        }
      } catch (err) {
        showError(err.message || t('account.paypalConfirmError'));
      }
    })();
  }, [guard.allowed]);

  useEffect(() => {
    if (!guard.allowed) return;

    let cancelled = false;
    setLoading(true);

    const isParticipantAccount = String(guard.user?.role || '').toLowerCase() === 'participant';
    const accountRequest = isParticipantAccount ? getParticipantMe() : getMe();
    const plansRequest = isParticipantAccount ? Promise.resolve([]) : listPricingPlans();

    Promise.allSettled([accountRequest, plansRequest])
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
          first_name: toNameTitleCase(mePayload?.first_name),
          last_name: toNameTitleCase(mePayload?.last_name),
          job_title: isParticipantAccount ? '' : String(mePayload?.job_title || '').trim(),
          department: isParticipantAccount ? '' : normalizeDepartmentDisplay(mePayload?.department),
        });
        setSelectedPlanId(mePayload?.pricing_plan_id ? String(mePayload.pricing_plan_id) : '');

        const existingHistory = parseHistory();
        setPlanHistory(existingHistory);

        if (mePayload) {
          setGuard((prev) => {
            const mergedUser = {
              ...(prev.user || {}),
              first_name: toNameTitleCase(mePayload?.first_name),
              last_name: toNameTitleCase(mePayload?.last_name),
              name: mePayload?.name,
              job_title: isParticipantAccount ? '' : mePayload?.job_title,
              department: isParticipantAccount ? '' : mePayload?.department,
              picture_url: mePayload?.picture_url || null,
              pricing_plan_id: mePayload?.pricing_plan_id || null,
              pricing_plan: mePayload?.pricing_plan || null,
            };
            const withAvatarProfile = ensureUserAvatarProfile(mergedUser);
            setStoredCurrentUser(withAvatarProfile);
            return { ...prev, user: withAvatarProfile };
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, guard.user?.role, showError, t]);

  const userLabel = useMemo(() => normalizeDisplayName(guard.user), [guard.user]);
  const resolvedAvatar = useMemo(() => resolveUserAvatar(guard.user, userLabel), [guard.user, userLabel]);
  const resolvedAvatarUrl = String(resolvedAvatar?.avatarUrl || '').trim();
  const profileIdentityInitials = String(resolvedAvatar?.avatarInitials || 'OB').trim() || 'OB';

  const freePlan = useMemo(() => {
    return plans.find((plan) => {
      const slug = String(plan?.slug || '').toLowerCase();
      const name = String(plan?.name || '').toLowerCase();
      const cents = Number(plan?.price_cents || 0);
      return plan?.plan_code === 'trial' || slug === 'free' || name === 'free' || cents === 0;
    }) || null;
  }, [plans]);

  const currentPlanId = me?.pricing_plan_id
    ? String(me.pricing_plan_id)
    : (freePlan?.id ? String(freePlan.id) : '');

  const activePlan = useMemo(() => {
    if (!currentPlanId) return freePlan;
    return plans.find((plan) => String(plan.id) === currentPlanId) || freePlan;
  }, [plans, currentPlanId, freePlan]);

  const isPaywallEntry = entrySource === 'paywall';
  const isParticipantAccount = String(guard.user?.role || '').toLowerCase() === 'participant';
  const currentPlanLabel = activePlan?.localized_content?.[locale]?.name || activePlan?.name || t('account.noPlan');
  const historyCount = planHistory.length;
  const roleLabel = isParticipantAccount
    ? t('account.roleParticipant')
    : String(guard.user?.role || '').toLowerCase() === 'admin'
      ? t('account.roleAdmin')
      : t('account.roleManager');
  const cycleLabel = getPlanCycleLabel(locale, me, activePlan);
  const renewalLabel = getRenewalDate(me, locale);
  const planSeats = activePlan?.plan_code === 'enterprise'
    ? (me?.participant_limit || activePlan?.max_users || 100)
    : (activePlan?.max_users || me?.max_users || 0);
  const dhPriceByPlanId = useMemo(() => buildDhPriceByPlanId(plans), [plans]);
  const isFreePlanActive = activePlan?.plan_code === 'trial'
    || String(activePlan?.slug || activePlan?.name || '').toLowerCase().includes('free')
    || Number(activePlan?.price_cents || 0) === 0;
  // Trial: `max_sessions_per_month` is a total over the trial; paid plans have no session cap.
  const planSessionCap = Number(activePlan?.max_sessions_per_month || 0);
  const usageSubtitle = planSessionCap > 0
    ? t('account.planUsageSummaryLimited', { count: formatCount(planSeats, locale), sessions: formatCount(planSessionCap, locale) })
    : t('account.planUsageSummary', { count: formatCount(planSeats, locale) });

  const lastPaidHistory = useMemo(() => {
    if (!Array.isArray(planHistory) || planHistory.length === 0) return null;
    return planHistory.find((entry) => {
      const amount = Number(entry?.amount_dh || 0);
      const toPlan = String(entry?.to || '').toLowerCase();
      return amount > 0 || toPlan.includes('pro');
    }) || null;
  }, [planHistory]);

  const billingStatusHint = useMemo(() => {
    if (!isFreePlanActive || !lastPaidHistory) return '';
    const dateLabel = formatDate(lastPaidHistory.at, locale);
    if (dateLabel) {
      return t('account.previousProEnded', { date: dateLabel });
    }
    return t('account.previousProEndedGeneric');
  }, [isFreePlanActive, lastPaidHistory, locale, t]);

  const recommendedPlan = useMemo(() => {
    return plans.find((plan) => plan.plan_code === 'team') || null;
  }, [plans]);

  const isProfileDirty = useMemo(() => {
    const jobNow = String(profileForm.job_title || '').trim();
    const depNow = String(profileForm.department || '').trim();
    const jobBase = String(me?.job_title || '').trim();
    const depBase = String(me?.department || '').trim();
    return jobNow !== jobBase || depNow !== depBase;
  }, [me?.department, me?.job_title, profileForm.department, profileForm.job_title]);

  const passwordChecks = useMemo(() => {
    const candidate = String(passwordForm.new_password || '');
    const hasLength = candidate.length >= 8;
    const hasNumber = /\d/.test(candidate);
    const hasSymbol = /[^A-Za-z0-9]/.test(candidate);
    const score = [hasLength, hasNumber, hasSymbol].filter(Boolean).length;
    const percent = Math.round((score / 3) * 100);
    const level = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';
    return { hasLength, hasNumber, hasSymbol, score, percent, level };
  }, [passwordForm.new_password]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (savingProfile) return;

    setSavingProfile(true);
    try {
      const payload = {
        job_title: profileForm.job_title || null,
        department: normalizeDepartmentDisplay(profileForm.department) || null,
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
      const isParticipantAccount = String(guard.user?.role || '').toLowerCase() === 'participant';
      await (isParticipantAccount ? updateMyParticipantPassword : updateMyPassword)(currentPassword, nextPassword);
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
      const amountDh = Number(dhPriceByPlanId[latestPlanId] || 0);

      setMe(updatedUser);
      setSelectedPlanId(latestPlanId);

      const mergedUser = {
        ...(guard.user || {}),
        pricing_plan_id: updatedUser?.pricing_plan_id || null,
        pricing_plan: updatedUser?.pricing_plan || null,
      };
      const withAvatarProfile = ensureUserAvatarProfile(mergedUser);
      setStoredCurrentUser(withAvatarProfile);
      setGuard((prev) => ({ ...prev, user: withAvatarProfile }));

      const historyEntry = {
        id: Date.now(),
        at: new Date().toISOString(),
        from: previousPlan ? previousPlan.name : 'Aucune formule',
        to: latestPlan ? latestPlan.name : 'Aucune formule',
        to_plan_id: latestPlanId || null,
        amount_dh: amountDh,
        amount_label: `${formatDhAmount(amountDh)} HT`,
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

  async function handleGoToCheckout(method, planId) {
    const targetPlanId = planId || recommendedPlan?.id || activePlan?.id;
    if (!targetPlanId) {
      showError(t('account.noPlanAvailable'));
      return;
    }

    window.location.assign(
      `${withLocalePath('/account/checkout')}?plan_id=${encodeURIComponent(String(targetPlanId))}&method=${encodeURIComponent(String(method))}&billing_cycle=${encodeURIComponent(selectedBilling)}`
    );
  }

  async function handleChoosePlan(planId) {
    const targetPlanId = planId || recommendedPlan?.id || activePlan?.id;
    if (!targetPlanId) {
      showError(t('account.noPlanAvailable'));
      return;
    }

    const targetPlan = plans.find((plan) => String(plan.id) === String(targetPlanId)) || null;
    if (Number(targetPlan?.price_cents || 0) <= 0) {
      setSelectedPlanId(String(targetPlanId));
      showSuccess('Formule Free sélectionnée.');
      return;
    }

    // Paid plans are activated by the team after a request: no card checkout.
    const planCode = String(targetPlan?.plan_code || 'team').toLowerCase();
    window.location.assign(`${withLocalePath('/contact')}?plan=${encodeURIComponent(planCode)}`);
  }

  function closeCheckoutModal() {
    if (openingCheckout) return;
    setCheckoutModalOpen(false);
    setCheckoutPlan(null);
  }

  async function handleStartPlanCheckout(method) {
    const targetPlanId = checkoutPlan?.id;
    if (!targetPlanId || openingCheckout) return;

    setOpeningCheckout(true);
    try {
      window.location.assign(
        `${withLocalePath('/account/checkout')}?plan_id=${encodeURIComponent(String(targetPlanId))}&method=${encodeURIComponent(String(method))}&billing_cycle=${encodeURIComponent(selectedBilling)}`
      );
    } catch (err) {
      showError(err.message || 'Paiement indisponible.');
    } finally {
      setOpeningCheckout(false);
    }
  }

  function handleDownloadInvoice(entry) {
    const { href, filename, external } = buildInvoiceDownload(entry, locale);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.rel = 'noopener noreferrer';
    anchor.target = external ? '_blank' : '_self';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    if (!external) {
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
  }

  function logout() {
    clearStoredAuth();
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace(withLocalePath('/login'));
  }

  function handleAvatarSave(selection) {
    const baseUser = guard.user || me || {};
    const nextUser = updateUserAvatarProfile(baseUser, selection);
    setStoredCurrentUser(nextUser);
    setGuard((prev) => ({ ...prev, user: nextUser }));
    setAvatarPickerOpen(false);
    showSuccess(t('account.avatarUpdated'));
  }

  function selectAccountTab(tab) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== tab) {
      url.searchParams.set('tab', tab);
      window.history.pushState(null, '', url);
    }
  }

  function handleAccountTabKeyDown(event) {
    const tabs = isParticipantAccount ? ['security'] : ['profile', 'security', 'pricing', 'invoices'];
    const currentIndex = tabs.indexOf(activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    selectAccountTab(nextTab);
    document.getElementById(`account-tab-${nextTab}`)?.focus();
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
      <AppNav
        userLabel={userLabel}
        onLogout={logout}
        role={guard.user?.role}
        avatarUrl={resolvedAvatarUrl}
        avatarInitials={profileIdentityInitials}
      />
      <main className="shell app-home account-page">
        {isPaywallEntry && !isParticipantAccount ? (
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

        <section className="account-page-header" aria-label={t('account.accountHeaderAria')}>
          <div className="account-page-header__copy">
            <h1>{t('account.settingsTitle')}</h1>
            <p className="account-page-header__description">
              {isParticipantAccount
                ? t('account.participantHeaderDescription')
                : t('account.managerHeaderDescription')}
            </p>
          </div>
          <div className="account-page-header__identity" aria-label={t('account.accountIdentityAria')}>
            <span className="account-page-header__avatar">
              {resolvedAvatarUrl ? (
                <img src={resolvedAvatarUrl} alt={t('account.avatarAlt', { name: userLabel })} />
              ) : (
                profileIdentityInitials
              )}
            </span>
            <span className="account-page-header__identity-copy">
              <strong>{userLabel}</strong>
              <span>{String(me?.email || guard.user?.email || '').trim()}</span>
              <span className="account-page-header__role">{roleLabel}</span>
            </span>
          </div>
        </section>

        <div className="account-card-container">
          <div
            className="account-tabs account-tabs--modern"
            role="tablist"
            aria-label={t('account.accountSectionsAria')}
            onKeyDown={handleAccountTabKeyDown}
          >
            {!isParticipantAccount ? (
              <button type="button" id="account-tab-profile" role="tab" aria-controls="account-profile" aria-selected={activeTab === 'profile'} tabIndex={activeTab === 'profile' ? 0 : -1} className={`account-tab account-tab--modern ${activeTab === 'profile' ? 'is-active' : ''}`} onClick={() => selectAccountTab('profile')}>
                <UserRound size={17} aria-hidden="true" />
                {t('account.heroProfile')}
              </button>
            ) : null}
            <button type="button" id="account-tab-security" role="tab" aria-controls="account-security" aria-selected={activeTab === 'security'} tabIndex={activeTab === 'security' ? 0 : -1} className={`account-tab account-tab--modern ${activeTab === 'security' ? 'is-active' : ''}`} onClick={() => selectAccountTab('security')}>
              <ShieldCheck size={17} aria-hidden="true" />
              {t('account.heroSecurity')}
            </button>
            {!isParticipantAccount ? (
              <button type="button" id="account-tab-pricing" role="tab" aria-controls="account-pricing" aria-selected={activeTab === 'pricing'} tabIndex={activeTab === 'pricing' ? 0 : -1} className={`account-tab account-tab--modern ${activeTab === 'pricing' ? 'is-active' : ''}`} onClick={() => selectAccountTab('pricing')}>
                <CreditCard size={17} aria-hidden="true" />
                {t('account.pricingHeaderTitle')}
              </button>
            ) : null}
            {!isParticipantAccount ? (
              <button type="button" id="account-tab-invoices" role="tab" aria-controls="account-invoices" aria-selected={activeTab === 'invoices'} tabIndex={activeTab === 'invoices' ? 0 : -1} className={`account-tab account-tab--modern ${activeTab === 'invoices' ? 'is-active' : ''}`} onClick={() => selectAccountTab('invoices')}>
                <ReceiptText size={17} aria-hidden="true" />
                {t('account.invoicesTitle')}
              </button>
            ) : null}
          </div>

          <div className="account-panels">
          {!isParticipantAccount ? (
          <AccountProfilePanel
            activeTab={activeTab}
            avatarPickerOpen={avatarPickerOpen}
            guard={guard}
            handleSaveProfile={handleSaveProfile}
            isProfileDirty={isProfileDirty}
            me={me}
            profileForm={profileForm}
            profileIdentityInitials={profileIdentityInitials}
            resolvedAvatarUrl={resolvedAvatarUrl}
            savingProfile={savingProfile}
            setAvatarPickerOpen={setAvatarPickerOpen}
            setProfileForm={setProfileForm}
            t={t}
          />
          ) : null}

          <AccountSecurityPanel
            activeTab={activeTab}
            handleResetPassword={handleResetPassword}
            handleUpdatePassword={handleUpdatePassword}
            isParticipantAccount={isParticipantAccount}
            passwordChecks={passwordChecks}
            passwordForm={passwordForm}
            resettingPassword={resettingPassword}
            savingPassword={savingPassword}
            setPasswordForm={setPasswordForm}
            setShowConfirmPassword={setShowConfirmPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            showCurrentPassword={showCurrentPassword}
            showNewPassword={showNewPassword}
            t={t}
          />
        {!isParticipantAccount ? (
        <AccountPricingPanel
          activePlan={activePlan}
          activeTab={activeTab}
          billingStatusHint={billingStatusHint}
          currentPlanId={currentPlanId}
          currentPlanLabel={currentPlanLabel}
          handleChoosePlan={handleChoosePlan}
          isFreePlanActive={isFreePlanActive}
          locale={locale}
          plans={plans}
          selectedBilling={selectedBilling}
          setSelectedBilling={setSelectedBilling}
          t={t}
          usageSubtitle={usageSubtitle}
        />
        ) : null}

        {!isParticipantAccount ? (
          <AccountInvoicesPanel
            active={activeTab === 'invoices'}
            planHistory={planHistory}
            locale={locale}
            t={t}
            plans={plans}
            dhPriceByPlanId={dhPriceByPlanId}
            formatDate={formatDate}
            resolveHistoryAmountLabel={resolveHistoryAmountLabel}
            onDownloadInvoice={handleDownloadInvoice}
          />
        ) : null}
          </div>
        </div>

        <Modal
          open={checkoutModalOpen}
          title="Finaliser le paiement"
          onClose={closeCheckoutModal}
          bodyClassName="account-checkout-modal-body"
        >
          <div className="account-checkout-modal-content">
            <p>
              {`Vous avez sélectionné ${checkoutPlan?.localized_content?.[locale]?.name || checkoutPlan?.name || 'votre formule'} (${getAccountPlanPriceLabel(checkoutPlan, selectedBilling, locale)}).`}
            </p>
            <div className="account-checkout-modal-actions">
              <button type="button" className="btn-primary" onClick={() => handleStartPlanCheckout('paypal')} disabled={openingCheckout}>
                {openingCheckout ? 'Ouverture du paiement...' : t('account.checkoutPaypal')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleStartPlanCheckout('bank_transfer')} disabled={openingCheckout}>
                {t('account.checkoutWire')}
              </button>
            </div>
          </div>
        </Modal>

        <AvatarPickerModal
          open={avatarPickerOpen}
          user={guard.user || me}
          currentSelection={guard.user?.avatar_profile}
          onClose={() => setAvatarPickerOpen(false)}
          onSave={handleAvatarSave}
        />
      </main>
      <Footer />
    </>
  );
}
