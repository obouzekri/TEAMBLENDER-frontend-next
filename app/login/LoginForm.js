"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { getRedirectPath, loginWithFallback, resendVerification, resolveConnectedUserId } from '@/lib/auth';

function errorMessage(resStatus, data) {
  if (data?.code === 'ACCOUNT_PENDING') return 'Votre compte est en attente de validation par un administrateur.';
  if (data?.code === 'ACCOUNT_REJECTED') return 'Votre demande de compte a été refusée. Contactez un administrateur.';
  if (data?.code === 'ACCOUNT_DISABLED') return 'Ce compte a été désactivé. Contactez un administrateur.';
  if (data?.code === 'EMAIL_NOT_VERIFIED') return 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte mail (et les spams).';
  if (resStatus === 401) return 'Email ou mot de passe invalide.';
  return data?.error || 'Une erreur est survenue. Veuillez réessayer.';
}

export default function LoginForm({ requestedSessionId = '' }) {
  const normalizedRequestedSessionId = useMemo(() => String(requestedSessionId || '').trim(), [requestedSessionId]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAuthScope, setLastAuthScope] = useState('user');
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');
    setResendStatus('idle');
    setResendMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const { response, data, authScope } = await loginWithFallback(normalizedEmail, password, { allowParticipantFallback: true });
      setLastAuthScope(authScope || 'user');
      if (response.ok) {
        const token = String(data?.token || '').trim();
        const user = data?.user || null;

        if (!token || !user) {
          setMessage('Réponse de connexion invalide. Veuillez réessayer.');
          return;
        }

        localStorage.setItem('jwt', token);
        sessionStorage.setItem('jwt', token);
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        const connectedUserId = resolveConnectedUserId(user);
        if (user.role === 'participant' && normalizedRequestedSessionId) {
          sessionStorage.setItem('targetSessionId', normalizedRequestedSessionId);
        } else {
          sessionStorage.removeItem('targetSessionId');
        }

        const redirect = getRedirectPath(user.role, normalizedRequestedSessionId, connectedUserId);
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

  async function onResendVerification() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setResendStatus('error');
      setResendMessage('Saisissez votre email pour renvoyer le lien.');
      return;
    }

    setResendStatus('sending');
    setResendMessage('Envoi en cours...');
    try {
      const { res, data } = await resendVerification({
        email: normalizedEmail,
        userType: lastAuthScope === 'participant' ? 'participant' : 'user',
      });

      if (res.ok && data?.success) {
        setResendStatus('done');
        setResendMessage(data?.message || 'Un nouveau lien de verification a ete envoye.');
        return;
      }

      setResendStatus('error');
      setResendMessage(data?.message || data?.error || 'Impossible de renvoyer le lien pour le moment.');
    } catch {
      setResendStatus('error');
      setResendMessage('Impossible de contacter le serveur. Verifiez votre connexion et reessayez.');
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

          {message && message.includes('Veuillez confirmer votre adresse email') ? (
            <>
              <button
                type="button"
                className="btn-secondary wide"
                onClick={onResendVerification}
                disabled={resendStatus === 'sending'}
              >
                {resendStatus === 'sending' ? 'Envoi...' : 'Renvoyer le lien de verification'}
              </button>
              {resendStatus !== 'idle' ? (
                <p className={resendStatus === 'error' ? 'form-error' : 'form-help'}>{resendMessage}</p>
              ) : null}
            </>
          ) : null}

          <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link href="/forgot-password" className="form-help">Mot de passe oublié ?</Link>
          </p>
        </form>
      </AuthCard>
    </main>
  );
}

