"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { forgotPassword } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function ForgotPasswordForm() {
  const { locale, withLocalePath, t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [userType, setUserType] = useState('user');

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage(t('auth.pleaseEnterYourEmailAddress'));
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await forgotPassword({ email: normalizedEmail, userType, locale });
      if (res.ok) {
        setDone(true);
      } else {
        setMessage(data?.message || data?.error || t('auth.somethingWentWrongPleaseTryAgain'));
      }
    } catch {
      setMessage(t('auth.unableToReachTheServerCheck'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title={t('auth.forgotPassword2')}
        footer={<span><Link href={withLocalePath('/login')}>{t('auth.backToLogin')}</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>{t('auth.ifAnAccountExistsWithThis')}</p>
            <p className="form-help">{t('auth.alsoCheckYourSpamFolderIf')}</p>
            <Link href={withLocalePath('/login')} className="btn-outline-dark wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>{t('auth.backToLogin')}</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <p className="form-help">{t('auth.chooseYourAccountTypeAndEnter')}</p>
            <label>
              {t('auth.accountType')}
              <select value={userType} onChange={(e) => setUserType(e.target.value)}>
                <option value="user">{t('auth.manager2')}</option>
                <option value="participant">{t('auth.participant2')}</option>
              </select>
            </label>
            <label>
              {t('auth.email')}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.youCompanyCom2')}
                autoComplete="email"
              />
            </label>

            <button type="submit" className="btn-primary wide" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendLink')}
            </button>

            {message ? <p className="form-error">{message}</p> : null}
          </form>
        )}
      </AuthCard>
    </main>
  );
}
