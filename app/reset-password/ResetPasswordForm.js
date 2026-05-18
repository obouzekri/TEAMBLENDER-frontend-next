"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { resetPassword } from '@/lib/auth';

export default function ResetPasswordForm({ token }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  if (!token) {
    return (
      <main className="shell auth-page">
        <AuthCard
          title="Réinitialiser le mot de passe"
          footer={<span><Link href="/login">Retour à la connexion</Link></span>}
        >
          <p className="form-error">Lien invalide. Veuillez refaire une demande de réinitialisation.</p>
          <Link href="/forgot-password" className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>Mot de passe oublié</Link>
        </AuthCard>
      </main>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (newPassword.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await resetPassword({ token, newPassword });
      if (res.ok && data?.success) {
        setDone(true);
      } else if (data?.code === 'RESET_TOKEN_EXPIRED') {
        setMessage('Ce lien a expiré (validité 1h). Veuillez refaire une demande de réinitialisation.');
      } else if (data?.code === 'INVALID_RESET_TOKEN') {
        setMessage('Lien invalide ou déjà utilisé. Veuillez refaire une demande de réinitialisation.');
      } else {
        setMessage(data?.message || data?.error || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } catch {
      setMessage('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="shell auth-page">
        <AuthCard
          title="Réinitialiser le mot de passe"
          footer={<span><Link href="/login">Retour à la connexion</Link></span>}
        >
          <div className="success-box">
            <p>Votre mot de passe a bien été réinitialisé.</p>
            <Link href="/login" className="btn-primary wide">Se connecter</Link>
          </div>
        </AuthCard>
      </main>
    );
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title="Réinitialiser le mot de passe"
        footer={<span><Link href="/login">Retour à la connexion</Link></span>}
      >
        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirmer le mot de passe
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Répétez votre mot de passe"
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="btn-primary wide" disabled={loading}>
            {loading ? 'Réinitialisation...' : 'Valider le nouveau mot de passe'}
          </button>

          {message ? <p className="form-error">{message}</p> : null}
        </form>
      </AuthCard>
    </main>
  );
}
