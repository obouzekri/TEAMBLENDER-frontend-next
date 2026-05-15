"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { getRedirectPath, loginWithFallback, resolveConnectedUserId } from '@/lib/auth';

function errorMessage(resStatus, data) {
  if (data?.code === 'ACCOUNT_PENDING') return 'Votre compte est en attente de validation par un administrateur.';
  if (data?.code === 'ACCOUNT_REJECTED') return 'Votre demande de compte a été refusée. Contactez un administrateur.';
  if (data?.code === 'ACCOUNT_DISABLED') return 'Ce compte a été désactivé. Contactez un administrateur.';
  if (resStatus === 401) return 'Email ou mot de passe invalide.';
  return data?.error || 'Une erreur est survenue. Veuillez réessayer.';
}

export default function LoginForm({ requestedSessionId = '' }) {
  const normalizedRequestedSessionId = useMemo(() => String(requestedSessionId || '').trim(), [requestedSessionId]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const { response, data } = await loginWithFallback(normalizedEmail, password, { allowParticipantFallback: true });
      if (response.ok) {
        localStorage.setItem('jwt', data.token);
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));

        const connectedUserId = resolveConnectedUserId(data.user);
        if (data.user.role === 'participant' && normalizedRequestedSessionId) {
          sessionStorage.setItem('targetSessionId', normalizedRequestedSessionId);
        } else {
          sessionStorage.removeItem('targetSessionId');
        }

        const redirect = getRedirectPath(data.user.role, normalizedRequestedSessionId, connectedUserId);
        window.location.href = redirect;
        return;
      }

      setMessage(errorMessage(response.status, data));
    } catch {
      setMessage('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title="Connexion à TeamBlender"
        footer={<span>Pas encore de compte ? <Link href="/signup">Créer un compte</Link></span>}
      >
        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Votre mot de passe"
            />
          </label>

          <button type="submit" className="btn-primary wide" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {message ? <p className="form-error">{message}</p> : null}
        </form>
      </AuthCard>
    </main>
  );
}

