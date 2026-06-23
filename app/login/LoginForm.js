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
import useI18n from '@/lib/i18n/useI18n';

function errorMessage(resStatus, data, isEn) {
  if (data?.code === 'ACCOUNT_PENDING') return isEn ? 'Your account is pending admin approval.' : 'Votre compte est en attente de validation par un administrateur.';
  if (data?.code === 'ACCOUNT_REJECTED') return isEn ? 'Your account request was rejected. Contact an administrator.' : 'Votre demande de compte a été refusée. Contactez un administrateur.';
  if (data?.code === 'ACCOUNT_DISABLED') return isEn ? 'This account has been disabled. Contact an administrator.' : 'Ce compte a été désactivé. Contactez un administrateur.';
  if (data?.code === 'EMAIL_NOT_VERIFIED') return isEn ? 'Please verify your email before logging in. Check your inbox and spam folder.' : 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte mail (et les spams).';
  if (resStatus === 401) return isEn ? 'Invalid email or password.' : 'Email ou mot de passe invalide.';
  return data?.error || (isEn ? 'Something went wrong. Please try again.' : 'Une erreur est survenue. Veuillez réessayer.');
}

export default function LoginForm({ requestedSessionId = '' }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
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
  const [needsVerificationResend, setNeedsVerificationResend] = useState(false);

  useEffect(() => {
    const oauth = readOAuthCallbackFromLocation();
    if (!oauth.hasOAuthPayload) return;

    clearOAuthCallbackParamsFromUrl();

    if (oauth.error) {
      setMessage(oauth.errorDescription || (isEn ? 'Social login failed. Please try again.' : 'Connexion sociale impossible. Veuillez réessayer.'));
      return;
    }

    if (!oauth.token || !oauth.user) {
      setMessage(isEn ? 'Invalid OAuth response. Please try again.' : 'Réponse OAuth invalide. Veuillez réessayer.');
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
    const redirect = withLocalePath(getRedirectPath(oauth.user.role, normalizedRequestedSessionId, connectedUserId));
    window.location.href = redirect;
  }, [isEn, normalizedRequestedSessionId, withLocalePath]);

  function startOAuth(provider) {
    const url = getOAuthStartUrl(provider, '/login');
    if (!url) {
      setMessage(provider === 'microsoft'
        ? (isEn ? 'Microsoft login will be available soon.' : 'La connexion Microsoft sera disponible prochainement.')
        : (isEn ? 'OAuth configuration unavailable.' : 'Configuration OAuth indisponible.'));
      return;
    }

    setMessage('');
    setOauthLoadingProvider(provider);
    window.location.href = url;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');
    setNeedsVerificationResend(false);
    setResendStatus('idle');
    setResendMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage(isEn ? 'Please fill in all fields.' : 'Veuillez remplir tous les champs.');
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
          setMessage(isEn ? 'Invalid login response. Please try again.' : 'Réponse de connexion invalide. Veuillez réessayer.');
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

        const redirect = withLocalePath(getRedirectPath(user.role, normalizedRequestedSessionId, connectedUserId));
        window.location.href = redirect;
        return;
      }

      setNeedsVerificationResend(data?.code === 'EMAIL_NOT_VERIFIED');
      setMessage(errorMessage(response.status, data, isEn));
    } catch {
      setMessage(isEn ? 'Unable to reach the server. Check your connection.' : 'Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  async function onResendVerification() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setResendStatus('error');
      setResendMessage(isEn ? 'Enter your email to resend the link.' : 'Saisissez votre email pour renvoyer le lien.');
      return;
    }

    setResendStatus('sending');
    setResendMessage(isEn ? 'Sending...' : 'Envoi en cours...');
    try {
      const { res, data } = await resendVerification({
        email: normalizedEmail,
        userType: lastAuthScope === 'participant' ? 'participant' : 'user',
      });

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
    <main className="shell auth-page auth-page--split">
      <AuthShowcase
        title={isEn ? 'Launch collaborative challenges in real time.' : 'Lancez des challenges collaboratifs en temps reel.'}
        description={isEn
          ? 'Access your sessions, run your team activities, and keep clear real-time visibility from a clean professional interface.'
          : 'Retrouvez vos sessions, animez vos equipes et gardez une vision claire du realtime depuis une interface sobre, fluide et professionnelle.'}
        highlights={[
          { title: isEn ? 'Realtime orchestration' : 'Realtime orchestration', text: isEn ? 'Start a session, track connections, and run challenges without friction.' : 'Lancez une session, suivez les connexions et pilotez vos challenges sans friction.' },
          { title: isEn ? 'Aligned facilitation' : 'Aligned facilitation', text: isEn ? 'Managers, HR, and facilitators share one clear premium product experience.' : 'Managers, RH et facilitateurs accedent a la meme experience produit, claire et premium.' },
          { title: isEn ? 'Reliable access' : 'Reliable access', text: isEn ? 'Fast sign-in, clear states, and flows designed for hybrid teams.' : 'Connexion rapide, etats lisibles et parcours pensés pour des equipes hybrides.' },
        ]}
      />

      <div className="auth-login-pane">
        <AuthCard
          title={isEn ? 'Log in to TeamBlender' : 'Connexion à TeamBlender'}
          brand={<Link href={withLocalePath('/')} className="auth-card-brand-link" aria-label={isEn ? 'Back to TeamBlender home' : 'Retour a l accueil TeamBlender'}><Logo size="compact" /></Link>}
          footer={<span>{isEn ? 'No account yet? ' : 'Pas encore de compte ? '}<Link href={withLocalePath('/signup')}>{isEn ? 'Create account' : 'Créer un compte'}</Link></span>}
        >
        <AuthSocialButtons
          loading={loading}
          loadingProvider={oauthLoadingProvider}
          microsoftEnabled={microsoftLoginEnabled}
          onProviderClick={(provider) => startOAuth(provider)}
        />

        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <AuthField id="login-email" label={isEn ? 'Work email' : 'Email professionnel'} icon={<Mail size={18} strokeWidth={1.9} />}>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={isEn ? 'you@company.com' : 'vous@entreprise.com'}
              autoComplete="email"
              aria-label={isEn ? 'Work email' : 'Email professionnel'}
            />
          </AuthField>

          <AuthField id="login-password" label={isEn ? 'Password' : 'Mot de passe'} icon={<LockKeyhole size={18} strokeWidth={1.9} />} className="auth-field--password">
            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={isEn ? 'Your password' : 'Votre mot de passe'}
                autoComplete="current-password"
                aria-label={isEn ? 'Password' : 'Mot de passe'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-controls="login-password"
                aria-label={showPassword ? (isEn ? 'Hide password' : 'Masquer le mot de passe') : (isEn ? 'Show password' : 'Afficher le mot de passe')}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.9} aria-hidden="true" />}
              </button>
            </div>
          </AuthField>

          <button type="submit" className="btn-primary wide" disabled={loading}>
            {loading ? (isEn ? 'Signing in...' : 'Connexion...') : (isEn ? 'Log in' : 'Se connecter')}
          </button>

          {message ? <p className="form-error">{message}</p> : null}

          {needsVerificationResend ? (
            <>
              <button
                type="button"
                className="btn-secondary wide"
                onClick={onResendVerification}
                disabled={resendStatus === 'sending'}
              >
                {resendStatus === 'sending' ? (isEn ? 'Sending...' : 'Envoi...') : (isEn ? 'Resend verification link' : 'Renvoyer le lien de verification')}
              </button>
              {resendStatus !== 'idle' ? (
                <p className={resendStatus === 'error' ? 'form-error' : 'form-help'}>{resendMessage}</p>
              ) : null}
            </>
          ) : null}

          <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link href={withLocalePath('/forgot-password')} className="form-help">{isEn ? 'Forgot password?' : 'Mot de passe oublié ?'}</Link>
          </p>
        </form>
        </AuthCard>
      </div>
    </main>
  );
}

