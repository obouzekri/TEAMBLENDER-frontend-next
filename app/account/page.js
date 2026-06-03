"use client";

import { useEffect, useMemo, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
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

const PLAN_HISTORY_STORAGE_KEY = 'accountPlanChangeHistory';
const RECOMMENDED_PRO_DEFAULT_EMAIL = 'obouzekri@teamblender.com';

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

function formatDate(dateValue) {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export default function AccountPage() {
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
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
      window.location.replace('/login');
      return;
    }

    if (current.role === 'participant') {
      window.location.replace('/participant');
      return;
    }

    setGuard({ loading: false, allowed: true, user: current });
  }, []);

  // --- Handle return from PayPal approval ---
  useEffect(() => {
    if (!guard.allowed) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const billing = String(params.get('billing') || '').trim();
    if (billing !== 'paypal_return') return;

    const paypalToken = String(params.get('token') || '').trim();
    const planId = String(params.get('plan_id') || '').trim() || null;

    if (!paypalToken) {
      showError('Retour PayPal sans identifiant de commande. Veuillez contacter le support.');
      return;
    }

    // Clean URL params immediately to avoid re-triggering
    window.history.replaceState({}, '', window.location.pathname);

    (async () => {
      try {
        const result = await capturePaypalOrder({ order_id: paypalToken, pricing_plan_id: planId });
        const planName = result?.plan?.name;
        showSuccess(
          planName
            ? `Paiement confirmé ! Votre plan ${planName} est maintenant actif.`
            : 'Paiement PayPal confirmé ! Votre compte est activé.'
        );
        const [updatedMe, updatedPlans] = await Promise.all([getMe(), listPricingPlans()]);
        if (updatedMe) {
          setMe(updatedMe);
          setSelectedPlanId(updatedMe.pricing_plan_id ? String(updatedMe.pricing_plan_id) : '');
          const mergedUser = {
            ...(guard.user || {}),
            pricing_plan_id: updatedMe.pricing_plan_id || null,
            pricing_plan: updatedMe.pricing_plan || null,
          };
          setStoredCurrentUser(mergedUser);
          setGuard((prev) => ({ ...prev, user: mergedUser }));
        }
        if (Array.isArray(updatedPlans)) setPlans(normalizePlanList(updatedPlans));
      } catch (err) {
        showError(err.message || 'Confirmation du paiement PayPal échouée. Veuillez contacter le support.');
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
          showError(meResult.reason?.message || 'Impossible de charger les informations du compte.');
        }

        if (plansResult.status === 'rejected') {
          showError(plansResult.reason?.message || 'Impossible de charger les plans tarifaires.');
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
  }, [guard.allowed, showError]);

  const userLabel = useMemo(() => normalizeDisplayName(guard.user), [guard.user]);

  const currentPlanId = me?.pricing_plan_id ? String(me.pricing_plan_id) : '';
  const activePlan = useMemo(() => {
    if (!currentPlanId) return null;
    return plans.find((plan) => String(plan.id) === currentPlanId) || null;
  }, [plans, currentPlanId]);

  const normalizedEmail = String(me?.email || guard.user?.email || '').trim().toLowerCase();
  const isPaywallEntry = entrySource === 'paywall';

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
      showSuccess('Profil mis à jour.');
    } catch (err) {
      showError(err.message || 'Mise à jour du profil impossible.');
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
      showError('Tous les champs mot de passe sont requis.');
      return;
    }
    if (nextPassword.length < 8) {
      showError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      showError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setSavingPassword(true);
    try {
      await updateMyPassword(currentPassword, nextPassword);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showSuccess('Mot de passe modifié avec succès.');
    } catch (err) {
      showError(err.message || 'Modification du mot de passe impossible.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleResetPassword() {
    if (resettingPassword || !me?.id) return;

    const confirmed = window.confirm('Générer un mot de passe temporaire maintenant ?');
    if (!confirmed) return;

    setResettingPassword(true);
    try {
      const result = await resetMyPassword(me.id);
      const temp = String(result?.tempPassword || '').trim();
      if (!temp) {
        showSuccess('Mot de passe réinitialisé.');
        return;
      }

      showSuccess(`Mot de passe temporaire généré: ${temp}`);
      if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(temp).catch(() => undefined);
      }
    } catch (err) {
      showError(err.message || 'Réinitialisation impossible.');
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleChangePlan(event) {
    event.preventDefault();
    if (savingPlan) return;

    const nextPlanId = selectedPlanId || null;
    if (String(nextPlanId || '') === String(currentPlanId || '')) {
      showError('Ce plan est déjà actif sur votre compte.');
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
        from: previousPlan ? previousPlan.name : 'Aucun plan',
        to: latestPlan ? latestPlan.name : 'Aucun plan',
      };
      const nextHistory = [historyEntry, ...planHistory].slice(0, 15);
      setPlanHistory(nextHistory);
      saveHistory(nextHistory);

      showSuccess('Plan tarifaire mis à jour.');
    } catch (err) {
      if (err.code === 'PRICING_SCHEMA_UNAVAILABLE') {
        showError('La tarification est temporairement indisponible. La migration pricing_plan_id doit être appliquée côté backend.');
      } else {
        showError(err.message || 'Changement de plan impossible.');
      }
    } finally {
      setSavingPlan(false);
    }
  }

  function handleGoToCheckout(method, planId) {
    const targetPlanId = planId || recommendedPlan?.id || activePlan?.id;
    if (!targetPlanId) {
      showError('Aucun plan disponible. Rechargez la page.');
      return;
    }
    window.location.assign(
      `/account/checkout?plan_id=${encodeURIComponent(String(targetPlanId))}&method=${encodeURIComponent(String(method))}`
    );
  }

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace('/login');
  }

  if (guard.loading || loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Chargement du compte...</h1>
          <p>Merci de patienter.</p>
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
          <section className="feature-card" aria-label="Limite de plan atteinte">
            <p className="eyebrow">LIMITE DE PLAN ATTEINTE</p>
            <h2>Votre formule actuelle a atteint sa limite de sessions.</h2>
            <p>
              if (guard.loading || loading) {
                return (
                  <main className="shell auth-page">
                    <section className="feature-card">
                      <h1>Chargement du compte…</h1>
                      <p>Merci de patienter.</p>
                    </section>
                  </main>
                );
              }

              return (
                <>
                  <ToastContainer toasts={toasts} onRemove={removeToast} />
                  <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
                  <main className="shell app-home account-page">

                    {/* Paywall banner */}
                    {isPaywallEntry ? (
                      <section className="account-upgrade-banner" aria-label="Limite de plan atteinte">
                        <div className="account-upgrade-banner__body">
                          <p className="eyebrow">LIMITE ATTEINTE</p>
                          <h2>Votre formule a atteint sa limite de sessions.</h2>
                          <p>Passez à Pro pour continuer sans interruption.</p>
                        </div>
                        <div className="account-upgrade-banner__actions">
                          <button type="button" className="btn-primary" onClick={() => handleGoToCheckout('paypal')}>
                            Payer avec PayPal
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => handleGoToCheckout('bank_transfer')}>
                            Demander par virement
                          </button>
                        </div>
                      </section>
                    ) : null}

                    {/* Hero */}
                    <section className="hero home-hero">
                      <div className="home-hero-grid">
                        <div className="home-hero-copy">
                          <p className="eyebrow">ESPACE MANAGER</p>
                          <h1>Mon compte</h1>
                          <p>Gérez votre profil, votre sécurité et votre formule depuis un seul espace.</p>
                          <div className="home-hero-trust">
                            <span>Profil</span>
                            <span>Sécurité</span>
                            <span>Tarification</span>
                          </div>
                        </div>
                        <aside className="home-hero-summary" aria-label="Synthèse compte">
                          <p className="home-hero-summary__eyebrow">Votre compte</p>
                          <strong className="home-hero-summary__title">{String(me?.email || guard.user?.email || '').trim() || '—'}</strong>
                          <ul className="home-hero-summary__list">
                            <li>Formule&nbsp;: <strong>{activePlan?.name || 'Aucun plan'}</strong></li>
                            <li>Rôle&nbsp;: {String(guard.user?.role || '').toLowerCase() === 'admin' ? 'Admin' : 'Manager'}</li>
                          </ul>
                        </aside>
                      </div>
                    </section>

                    {/* ── Profil + Sécurité ── */}
                    <div className="account-sections-row">

                      <section className="account-section">
                        <header className="account-section-head">
                          <p className="eyebrow">PROFIL</p>
                          <h2>Informations professionnelles</h2>
                        </header>
                        <form onSubmit={handleSaveProfile}>
                          <div className="account-fields-grid">
                            <div className="account-field-card">
                              <label>
                                Prénom
                                <input type="text" value={profileForm.first_name} disabled readOnly />
                              </label>
                            </div>
                            <div className="account-field-card">
                              <label>
                                Nom
                                <input type="text" value={profileForm.last_name} disabled readOnly />
                              </label>
                            </div>
                            <div className="account-field-card account-field-card--full">
                              <label>
                                Fonction
                                <input
                                  type="text"
                                  value={profileForm.job_title}
                                  onChange={(e) => setProfileForm((prev) => ({ ...prev, job_title: e.target.value }))}
                                  placeholder="Ex : HR Manager"
                                />
                              </label>
                            </div>
                            <div className="account-field-card account-field-card--full">
                              <label>
                                Département
                                <input
                                  type="text"
                                  value={profileForm.department}
                                  onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                                  placeholder="Ex : Ressources Humaines"
                                />
                              </label>
                            </div>
                          </div>
                          <p className="participant-form-hint account-field-hint">Prénom et nom sont définis à la création du compte.</p>
                          <div className="participant-form-actions" style={{ marginTop: '1rem' }}>
                            <button type="submit" className="btn-primary" disabled={savingProfile}>
                              {savingProfile ? 'Enregistrement…' : 'Enregistrer le profil'}
                            </button>
                          </div>
                        </form>
                      </section>

                      <section className="account-section">
                        <header className="account-section-head">
                          <p className="eyebrow">SÉCURITÉ</p>
                          <h2>Mot de passe</h2>
                        </header>
                        <form onSubmit={handleUpdatePassword}>
                          <div className="account-fields-grid">
                            <div className="account-field-card account-field-card--full">
                              <label>
                                Mot de passe actuel
                                <input
                                  type="password"
                                  value={passwordForm.current_password}
                                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                                  placeholder="Votre mot de passe actuel"
                                />
                              </label>
                            </div>
                            <div className="account-field-card">
                              <label>
                                Nouveau mot de passe
                                <input
                                  type="password"
                                  value={passwordForm.new_password}
                                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                                  placeholder="Minimum 8 caractères"
                                  minLength={8}
                                />
                              </label>
                            </div>
                            <div className="account-field-card">
                              <label>
                                Confirmation
                                <input
                                  type="password"
                                  value={passwordForm.confirm_password}
                                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                                  placeholder="Retapez le nouveau mot de passe"
                                />
                              </label>
                            </div>
                          </div>
                          <div className="participant-form-actions account-actions-stack" style={{ marginTop: '1rem' }}>
                            <button type="submit" className="btn-primary" disabled={savingPassword}>
                              {savingPassword ? 'Mise à jour…' : 'Modifier le mot de passe'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleResetPassword} disabled={resettingPassword}>
                              {resettingPassword ? 'Génération…' : 'Mot de passe oublié'}
                            </button>
                          </div>
                        </form>
                      </section>

                    </div>

                    {/* ── Tarification ── */}
                    <section className="account-pricing-section">
                      <header className="account-pricing-head">
                        <div>
                          <p className="eyebrow">TARIFICATION</p>
                          <h2>Votre formule</h2>
                          <p>Choisissez la formule adaptée à vos besoins d&apos;équipe.</p>
                        </div>
                        {activePlan ? (
                          <div className="account-active-plan-badge">
                            <span className="eyebrow">Formule active</span>
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
                            const priceFmt = formatPriceCents(plan.price_cents, plan.currency);
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
                                  {isRecommended ? <span className="pricing-badge">Recommandé</span> : null}
                                  {isCurrent ? <span className="account-current-badge">Votre formule</span> : null}
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
                                  {plan.max_users ? <span>{plan.max_users} utilisateurs</span> : null}
                                  {plan.max_sessions_per_month ? <span>{plan.max_sessions_per_month} sessions/mois</span> : null}
                                </div>
                                {isCurrent ? (
                                  <div className="pricing-actions account-plan-card-actions">
                                    <span className="account-current-plan-tag">✓ Formule active</span>
                                  </div>
                                ) : (
                                  <div className="pricing-actions account-plan-card-actions">
                                    <button
                                      type="button"
                                      className="btn-primary"
                                      onClick={() => handleGoToCheckout('paypal', plan.id)}
                                    >
                                      Payer avec PayPal
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      onClick={() => handleGoToCheckout('bank_transfer', plan.id)}
                                    >
                                      Demander par virement
                                    </button>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="field-help">Aucune formule disponible pour le moment.</p>
                      )}

                      {planHistory.length > 0 ? (
                        <div className="account-plan-history">
                          <p className="eyebrow">HISTORIQUE</p>
                          <ul className="session-list">
                            {planHistory.map((entry) => (
                              <li key={String(entry.id)} className="session-item">
                                <div>
                                  <p className="session-title">{entry.from} → {entry.to}</p>
                                  <p className="session-meta">{formatDate(entry.at)}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </section>

                  </main>
                  <Footer />
                </>
              );
