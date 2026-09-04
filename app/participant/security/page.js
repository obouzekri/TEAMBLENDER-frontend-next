'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import useToast from '@/lib/useToast';
import { getStoredCurrentUser, clearStoredAuth } from '@/lib/auth';
import { updateMyPassword } from '@/lib/account';
import useI18n from '@/lib/i18n/useI18n';

export default function ParticipantSecurityPage() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const router = useRouter();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const current = getStoredCurrentUser();
    if (!current || current.role !== 'participant') {
      router.replace(withLocalePath('/login'));
      return;
    }
    setUser(current);
    setReady(true);
  }, []);

  const passwordChecks = {
    hasLength: passwordForm.new_password.length >= 8,
    hasNumber: /\d/.test(passwordForm.new_password),
    hasSymbol: /[^A-Za-z0-9]/.test(passwordForm.new_password),
  };
  const score = [passwordChecks.hasLength, passwordChecks.hasNumber, passwordChecks.hasSymbol].filter(Boolean).length;
  const percent = Math.round((score / 3) * 100);
  const level = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (savingPassword) return;

    const current = String(passwordForm.current_password || '').trim();
    const next = String(passwordForm.new_password || '').trim();
    const confirm = String(passwordForm.confirm_password || '').trim();

    if (!current || !next || !confirm) {
      showError(isEn ? 'All fields are required' : 'Tous les champs sont requis');
      return;
    }
    if (next.length < 8) {
      showError(isEn ? 'Password must be at least 8 characters' : 'Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }
    if (next !== confirm) {
      showError(isEn ? 'Passwords do not match' : 'Les mots de passe ne correspondent pas');
      return;
    }

    setSavingPassword(true);
    try {
      await updateMyPassword(current, next);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showSuccess(isEn ? 'Password updated successfully' : 'Mot de passe mis a jour');
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to update password' : 'Echec de la mise a jour du mot de passe'));
    } finally {
      setSavingPassword(false);
    }
  }

  function goBack() {
    router.push(withLocalePath('/participant'));
  }

  if (!ready) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{isEn ? 'Loading' : 'Chargement'}</h1>
        </section>
      </main>
    );
  }

  const loginIdentifier = user?.login_identifier || user?.name || '';
  const email = user?.email || '';

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={user?.name || 'Participant'} onLogout={() => { clearStoredAuth(); window.location.replace(withLocalePath('/login')); }} role={user?.role} />
      <main className="shell app-home account-page participant-security-page">
        <section className="account-page-header" aria-label="Security Settings">
          <p className="eyebrow">{isEn ? 'SECURITY' : 'SECURITE'}</p>
          <h1>{isEn ? 'Security Settings' : 'Parametres de securite'}</h1>
          <p>{isEn ? 'Manage your login and password.' : 'Gerez votre identifiant et mot de passe.'}</p>
        </section>

        <div className="account-card-container">
          <div className="account-tabs account-tabs--modern" role="tablist" aria-label="Security sections">
            <button type="button" role="tab" aria-selected={true} className="account-tab account-tab--modern is-active">
              {isEn ? 'Password' : 'Mot de passe'}
            </button>
          </div>

          <section className="account-saas-card account-panel is-active">
            <header className="account-saas-card__header">
              <p className="eyebrow">{isEn ? 'YOUR ACCOUNT' : 'VOTRE COMPTE'}</p>
              <h2 className="account-saas-card__title">{isEn ? 'Login & Credentials' : 'Identifiant et identifiants'}</h2>
            </header>
            <div className="account-saas-card__body">
              <article className="account-security-card">
                <header className="account-security-card__head">
                  <h3>{isEn ? 'Your Login Identifier' : 'Votre identifiant'}</h3>
                </header>
                <div className="account-form-field account-form-field--full">
                  <label className="account-form-label" htmlFor="participant-login">{isEn ? 'Login' : 'Identifiant'}</label>
                  <input
                    id="participant-login"
                    className="account-form-input account-form-input--disabled"
                    type="text"
                    value={loginIdentifier}
                    disabled
                    readOnly
                  />
                  <small className="field-help">{isEn ? 'Use this to log in to your sessions.' : 'Utilisez ceci pour vous connecter a vos sessions.'}</small>
                </div>

                {email ? (
                  <div className="account-form-field account-form-field--full">
                    <label className="account-form-label" htmlFor="participant-email">{isEn ? 'Email' : 'Email'}</label>
                    <input
                      id="participant-email"
                      className="account-form-input account-form-input--disabled"
                      type="email"
                      value={email}
                      disabled
                      readOnly
                    />
                  </div>
                ) : null}
              </article>

              <article className="account-security-card">
                <header className="account-security-card__head">
                  <h3>{isEn ? 'Change Password' : 'Modifier le mot de passe'}</h3>
                </header>
                <form className="account-security-form" onSubmit={handleUpdatePassword}>
                  <div className="account-form-field account-form-field--full">
                    <label className="account-form-label" htmlFor="current-password">{isEn ? 'Current Password' : 'Mot de passe actuel'}</label>
                    <div className="account-password-field">
                      <input
                        id="current-password"
                        className="account-form-input"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                        placeholder={isEn ? 'Enter current password' : 'Entrez le mot de passe actuel'}
                      />
                      <button
                        type="button"
                        className="account-password-toggle"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={isEn ? 'Show/hide password' : 'Afficher/masquer le mot de passe'}
                      >
                        {showCurrentPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div className="account-form-field account-form-field--full">
                    <label className="account-form-label" htmlFor="new-password">{isEn ? 'New Password' : 'Nouveau mot de passe'}</label>
                    <div className="account-password-field">
                      <input
                        id="new-password"
                        className="account-form-input"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                        placeholder={isEn ? 'Enter new password' : 'Entrez le nouveau mot de passe'}
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="account-password-toggle"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={isEn ? 'Show/hide password' : 'Afficher/masquer le mot de passe'}
                      >
                        {showNewPassword ? '🙈' : '👁️'}
                      </button>
                    </div>

                    <div className="account-password-strength" role="status" aria-live="polite">
                      <span>{isEn ? 'Strength' : 'Force'}</span>
                      <strong>
                        {level === 'strong' ? (isEn ? 'Strong' : 'Fort') : level === 'medium' ? (isEn ? 'Medium' : 'Moyen') : (isEn ? 'Weak' : 'Faible')}
                      </strong>
                    </div>
                    <div className="account-password-strength-bar" aria-hidden="true">
                      <span className={`account-password-strength-bar__fill is-${level}`} style={{ width: `${percent}%` }} />
                    </div>

                    <ul className="account-password-checklist">
                      <li className={passwordChecks.hasLength ? 'is-met' : ''}>{isEn ? '8+ characters' : '8+ caracteres'}</li>
                      <li className={passwordChecks.hasNumber ? 'is-met' : ''}>{isEn ? 'At least one number' : 'Au moins un chiffre'}</li>
                      <li className={passwordChecks.hasSymbol ? 'is-met' : ''}>{isEn ? 'At least one symbol' : 'Au moins un symbole'}</li>
                    </ul>
                  </div>

                  <div className="account-form-field account-form-field--full">
                    <label className="account-form-label" htmlFor="confirm-password">{isEn ? 'Confirm Password' : 'Confirmer le mot de passe'}</label>
                    <div className="account-password-field">
                      <input
                        id="confirm-password"
                        className="account-form-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder={isEn ? 'Confirm password' : 'Confirmez le mot de passe'}
                      />
                      <button
                        type="button"
                        className="account-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={isEn ? 'Show/hide password' : 'Afficher/masquer le mot de passe'}
                      >
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div className="account-security-actions">
                    <button type="submit" className="btn-primary" disabled={savingPassword}>
                      {savingPassword ? (isEn ? 'Updating...' : 'Mise a jour...') : (isEn ? 'Update Password' : 'Mettre a jour le mot de passe')}
                    </button>
                  </div>
                </form>
              </article>

              <article className="account-security-card">
                <header className="account-security-card__head">
                  <h3>{isEn ? 'Back to Sessions' : 'Retour aux sessions'}</h3>
                </header>
                <p className="account-security-card__text">{isEn ? 'Return to your participant dashboard.' : 'Retournez a votre tableau de bord participant.'}</p>
                <div className="account-security-actions">
                  <button type="button" className="btn-secondary" onClick={goBack}>
                    {isEn ? 'Back to Sessions' : 'Retour aux sessions'}
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>

        <Footer />
      </main>
    </>
  );
}
