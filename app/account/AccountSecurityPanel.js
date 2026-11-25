"use client";

import { Eye, EyeOff } from 'lucide-react';

// Onglet « Sécurité » de la page Compte : rendu seul, état et actions restent dans page.js.
export default function AccountSecurityPanel({
  activeTab,
  handleResetPassword,
  handleUpdatePassword,
  isParticipantAccount,
  passwordChecks,
  passwordForm,
  resettingPassword,
  savingPassword,
  setPasswordForm,
  setShowConfirmPassword,
  setShowCurrentPassword,
  setShowNewPassword,
  showConfirmPassword,
  showCurrentPassword,
  showNewPassword,
  t,
}) {
  return (
    <section id="account-security" role="tabpanel" aria-labelledby="account-tab-security" tabIndex={0} className={`account-saas-card account-panel ${activeTab === 'security' ? 'is-active' : ''}`} hidden={activeTab !== 'security'}>
      <header className="account-saas-card__header">
        <h2 className="account-saas-card__title">{t('account.securityAccessTitle')}</h2>
        <p className="account-saas-card__subtitle">{t('account.securitySubtitle')}</p>
      </header>
      <div className="account-saas-card__body account-security-grid account-panel-body--balanced">
        <article className="account-security-card">
          <header className="account-security-card__head">
            <h3>{t('account.changePasswordTitle')}</h3>
          </header>
          <form className="account-security-form" onSubmit={handleUpdatePassword}>
            <div className="account-form-field account-form-field--full">
              <label className="account-form-label account-form-label--with-action" htmlFor="account-current-password">
                <span>{t('account.currentPassword')}</span>
                {!isParticipantAccount ? (
                  <button type="button" className="account-inline-link" onClick={handleResetPassword} disabled={resettingPassword}>
                    {resettingPassword ? t('account.generating') : t('account.temporaryPasswordAction')}
                  </button>
                ) : null}
              </label>
              <div className="account-password-field">
                <input
                  id="account-current-password"
                  className="account-form-input"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                  placeholder={t('account.currentPasswordPlaceholder')}
                />
                <button type="button" className="account-password-toggle" onClick={() => setShowCurrentPassword((prev) => !prev)} aria-label={t('account.showCurrentPassword')}>
                  {showCurrentPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="account-form-field account-form-field--full">
              <label className="account-form-label" htmlFor="account-new-password">{t('account.newPassword')}</label>
              <div className="account-password-field">
                <input
                  id="account-new-password"
                  className="account-form-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                  placeholder={t('account.newPasswordPlaceholder')}
                  minLength={8}
                />
                <button type="button" className="account-password-toggle" onClick={() => setShowNewPassword((prev) => !prev)} aria-label={t('account.showNewPassword')}>
                  {showNewPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>

              <div className="account-password-strength" role="status" aria-live="polite">
                <span>{t('account.passwordStrengthLabel')}</span>
                <strong>
                  {passwordChecks.level === 'strong'
                    ? t('account.strong')
                    : passwordChecks.level === 'medium'
                      ? t('account.medium')
                      : t('account.weak')}
                </strong>
              </div>
              <div className="account-password-strength-bar" aria-hidden="true">
                <span className={`account-password-strength-bar__fill is-${passwordChecks.level}`} style={{ width: `${passwordChecks.percent}%` }} />
              </div>

              <ul className="account-password-checklist" aria-label={t('account.passwordRequirements')}>
                <li className={passwordChecks.hasLength ? 'is-met' : ''}>{t('account.minimumCharacters')}</li>
                <li className={passwordChecks.hasNumber ? 'is-met' : ''}>{t('account.atLeastOneNumber')}</li>
                <li className={passwordChecks.hasSymbol ? 'is-met' : ''}>{t('account.atLeastOneSymbol')}</li>
              </ul>
            </div>

            <div className="account-form-field account-form-field--full">
              <label className="account-form-label" htmlFor="account-confirm-password">{t('account.confirmPassword')}</label>
              <div className="account-password-field">
                <input
                  id="account-confirm-password"
                  className="account-form-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder={t('account.confirmPasswordPlaceholder')}
                />
                <button type="button" className="account-password-toggle" onClick={() => setShowConfirmPassword((prev) => !prev)} aria-label={t('account.showConfirmPassword')}>
                  {showConfirmPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="account-security-actions">
              <button type="submit" className="btn-primary" disabled={savingPassword}>
                {savingPassword ? t('account.updating') : t('account.changePassword')}
              </button>
            </div>
          </form>
        </article>

        <article className="account-security-card">
          <header className="account-security-card__head">
            <h3>{t('account.twoFactorTitle')}</h3>
          </header>
          <p className="account-security-card__text">{t('account.twoFactorDescription')}</p>
          <p id="account-two-factor-unavailable" className="account-security-card__hint">{t('account.twoFactorUnavailable')}</p>
          <p className="account-2fa-status">
            <span>{t('account.status')}</span>
            <strong className="is-disabled">{t('account.unavailable')}</strong>
          </p>
          <button type="button" className="btn-primary account-security-cta" disabled aria-describedby="account-two-factor-unavailable">
            {t('account.enableTwoFactor')}
          </button>
        </article>

        <article className="account-security-card">
          <header className="account-security-card__head">
            <h3>{t('account.activeSessionsTitle')}</h3>
          </header>
          <p id="account-sessions-unavailable" className="account-security-card__text">{t('account.sessionsUnavailable')}</p>
          <div className="account-security-actions">
            <button type="button" className="btn-secondary" disabled aria-describedby="account-sessions-unavailable">
              {t('account.signOutOtherDevices')}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
