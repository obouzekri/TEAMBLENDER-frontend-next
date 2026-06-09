"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AuthField from '@/components/AuthField';
import AuthShowcase from '@/components/AuthShowcase';
import AuthSocialButtons from '@/components/AuthSocialButtons';
import Logo from '@/components/Logo';
import posthog from 'posthog-js';
import { trackGtmEvent } from '@/lib/analytics';
import {
  clearOAuthCallbackParamsFromUrl,
  getOAuthStartUrl,
  getRedirectPath,
  loginWithFallback,
  readOAuthCallbackFromLocation,
  resendVerification,
  resolveConnectedUserId
} from '@/lib/auth';

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
  const microsoftLoginEnabled = String(process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED || 'false').toLowerCase() === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAuthScope, setLastAuthScope] = useState('user');
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState('');

  useEffect(() => {
    const oauth = readOAuthCallbackFromLocation();
    if (!oauth.hasOAuthPayload) return;

    clearOAuthCallbackParamsFromUrl();

    if (oauth.error) {
      setMessage(oauth.errorDescription || 'Connexion sociale impossible. Veuillez réessayer.');
      return;
    }

    if (!oauth.token || !oauth.user) {
      setMessage('Réponse OAuth invalide. Veuillez réessayer.');
      return;
    }

    localStorage.setItem('jwt', oauth.token);
    sessionStorage.setItem('jwt', oauth.token);
    sessionStorage.setItem('currentUser', JSON.stringify(oauth.user));

    try {
      posthog.capture('login_oauth', {
        provider: oauth.provider || 'unknown',
        source: 'frontend',
      });
    } catch {
      // no-op
    }

    trackGtmEvent('login_oauth', {
      provider: oauth.provider || 'unknown',
    });

    const connectedUserId = resolveConnectedUserId(oauth.user);
    const redirect = getRedirectPath(oauth.user.role, normalizedRequestedSessionId, connectedUserId);
    window.location.href = redirect;
  }, [normalizedRequestedSessionId]);

  function startOAuth(provider) {
    const url = getOAuthStartUrl(provider, '/login');
    if (!url) {
      setMessage(provider === 'microsoft'
        ? 'La connexion Microsoft sera disponible prochainement.'
        : 'Configuration OAuth indisponible.');
      return;
    }

    setMessage('');
    setOauthLoadingProvider(provider);
    window.location.href = url;
  }

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
      const allowParticipantFallback = true;
      const { response, data, authScope } = await loginWithFallback(normalizedEmail, password, { allowParticipantFallback });
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
    <main className="shell auth-page auth-page--split">
      <AuthShowcase
        title="Lancez des challenges collaboratifs en temps reel."
        description="Retrouvez vos sessions, animez vos equipes et gardez une vision claire du realtime depuis une interface sobre, fluide et professionnelle."
        highlights={[
          { title: 'Realtime orchestration', text: 'Lancez une session, suivez les connexions et pilotez vos challenges sans friction.' },
          { title: 'Aligned facilitation', text: 'Managers, RH et facilitateurs accedent a la meme experience produit, claire et premium.' },
          { title: 'Reliable access', text: 'Connexion rapide, etats lisibles et parcours pensés pour des equipes hybrides.' },
        ]}
        stats={[
          { value: 'Live', label: 'Sessions synchronisees' },
          { value: 'Secure', label: 'Acces professionnel' },
          { value: 'Fast', label: 'Onboarding fluide' },
        ]}
      />

      <div className="auth-login-pane">
        <AuthCard
          title="Connexion à TeamBlender"
          description="Accedez a votre espace pour lancer, suivre et faciliter vos experiences collaboratives." 
          brand={<Link href="/" className="auth-card-brand-link" aria-label="Retour a l accueil TeamBlender"><Logo size="compact" /></Link>}
          footer={<span>Pas encore de compte ? <Link href="/signup">Créer un compte</Link></span>}
        >
        <AuthSocialButtons
          loading={loading}
          loadingProvider={oauthLoadingProvider}
          microsoftEnabled={microsoftLoginEnabled}
          onProviderClick={(provider) => startOAuth(provider)}
        />

        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <AuthField id="login-email" label="Email professionnel" icon={<Mail size={18} strokeWidth={1.9} />}>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@entreprise.com"
              autoComplete="email"
              aria-label="Email professionnel"
            />
          </AuthField>

          <AuthField id="login-password" label="Mot de passe" icon={<LockKeyhole size={18} strokeWidth={1.9} />} className="auth-field--password">
            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                aria-label="Mot de passe"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-controls="login-password"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.9} aria-hidden="true" />}
              </button>
            </div>
          </AuthField>

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
      </div>
    </main>
  );
}

