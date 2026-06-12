"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { forgotPassword } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function ForgotPasswordForm() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage(isEn ? 'Please enter your email address.' : 'Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await forgotPassword({ email: normalizedEmail });
      if (res.ok) {
        setDone(true);
      } else {
        setMessage(data?.message || data?.error || (isEn ? 'Something went wrong. Please try again.' : 'Une erreur est survenue. Veuillez réessayer.'));
      }
    } catch {
      setMessage(isEn ? 'Unable to reach the server. Check your connection.' : 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title={isEn ? 'Forgot password' : 'Mot de passe oublié'}
        footer={<span><Link href={withLocalePath('/login')}>{isEn ? 'Back to login' : 'Retour à la connexion'}</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>{isEn ? 'If an account exists with this email, you will receive a reset link shortly.' : 'Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.'}</p>
            <p className="form-help">{isEn ? 'Also check your spam folder if you do not see the email.' : 'Vérifiez également vos spams si vous ne voyez pas l\'email.'}</p>
            <Link href={withLocalePath('/login')} className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>{isEn ? 'Back to login' : 'Retour à la connexion'}</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <p className="form-help">{isEn ? 'Enter your email to receive a password reset link.' : 'Saisissez votre adresse email pour recevoir un lien de réinitialisation.'}</p>
            <label>
              {isEn ? 'Email' : 'Email'}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={isEn ? 'you@company.com' : 'votre@email.com'}
                autoComplete="email"
              />
            </label>

            <button type="submit" className="btn-primary wide" disabled={loading}>
              {loading ? (isEn ? 'Sending...' : 'Envoi en cours...') : (isEn ? 'Send link' : 'Envoyer le lien')}
            </button>

            {message ? <p className="form-error">{message}</p> : null}
          </form>
        )}
      </AuthCard>
    </main>
  );
}
