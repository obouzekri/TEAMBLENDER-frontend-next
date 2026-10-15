"use client";

import { useEffect, useRef, useState } from 'react';
import { Bell, Globe2, Palette, Save, SlidersHorizontal } from 'lucide-react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ToastContainer from '@/components/ToastContainer';
import { clearStoredAuth } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';
import useToast from '@/lib/useToast';
import { getStoredCurrentUser, getNotificationPreferences, updateNotificationPreferences } from '@/lib/account';
import { ensureUserAvatarProfile, resolveUserAvatar } from '@/lib/avatar-profile';
import {
  applyDisplayPreferences,
  DEFAULT_DISPLAY_PREFERENCES,
  DISPLAY_PREFERENCES_EVENT,
  readDisplayPreferences,
  saveDisplayPreferences,
} from '@/lib/display-preferences';

export default function PreferencesPage() {
  const { t, withLocalePath } = useI18n();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [guard, setGuard] = useState({ loading: true, user: null });
  const [prefs, setPrefs] = useState({ ...DEFAULT_DISPLAY_PREFERENCES });
  const [themePreference, setThemePreference] = useState('system');
  const [notifications, setNotifications] = useState(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadNotifications, setReloadNotifications] = useState(0);
  const preferencesInitRef = useRef(false);

  useEffect(() => {
    if (preferencesInitRef.current) return;
    preferencesInitRef.current = true;
    const current = getStoredCurrentUser();
    if (!current) {
      window.location.replace(withLocalePath('/login'));
      return;
    }

    const normalizedCurrent = ensureUserAvatarProfile(current);
    try {
      const storedTheme = localStorage.getItem('tb_theme');
      setThemePreference(['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system');
      setPrefs(readDisplayPreferences(localStorage));
    } catch (error) {
      console.error('Unable to load preferences', error);
      showError(t('preferencesPage.loadError'));
    }
    setGuard({ loading: false, user: normalizedCurrent });
  }, [showError, t, withLocalePath]);

  useEffect(() => {
    if (guard.loading) return;
    let cancelled = false;
    setNotificationsLoading(true);
    setNotificationsError(false);
    getNotificationPreferences()
      .then((values) => { if (!cancelled) setNotifications(values); })
      .catch((error) => {
        console.error('Unable to load notification preferences', error);
        if (!cancelled) setNotificationsError(true);
      })
      .finally(() => { if (!cancelled) setNotificationsLoading(false); });
    return () => { cancelled = true; };
  }, [guard.loading, reloadNotifications]);

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
    try {
      localStorage.setItem('tb_theme', nextPreference);
    } catch (error) {
      console.error('Unable to save theme preference', error);
      showError(t('preferencesPage.saveError'));
      return;
    }
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = nextPreference;
    if (document.body) {
      document.body.dataset.theme = resolvedTheme;
    }
    setThemePreference(nextPreference);
  }

  async function savePreferences() {
    if (saving || notificationsLoading || notificationsError || !notifications) return;
    setSaving(true);
    try {
      await updateNotificationPreferences(notifications);
      const saved = saveDisplayPreferences(prefs, localStorage);
      applyDisplayPreferences(saved, document.documentElement);
      window.dispatchEvent(new Event(DISPLAY_PREFERENCES_EVENT));
      showSuccess(t('preferencesPage.saved'));
    } catch (error) {
      console.error('Unable to save preferences', error);
      showError(t('preferencesPage.saveError'));
    } finally {
      setSaving(false);
    }
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
          <div>
            <h1>{t('preferencesPage.title')}</h1>
            <p>{t('preferencesPage.intro')}</p>
          </div>
          <span className="preferences-hero-icon" aria-hidden="true"><SlidersHorizontal size={40} /></span>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-notifications-title">
          <header className="preferences-panel__header">
            <h2 id="preferences-notifications-title"><Bell size={20} aria-hidden="true" />{t('preferencesPage.notificationsTitle')}</h2>
            <p>{t('preferencesPage.notificationsIntro')}</p>
            <p>{t('preferencesPage.accountStorage')}</p>
          </header>
          <div className="preferences-panel__body" aria-busy={notificationsLoading}>
            {notificationsLoading && <p role="status">{t('preferencesPage.loadingBody')}</p>}
            {notificationsError && <div role="alert">
              <p>{t('preferencesPage.notificationsLoadError')}</p>
              <button type="button" className="btn-secondary" onClick={() => setReloadNotifications((value) => value + 1)}>{t('preferencesPage.retry')}</button>
            </div>}
            <label className="preferences-toggle">
              <span>
                <strong>{t('preferencesPage.sessionRemindersTitle')}</strong>
                <small>{t('preferencesPage.sessionRemindersBody')}</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={notifications?.session_reminders ?? false} disabled={notificationsLoading || notificationsError || saving} onChange={(event) => setNotifications((current) => ({ ...current, session_reminders: event.target.checked }))} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
            <label className="preferences-toggle">
              <span>
                <strong>{t('preferencesPage.activitySummariesTitle')}</strong>
                <small>{t('preferencesPage.activitySummariesBody')}</small>
              </span>
              <span className="preferences-toggle__switch">
                <input type="checkbox" checked={notifications?.activity_summaries ?? false} disabled={notificationsLoading || notificationsError || saving} onChange={(event) => setNotifications((current) => ({ ...current, activity_summaries: event.target.checked }))} />
                <span className="preferences-toggle__track" />
              </span>
            </label>
          </div>
        </section>

        <section className="preferences-panel" aria-labelledby="preferences-appearance-title">
          <header className="preferences-panel__header">
            <h2 id="preferences-appearance-title"><Palette size={20} aria-hidden="true" />{t('preferencesPage.appearanceTitle')}</h2>
            <p>{t('preferencesPage.appearanceIntro')}</p>
            <p>{t('preferencesPage.browserStorage')}</p>
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

        <section className="preferences-panel preferences-language-row" aria-labelledby="preferences-language-title">
          <h2 id="preferences-language-title"><Globe2 size={20} aria-hidden="true" />{t('preferencesPage.languageEyebrow')}</h2>
          <LanguageSwitcher />
        </section>

        <div className="preferences-actions">
          <button type="button" className="btn-primary" disabled={saving || notificationsLoading || notificationsError} onClick={savePreferences}><Save size={18} aria-hidden="true" />{t(saving ? 'preferencesPage.saving' : 'preferencesPage.save')}</button>
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .preferences-page {
          margin-top: 2.25rem;
          padding-top: 0 !important;
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
          padding: clamp(1.5rem, 3vw, 2.5rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          background:
            radial-gradient(ellipse at top right, color-mix(in srgb, var(--accent) 15%, transparent), transparent 65%),
            var(--surface-panel);
        }

        .preferences-page-header h1 {
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          line-height: 1.15;
          letter-spacing: -0.04em;
          color: var(--text-strong);
        }

        .preferences-page-header p {
          max-width: 42rem;
          margin-top: 0.8rem !important;
        }

        .preferences-hero-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 5rem;
          height: 5rem;
          border-radius: 24px;
          background: color-mix(in srgb, var(--accent) 12%, var(--surface-panel));
          color: var(--accent);
          transform: rotate(-8deg);
        }

        .preferences-panel h2 {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          color: var(--text-strong);
          font-size: 1.15rem;
          font-weight: 750;
        }

        .preferences-panel h2 svg {
          flex-shrink: 0;
          color: var(--accent);
        }

        .preferences-page-header h1,
        .preferences-page-header p,
        .preferences-panel__header h2,
        .preferences-panel__header p {
          margin: 0;
        }

        .preferences-page-header p,
        .preferences-panel__header p,
        .preferences-toggle small {
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
          border-radius: 16px;
          background: var(--surface-panel-soft);
          color: var(--text-strong);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .preferences-toggle:has(input:checked) {
          border-color: color-mix(in srgb, var(--accent) 45%, var(--surface-soft-border));
        }

        .preferences-toggle > span:first-child {
          display: grid;
          gap: 0.16rem;
        }

        .preferences-toggle small {
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .preferences-language-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
        }

        .preferences-language-row h2 {
          margin: 0;
        }

        .preferences-language-row .lang-switch {
          flex-shrink: 0;
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

        .preferences-toggle:has(input:disabled) {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .preferences-toggle__switch input:focus-visible + .preferences-toggle__track {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }

        .preferences-actions {
          display: flex;
          justify-content: flex-end;
        }

        .preferences-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          border-radius: 999px;
        }

        @media (max-width: 640px) {
          .preferences-hero-icon {
            display: none;
          }

          .preferences-actions button {
            width: 100%;
          }
          .preferences-toggle {
            align-items: flex-start;
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
