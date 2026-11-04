"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { resendVerification, verifyEmail } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function VerifyEmailForm({ token, userType = 'user' }) {
  const { locale, withLocalePath, t } = useI18n();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | done | error
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('auth.invalidVerificationLinkPleaseEnsureYou'));
      return;
    }

    async function runVerification() {
      try {
        const { res, data } = await verifyEmail({ token, userType });
        if (res.ok && data?.success) {
          setStatus('success');
          setMessage(t('auth.yourEmailHasBeenConfirmedYou'));
        } else if (data?.code === 'VERIFICATION_TOKEN_EXPIRED') {
          setStatus('error');
          setMessage(t('auth.thisVerificationLinkHasExpiredValid'));
        } else {
          setStatus('error');
          setMessage(data?.message || data?.error || t('auth.invalidOrAlreadyUsedLink'));
        }
      } catch {
        setStatus('error');
        setMessage(t('auth.unableToReachTheServerCheck4'));
      }
    }

    runVerification();
  }, [locale, token, userType]);

  async function handleResend() {
    setResendStatus('sending');
    setResendMessage(t('auth.sending'));
    try {
      const { res, data } = await resendVerification({ token, userType, locale });
      if (res.ok && data?.success) {
        setResendStatus('done');
        setResendMessage(data?.message || t('auth.aNewVerificationLinkHasBeen'));
        return;
      }

      setResendStatus('error');
      setResendMessage(data?.message || data?.error || t('auth.unableToResendTheLinkRight'));
    } catch {
      setResendStatus('error');
      setResendMessage(t('auth.unableToReachTheServerCheck2'));
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title={t('auth.emailConfirmation')}
        footer={<span><Link href={withLocalePath('/login')}>{t('auth.backToLogin')}</Link></span>}
      >
        {status === 'loading' && (
          <p className="form-help">{t('auth.verificationInProgress')}</p>
        )}

        {status === 'success' && (
          <div className="success-box">
            <p>{message}</p>
            <Link href={withLocalePath('/login')} className="btn-primary wide">{t('auth.logIn')}</Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="form-error">{message}</p>
            <button
              type="button"
              className="btn-primary wide"
              style={{ marginTop: '1rem' }}
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
            >
              {resendStatus === 'sending' ? t('auth.sending2') : t('auth.resendVerificationLink')}
            </button>
            {resendStatus !== 'idle' && (
              <p className={resendStatus === 'error' ? 'form-error' : 'form-help'} style={{ marginTop: '0.75rem' }}>
                {resendMessage}
              </p>
            )}
            <Link href={withLocalePath('/signup')} className="btn-outline-dark wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>{t('auth.createANewAccount')}</Link>
          </div>
        )}
      </AuthCard>
    </main>
  );
}
