"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { forgotPassword } from '@/lib/auth';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await forgotPassword({ email: normalizedEmail });
      if (res.ok) {
        setDone(true);
      } else {
        setMessage(data?.message || data?.error || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } catch {
      setMessage('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title="Mot de passe oublié"
        footer={<span><Link href="/login">Retour à la connexion</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.</p>
            <p className="form-help">Vérifiez également vos spams si vous ne voyez pas l&apos;email.</p>
            <Link href="/login" className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <p className="form-help">Saisissez votre adresse email pour recevoir un lien de réinitialisation.</p>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
                autoComplete="email"
              />
            </label>

            <button type="submit" className="btn-primary wide" disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>

            {message ? <p className="form-error">{message}</p> : null}
          </form>
        )}
      </AuthCard>
    </main>
  );
}
