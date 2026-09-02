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
  const [themePreference, setThemePreference] = useState('system');

  useEffect(() => {
    const current = getStoredCurrentUser();
    if (!current) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    const normalizedCurrent = ensureUserAvatarProfile(current);
    const storedTheme = localStorage.getItem('tb_theme');
    setThemePreference(['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system');
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

  function updateThemePreference(nextPreference) {
    const resolvedTheme = nextPreference === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : nextPreference;
    localStorage.setItem('tb_theme', nextPreference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = nextPreference;
    setThemePreference(nextPreference);
  }

  function savePreferences() {
    showSuccess(t('preferencesPage.saved'));
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('preferencesPage.loadingTitle')}</h1>
          <p>{t('preferencesPage.loadingBody')}</p>
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
        <section className="preferences-page-header" aria-label={t('preferencesPage.headerAria')}>
          <p className="eyebrow">{t('preferencesPage.eyebrow')}</p>
          <h1>{t('preferencesPage.title')}</h1>
          <p>{t('preferencesPage.intro')}</p>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-notifications-title">
          <header className="preferences-panel__header">
            <p className="eyebrow">{t('preferencesPage.notificationsEyebrow')}</p>
            <h2 id="preferences-notifications-title">{t('preferencesPage.notificationsTitle')}</h2>
            <p>{t('preferencesPage.notificationsIntro')}</p>
          </header>
          <div className="preferences-panel__body">
            <div className="preferences-theme-control" role="group" aria-label={t('preferencesPage.themeTitle')}>
              <div>
                <strong>{t('preferencesPage.themeTitle')}</strong>
                <small>{t('preferencesPage.themeBody')}</small>
              </div>
              <div className="preferences-theme-options">
                {['light', 'dark', 'system'].map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    className={themePreference === theme ? 'is-active' : ''}
                    onClick={() => updateThemePreference(theme)}
                    aria-pressed={themePreference === theme}
                  >
                    {t(`preferencesPage.theme${theme[0].toUpperCase()}${theme.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="preferences-toggle">
              <span>
                <strong>{t('preferencesPage.sessionRemindersTitle')}</strong>
                <small>{t('preferencesPage.sessionRemindersBody')}</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={prefs.sessionReminders} onChange={(event) => updatePref('sessionReminders', event.target.checked)} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
            <label className="preferences-toggle">
              <span>
                <strong>{t('preferencesPage.activitySummariesTitle')}</strong>
                <small>{t('preferencesPage.activitySummariesBody')}</small>
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
            <p className="eyebrow">{t('preferencesPage.appearanceEyebrow')}</p>
            <h2 id="preferences-appearance-title">{t('preferencesPage.appearanceTitle')}</h2>
            <p>{t('preferencesPage.appearanceIntro')}</p>
          </header>
          <div className="preferences-panel__body">
            <label className="preferences-toggle">
              <span>
                <strong>{t('preferencesPage.compactNavigationTitle')}</strong>
                <small>{t('preferencesPage.compactNavigationBody')}</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={prefs.compactNavigation} onChange={(event) => updatePref('compactNavigation', event.target.checked)} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
            <label className="preferences-toggle">
              <span>
                <strong>{t('preferencesPage.highContrastTitle')}</strong>
                <small>{t('preferencesPage.highContrastBody')}</small>
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
            <p className="eyebrow">{t('preferencesPage.languageEyebrow')}</p>
            <h2 id="preferences-language-title">{t('preferencesPage.languageTitle')}</h2>
            <p>{t('preferencesPage.languageIntro')}</p>
          </header>
          <div className="preferences-panel__body">
            <div className="preferences-language-card">
              <div>
                <strong>{t('preferencesPage.displayLanguageTitle')}</strong>
                <small>{t('preferencesPage.displayLanguageBody')}</small>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-personalization-title">
          <header className="preferences-panel__header">
            <p className="eyebrow">{t('preferencesPage.personalizationEyebrow')}</p>
            <h2 id="preferences-personalization-title">{t('preferencesPage.personalizationTitle')}</h2>
            <p>{t('preferencesPage.personalizationIntro')}</p>
          </header>
          <div className="preferences-panel__body preferences-panel__body--muted">
            <p>{t('preferencesPage.personalizationBody')}</p>
          </div>
        </section>

        <div className="preferences-actions">
          <button type="button" className="btn-primary" onClick={savePreferences}>{t('preferencesPage.save')}</button>
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
          padding: 1.25rem clamp(1.25rem, 2.5vw, 2rem) 1.75rem;
          display: grid;
          gap: 1rem;
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

        .preferences-theme-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1rem;
          border: 1px solid color-mix(in srgb, var(--surface-soft-border) 68%, transparent);
          border-radius: 10px;
          background: var(--surface-panel-soft);
          color: var(--text-strong);
        }

        .preferences-theme-control > div:first-child {
          display: grid;
          gap: 0.16rem;
        }

        .preferences-theme-control small {
          color: var(--text-muted);
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .preferences-theme-options {
          display: inline-flex;
          padding: 3px;
          border: 1px solid var(--control-border);
          border-radius: 8px;
          background: var(--surface-control);
        }

        .preferences-theme-options button {
          min-height: 2rem;
          border: 0;
          border-radius: 5px;
          padding: 0.35rem 0.65rem;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .preferences-theme-options button.is-active {
          background: var(--accent);
          color: var(--text-on-accent);
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

          .preferences-theme-control {
            align-items: flex-start;
            flex-direction: column;
          }

          .preferences-panel__body {
            padding-left: 1.25rem;
            padding-right: 1.25rem;
          }
        }
      `}</style>
    </>
  );
}
