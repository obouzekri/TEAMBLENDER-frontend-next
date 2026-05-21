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
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-controls="login-password"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M2.29 3.71a1 1 0 011.42-1.42l16.58 16.58a1 1 0 01-1.42 1.42l-2.43-2.43A11.51 11.51 0 0112 19c-5.67 0-9.31-5.23-9.46-5.45a1 1 0 010-1.1A18.87 18.87 0 016.4 8.18L2.29 3.71zM7.85 9.63A9.95 9.95 0 004.58 13c.61.97 3.48 4 7.42 4a9.42 9.42 0 003.13-.53l-1.78-1.78a3.5 3.5 0 01-4.5-4.5L7.85 9.63zm8.25 4.01l-1.47-1.47a3.5 3.5 0 00-2.34-2.34L10.82 8.36A2.5 2.5 0 0115.1 12.64zM12 5c5.67 0 9.31 5.23 9.46 5.45a1 1 0 010 1.1 18.5 18.5 0 01-2.53 2.93l-1.42-1.42A10.44 10.44 0 0019.42 11c-.61-.97-3.48-4-7.42-4a8.9 8.9 0 00-2.39.33L8 5.72A11.18 11.18 0 0112 5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 5c5.67 0 9.31 5.23 9.46 5.45a1 1 0 010 1.1C21.31 11.77 17.67 17 12 17s-9.31-5.23-9.46-5.45a1 1 0 010-1.1C2.69 10.23 6.33 5 12 5zm0 2C8.06 7 5.19 10.03 4.58 11 5.19 11.97 8.06 15 12 15s6.81-3.03 7.42-4C18.81 10.03 15.94 7 12 7zm0 1.5A2.5 2.5 0 1112 13.5 2.5 2.5 0 0112 8.5z" />
                  </svg>
                )}
              </button>
            </div>
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

