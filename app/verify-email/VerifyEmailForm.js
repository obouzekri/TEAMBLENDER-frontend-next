"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { resendVerification, verifyEmail } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function VerifyEmailForm({ token, userType = 'user' }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | done | error
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(isEn ? 'Invalid verification link. Please ensure you copied the full link from your email.' : 'Lien de vérification invalide. Vérifiez que vous avez copié le lien en entier depuis votre email.');
      return;
    }

    async function runVerification() {
      try {
        const { res, data } = await verifyEmail({ token, userType });
        if (res.ok && data?.success) {
          setStatus('success');
          setMessage(isEn ? 'Your email has been confirmed. You can now log in.' : 'Votre adresse email a bien été confirmée. Vous pouvez maintenant vous connecter.');
        } else if (data?.code === 'VERIFICATION_TOKEN_EXPIRED') {
          setStatus('error');
          setMessage(isEn ? 'This verification link has expired (valid for 24 hours). Please sign up again or contact support.' : 'Ce lien de vérification a expiré (validité 24h). Veuillez vous réinscrire ou contacter le support.');
        } else {
          setStatus('error');
          setMessage(data?.message || data?.error || (isEn ? 'Invalid or already used link.' : 'Lien invalide ou déjà utilisé.'));
        }
      } catch {
        setStatus('error');
        setMessage(isEn ? 'Unable to reach the server. Check your connection and try again.' : 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.');
      }
    }

    runVerification();
  }, [isEn, token, userType]);

  async function handleResend() {
    setResendStatus('sending');
    setResendMessage(isEn ? 'Sending...' : 'Envoi en cours...');
    try {
      const { res, data } = await resendVerification({ token, userType });
      if (res.ok && data?.success) {
        setResendStatus('done');
        setResendMessage(data?.message || (isEn ? 'A new verification link has been sent.' : 'Un nouveau lien de verification a ete envoye.'));
        return;
      }

      setResendStatus('error');
      setResendMessage(data?.message || data?.error || (isEn ? 'Unable to resend the link right now.' : 'Impossible de renvoyer le lien pour le moment.'));
    } catch {
      setResendStatus('error');
      setResendMessage(isEn ? 'Unable to reach the server. Check your connection and try again.' : 'Impossible de contacter le serveur. Verifiez votre connexion et reessayez.');
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title={isEn ? 'Email confirmation' : 'Confirmation de votre email'}
        footer={<span><Link href={withLocalePath('/login')}>{isEn ? 'Back to login' : 'Retour à la connexion'}</Link></span>}
      >
        {status === 'loading' && (
          <p className="form-help">{isEn ? 'Verification in progress...' : 'Vérification en cours...'}</p>
        )}

        {status === 'success' && (
          <div className="success-box">
            <p>{message}</p>
            <Link href={withLocalePath('/login')} className="btn-primary wide">{isEn ? 'Log in' : 'Se connecter'}</Link>
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
              {resendStatus === 'sending' ? (isEn ? 'Sending...' : 'Envoi...') : (isEn ? 'Resend verification link' : 'Renvoyer le lien de verification')}
            </button>
            {resendStatus !== 'idle' && (
              <p className={resendStatus === 'error' ? 'form-error' : 'form-help'} style={{ marginTop: '0.75rem' }}>
                {resendMessage}
              </p>
            )}
            <Link href={withLocalePath('/signup')} className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>{isEn ? 'Create a new account' : 'Créer un nouveau compte'}</Link>
          </div>
        )}
      </AuthCard>
    </main>
  );
}
