"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { resetPassword } from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function ResetPasswordForm({ token }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  if (!token) {
    return (
      <main className="shell auth-page">
        <AuthCard
          title={isEn ? 'Reset password' : 'Réinitialiser le mot de passe'}
          footer={<span><Link href={withLocalePath('/login')}>{isEn ? 'Back to login' : 'Retour à la connexion'}</Link></span>}
        >
          <p className="form-error">{isEn ? 'Invalid link. Please request a new reset link.' : 'Lien invalide. Veuillez refaire une demande de réinitialisation.'}</p>
          <Link href={withLocalePath('/forgot-password')} className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>{isEn ? 'Forgot password' : 'Mot de passe oublié'}</Link>
        </AuthCard>
      </main>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (newPassword.length < 8) {
      setMessage(isEn ? 'Password must be at least 8 characters long.' : 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await resetPassword({ token, newPassword });
      if (res.ok && data?.success) {
        setDone(true);
      } else if (data?.code === 'RESET_TOKEN_EXPIRED') {
        setMessage(isEn ? 'This link has expired (valid for 1 hour). Please request another reset.' : 'Ce lien a expiré (validité 1h). Veuillez refaire une demande de réinitialisation.');
      } else if (data?.code === 'INVALID_RESET_TOKEN') {
        setMessage(isEn ? 'Invalid or already used link. Please request another reset.' : 'Lien invalide ou déjà utilisé. Veuillez refaire une demande de réinitialisation.');
      } else {
        setMessage(data?.message || data?.error || (isEn ? 'Something went wrong. Please try again.' : 'Une erreur est survenue. Veuillez réessayer.'));
      }
    } catch {
      setMessage(isEn ? 'Unable to reach the server. Check your connection.' : 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="shell auth-page">
        <AuthCard
          title={isEn ? 'Reset password' : 'Réinitialiser le mot de passe'}
          footer={<span><Link href={withLocalePath('/login')}>{isEn ? 'Back to login' : 'Retour à la connexion'}</Link></span>}
        >
          <div className="success-box">
            <p>{isEn ? 'Your password has been reset successfully.' : 'Votre mot de passe a bien été réinitialisé.'}</p>
            <Link href={withLocalePath('/login')} className="btn-primary wide">{isEn ? 'Log in' : 'Se connecter'}</Link>
          </div>
        </AuthCard>
      </main>
    );
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title={isEn ? 'Reset password' : 'Réinitialiser le mot de passe'}
        footer={<span><Link href={withLocalePath('/login')}>{isEn ? 'Back to login' : 'Retour à la connexion'}</Link></span>}
      >
        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <label>
            {isEn ? 'New password' : 'Nouveau mot de passe'}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder={isEn ? 'Minimum 8 characters' : 'Minimum 8 caractères'}
              autoComplete="new-password"
            />
          </label>

          <label>
            {isEn ? 'Confirm password' : 'Confirmer le mot de passe'}
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder={isEn ? 'Repeat your password' : 'Répétez votre mot de passe'}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn-primary wide" disabled={loading}>
            {loading ? (isEn ? 'Resetting...' : 'Réinitialisation...') : (isEn ? 'Apply new password' : 'Valider le nouveau mot de passe')}
          </button>

          {message ? <p className="form-error">{message}</p> : null}
        </form>
      </AuthCard>
    </main>
  );
}
