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
  getStoredCurrentUser,
  setStoredCurrentUser,
} from '@/lib/account';

const PLAN_HISTORY_STORAGE_KEY = 'accountPlanChangeHistory';
const RECOMMENDED_PRO_DEFAULT_EMAIL = 'obouzekri@teamblender.com';

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

  useEffect(() => {
    if (!guard.allowed) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([getMe(), listPricingPlans()])
      .then(([mePayload, plansPayload]) => {
        if (cancelled) return;
        setMe(mePayload || null);
        setPlans(normalizePlanList(plansPayload));
        setProfileForm({
          first_name: String(mePayload?.first_name || '').trim(),
          last_name: String(mePayload?.last_name || '').trim(),
          job_title: String(mePayload?.job_title || '').trim(),
          department: String(mePayload?.department || '').trim(),
        });
        setSelectedPlanId(mePayload?.pricing_plan_id ? String(mePayload.pricing_plan_id) : '');

        const existingHistory = parseHistory();
        setPlanHistory(existingHistory);

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
      })
      .catch((err) => {
        if (cancelled) return;
        showError(err.message || 'Impossible de charger les informations du compte.');
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
        <section className="hero home-hero">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <p className="eyebrow">ESPACE MANAGER</p>
              <h1>Configuration du compte</h1>
              <p>Modifiez vos informations, gérez la sécurité et ajustez votre formule tarifaire depuis un seul espace.</p>
              <div className="home-hero-trust" aria-label="Raccourcis compte">
                <span>Profil</span>
                <span>Sécurité</span>
                <span>Tarification</span>
              </div>
            </div>
            <aside className="home-hero-summary" aria-label="Synthese compte">
              <p className="home-hero-summary__eyebrow">Compte</p>
              <strong className="home-hero-summary__title">{String(me?.email || guard.user?.email || '').trim() || 'Adresse email non disponible'}</strong>
              <ul className="home-hero-summary__list">
                <li>Plan actif: {activePlan?.name || 'Non défini'}</li>
                {recommendedPlan ? <li>Plan recommandé: {recommendedPlan.name}</li> : null}
                <li>Rôle: {String(guard.user?.role || '').toLowerCase() === 'admin' ? 'Admin' : 'Manager'}</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="cards-grid account-grid">
          <article className="feature-card account-card">
            <p className="eyebrow">PROFIL</p>
            <h2>Informations professionnelles</h2>
            <form className="participant-form participant-form--embedded" onSubmit={handleSaveProfile}>
              <div className="participant-form-grid">
                <label>
                  Prénom
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))}
                    disabled
                  />
                </label>
                <label>
                  Nom
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))}
                    disabled
                  />
                </label>
                <label>
                  Fonction
                  <input
                    type="text"
                    value={profileForm.job_title}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, job_title: event.target.value }))}
                    placeholder="Ex: HR Manager"
                  />
                </label>
                <label>
                  Département
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, department: event.target.value }))}
                    placeholder="Ex: Ressources Humaines"
                  />
                </label>
              </div>
              <p className="participant-form-hint">Prénom et nom sont gérés à la création du compte.</p>
              <div className="participant-form-actions">
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}
                </button>
              </div>
            </form>
          </article>

          <article className="feature-card account-card">
            <p className="eyebrow">SÉCURITÉ</p>
            <h2>Mot de passe</h2>
            <form className="participant-form participant-form--embedded" onSubmit={handleUpdatePassword}>
              <div className="participant-form-grid">
                <label className="participant-field-full">
                  Mot de passe actuel
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
                    placeholder="Votre mot de passe actuel"
                  />
                </label>
                <label>
                  Nouveau mot de passe
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                    placeholder="Minimum 8 caractères"
                    minLength={8}
                  />
                </label>
                <label>
                  Confirmation
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                    placeholder="Retapez le nouveau mot de passe"
                  />
                </label>
              </div>
              <div className="participant-form-actions account-actions-stack">
                <button type="submit" className="btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Mise à jour...' : 'Modifier le mot de passe'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleResetPassword} disabled={resettingPassword}>
                  {resettingPassword ? 'Génération...' : 'Mot de passe oublié: générer un temporaire'}
                </button>
              </div>
            </form>
          </article>
        </section>

        <section className="feature-card account-plan-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">TARIFICATION</p>
              <h2>Plan tarifaire</h2>
              <p>Changez de formule selon vos besoins actuels.</p>
            </div>
          </div>

          <form className="participant-form participant-form--embedded" onSubmit={handleChangePlan}>
            <div className="participant-form-grid">
              <label className="participant-field-full">
                Plan actif
                <input type="text" value={activePlan?.name || 'Aucun plan'} disabled />
              </label>

              <label className="participant-field-full">
                Choisir un plan
                <select
                  className="account-select"
                  value={selectedPlanId}
                  onChange={(event) => setSelectedPlanId(event.target.value)}
                >
                  <option value="">Aucun plan</option>
                  {plans.map((plan) => {
                    const isCurrent = String(plan.id) === String(currentPlanId || '');
                    const isRecommended = recommendedPlan && String(plan.id) === String(recommendedPlan.id);
                    const labelParts = [plan.name];
                    if (isCurrent) labelParts.push('Plan actuel');
                    if (isRecommended) labelParts.push('Recommandé');
                    return (
                      <option key={String(plan.id)} value={String(plan.id)}>
                        {labelParts.join(' · ')}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="account-plan-badges" aria-label="Badges plan">
              {activePlan ? <span className="status-pill status-preparee">Plan actuel: {activePlan.name}</span> : null}
              {recommendedPlan ? <span className="status-pill status-en_cours">Plan recommandé: {recommendedPlan.name}</span> : null}
              {normalizedEmail === RECOMMENDED_PRO_DEFAULT_EMAIL ? (
                <span className="status-pill status-terminee">Compte prioritaire Pro recommandé</span>
              ) : null}
            </div>

            <div className="participant-form-actions">
              <button type="submit" className="btn-primary" disabled={savingPlan}>
                {savingPlan ? 'Changement...' : 'Changer de plan'}
              </button>
            </div>
          </form>

          <div className="account-plan-history">
            <p className="eyebrow">HISTORIQUE LOCAL</p>
            <h3>Derniers changements de plan</h3>
            {planHistory.length === 0 ? (
              <p>Aucun changement enregistré localement pour le moment.</p>
            ) : (
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
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
