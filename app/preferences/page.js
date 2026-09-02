"use client";

import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ToastContainer from '@/components/ToastContainer';
import { clearStoredAuth } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';
import useToast from '@/lib/useToast';
import { getStoredCurrentUser } from '@/lib/account';
import { ensureUserAvatarProfile, resolveUserAvatar } from '@/lib/avatar-profile';

export default function PreferencesPage() {
  const { t, withLocalePath } = useI18n();
  const { toasts, removeToast, success: showSuccess } = useToast();
  const [guard, setGuard] = useState({ loading: true, user: null });
  const [prefs, setPrefs] = useState({
    sessionReminders: true,
    activitySummaries: false,
    compactNavigation: false,
    highContrast: false,
  });

  useEffect(() => {
    const current = getStoredCurrentUser();
    if (!current) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    const normalizedCurrent = ensureUserAvatarProfile(current);
    setGuard({ loading: false, user: normalizedCurrent });
  }, [withLocalePath]);

  const userLabel = String(
    guard.user?.name ||
    `${guard.user?.first_name || ''} ${guard.user?.last_name || ''}`.trim() ||
    guard.user?.email ||
    'Utilisateur'
  ).trim();
  const resolvedAvatar = resolveUserAvatar(guard.user, userLabel);
  const role = guard.user?.role;

  function logout() {
    clearStoredAuth();
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace(withLocalePath('/login'));
  }

  function updatePref(key, value) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function savePreferences() {
    showSuccess('Préférences enregistrées.');
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Chargement des préférences</h1>
          <p>Préparation de vos réglages personnels.</p>
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
        role={role}
        avatarUrl={resolvedAvatar.avatarUrl}
        avatarInitials={resolvedAvatar.avatarInitials}
      />
      <main className="shell app-home preferences-page">
        <section className="preferences-page-header" aria-label="En-tête des préférences">
          <p className="eyebrow">PRÉFÉRENCES</p>
          <h1>Préférences</h1>
          <p>Personnalisez les notifications, l’apparence et les réglages de votre expérience TeamBlender.</p>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-notifications-title">
          <header className="preferences-panel__header">
            <p className="eyebrow">NOTIFICATIONS</p>
            <h2 id="preferences-notifications-title">Notifications</h2>
            <p>Choisissez les rappels et résumés que vous souhaitez recevoir.</p>
          </header>
          <div className="preferences-panel__body">
            <label className="preferences-toggle">
              <span>
                <strong>Rappels de session</strong>
                <small>Recevoir un rappel avant les sessions planifiées.</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={prefs.sessionReminders} onChange={(event) => updatePref('sessionReminders', event.target.checked)} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
            <label className="preferences-toggle">
              <span>
                <strong>Résumés d’activité</strong>
                <small>Recevoir une synthèse des activités récentes.</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={prefs.activitySummaries} onChange={(event) => updatePref('activitySummaries', event.target.checked)} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
          </div>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-appearance-title">
          <header className="preferences-panel__header">
            <p className="eyebrow">APPARENCE</p>
            <h2 id="preferences-appearance-title">Apparence</h2>
            <p>Ajustez le confort visuel et la densité de l’interface.</p>
          </header>
          <div className="preferences-panel__body">
            <label className="preferences-toggle">
              <span>
                <strong>Navigation compacte</strong>
                <small>Réduire l’espace occupé par la barre de navigation.</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={prefs.compactNavigation} onChange={(event) => updatePref('compactNavigation', event.target.checked)} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
            <label className="preferences-toggle">
              <span>
                <strong>Contraste renforcé</strong>
                <small>Augmenter la lisibilité des textes secondaires.</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={prefs.highContrast} onChange={(event) => updatePref('highContrast', event.target.checked)} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
          </div>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-language-title">
          <header className="preferences-panel__header">
            <p className="eyebrow">LANGUE</p>
            <h2 id="preferences-language-title">Langue de l’interface</h2>
            <p>Choisissez la langue utilisée dans votre espace.</p>
          </header>
          <div className="preferences-panel__body">
            <div className="preferences-language-card">
              <div>
                <strong>Langue d’affichage</strong>
                <small>Ce réglage s’applique immédiatement à la navigation et aux pages de l’application.</small>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-personalization-title">
          <header className="preferences-panel__header">
            <p className="eyebrow">PERSONNALISATION</p>
            <h2 id="preferences-personalization-title">Personnalisation</h2>
            <p>Cette section accueillera les futures préférences d’expérience et de facilitation.</p>
          </header>
          <div className="preferences-panel__body preferences-panel__body--muted">
            <p>Les préférences avancées seront ajoutées progressivement, sans mélanger les réglages d’expérience avec le profil, la sécurité ou la facturation.</p>
          </div>
        </section>

        <div className="preferences-actions">
          <button type="button" className="btn-primary" onClick={savePreferences}>Enregistrer les préférences</button>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .preferences-page {
          display: grid;
          gap: 1.75rem;
          background:
            radial-gradient(ellipse 60% 50% at 5% 0%, rgba(123, 97, 255, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 95% 100%, rgba(91, 140, 255, 0.06) 0%, transparent 55%),
            var(--bg);
        }

        .preferences-page-header,
        .preferences-panel {
          border: 1px solid var(--surface-soft-border);
          border-radius: 20px;
          background: var(--surface-panel);
          box-shadow: var(--surface-shadow-soft);
        }

        .preferences-page-header {
          padding: clamp(1rem, 2vw, 1.5rem) clamp(1rem, 2.4vw, 1.75rem);
          display: grid;
          gap: 0.35rem;
        }

        .preferences-page-header h1,
        .preferences-page-header p,
        .preferences-panel__header h2,
        .preferences-panel__header p {
          margin: 0;
        }

        .preferences-page-header p,
        .preferences-panel__header p,
        .preferences-toggle small,
        .preferences-panel__body--muted {
          color: var(--text-muted);
        }

        .preferences-panel {
          overflow: hidden;
          border-color: var(--surface-border);
        }

        .preferences-panel__header {
          padding: 1.25rem 1.5rem 0.9rem;
          border-bottom: 1px solid var(--surface-soft-border);
          display: grid;
          gap: 0.3rem;
        }

        .preferences-panel__body {
          padding: 1.15rem clamp(1.5rem, 4vw, 3rem) 1.6rem;
          display: grid;
          gap: 0.9rem;
        }

        .preferences-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1rem;
          border: 1px solid color-mix(in srgb, var(--surface-soft-border) 68%, transparent);
          border-radius: 10px;
          background: var(--surface-panel-soft);
          color: var(--text-strong);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
        }

        .preferences-toggle > span:first-child {
          display: grid;
          gap: 0.16rem;
        }

        .preferences-toggle small {
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .preferences-language-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1rem;
          border: 1px solid color-mix(in srgb, var(--surface-soft-border) 68%, transparent);
          border-radius: 10px;
          background: var(--surface-panel-soft);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
        }

        .preferences-language-card > div {
          display: grid;
          gap: 0.16rem;
        }

        .preferences-language-card small {
          color: var(--text-muted);
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .preferences-toggle__switch {
          position: relative;
          flex-shrink: 0;
        }

        .preferences-toggle__switch input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .preferences-toggle__track {
          display: block;
          width: 42px;
          height: 24px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--text-subtle) 28%, transparent);
          transition: background 0.2s ease;
          position: relative;
        }

        .preferences-toggle__track::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: var(--surface-panel);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
          transition: transform 0.2s ease;
        }

        .preferences-toggle__switch input:checked + .preferences-toggle__track {
          background: var(--accent);
        }

        .preferences-toggle__switch input:checked + .preferences-toggle__track::after {
          transform: translateX(18px);
        }

        .preferences-actions {
          display: flex;
          justify-content: flex-end;
        }

        @media (max-width: 640px) {
          .preferences-toggle {
            align-items: flex-start;
          }

          .preferences-language-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
