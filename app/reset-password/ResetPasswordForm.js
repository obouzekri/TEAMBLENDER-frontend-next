"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { resetPassword } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function ResetPasswordForm({ token, userType = 'user' }) {
  const { locale, withLocalePath, t } = useI18n();
  const accountLabel = userType === 'participant'
    ? t('auth.participant')
    : t('auth.manager');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  if (!token) {
    return (
      <main className="shell auth-page">
        <AuthCard
          title={t('auth.resetPassword')}
          footer={<span><Link href={withLocalePath('/login')}>{t('auth.backToLogin')}</Link></span>}
        >
          <p className="form-error">{t('auth.invalidAccountlabelLinkPleaseRequestA', { accountLabel })}</p>
          <Link href={withLocalePath('/forgot-password')} className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>{t('auth.forgotPassword2')}</Link>
        </AuthCard>
      </main>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (newPassword.length < 8) {
      setMessage(t('auth.passwordMustBeAtLeast8'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await resetPassword({ token, newPassword, userType });
      if (res.ok && data?.success) {
        setDone(true);
      } else if (data?.code === 'RESET_TOKEN_EXPIRED') {
        setMessage(t('auth.thisLinkHasExpiredValidFor'));
      } else if (data?.code === 'INVALID_RESET_TOKEN') {
        setMessage(t('auth.invalidOrAlreadyUsedLinkPlease'));
      } else {
        setMessage(data?.message || data?.error || t('auth.somethingWentWrongPleaseTryAgain'));
      }
    } catch {
      setMessage(t('auth.unableToReachTheServerCheck'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="shell auth-page">
        <AuthCard
          title={t('auth.setAccountlabelPassword', { accountLabel })}
          footer={<span><Link href={withLocalePath('/login')}>{t('auth.backToLogin')}</Link></span>}
        >
          <div className="success-box">
            <p>{t('auth.yourPasswordHasBeenSavedSuccessfully')}</p>
            <Link href={withLocalePath('/login')} className="btn-primary wide">{t('auth.logIn')}</Link>
          </div>
        </AuthCard>
      </main>
    );
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title={t('auth.setAccountlabelPassword', { accountLabel })}
        footer={<span><Link href={withLocalePath('/login')}>{t('auth.backToLogin')}</Link></span>}
      >
        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <label>
            {t('auth.newPassword')}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder={t('auth.minimum8Characters2')}
              autoComplete="new-password"
            />
          </label>

          <label>
            {t('auth.confirmPassword')}
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder={t('auth.repeatYourPassword')}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn-primary wide" disabled={loading}>
            {loading ? t('auth.resetting') : t('auth.applyNewPassword')}
          </button>

          {message ? <p className="form-error">{message}</p> : null}
        </form>
      </AuthCard>
    </main>
  );
}
