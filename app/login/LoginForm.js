"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AuthField from '@/components/AuthField';
import AuthShowcase from '@/components/AuthShowcase';
import AuthSocialButtons from '@/components/AuthSocialButtons';
import Logo from '@/components/Logo';
import posthog from 'posthog-js';
import { trackGtmEvent, trackProductUserEvent } from '@/lib/analytics';
import {
  clearOAuthCallbackParamsFromUrl,
  ensureCsrfToken,
  getOAuthStartUrl,
  getRedirectPath,
  joinParticipantInstant,
  loginWithFallback,
  readOAuthCallbackFromLocation,
  resendVerification,
  resolveConnectedUserId,
  setStoredAuthSession,
  shouldStoreParticipantTargetSession
} from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

function looksLikeEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function errorMessage(resStatus, data, isEn) {
  if (data?.code === 'ACCOUNT_PENDING') return isEn ? 'Your account is pending admin approval.' : 'Votre compte est en attente de validation par un administrateur.';
  if (data?.code === 'ACCOUNT_REJECTED') return isEn ? 'Your account request was rejected. Contact an administrator.' : 'Votre demande de compte a été refusée. Contactez un administrateur.';
  if (data?.code === 'ACCOUNT_DISABLED') return isEn ? 'This account has been disabled. Contact an administrator.' : 'Ce compte a été désactivé. Contactez un administrateur.';
  if (data?.code === 'EMAIL_NOT_VERIFIED') return isEn ? 'Please verify your email before logging in. Check your inbox and spam folder.' : 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte mail (et les spams).';
  if (resStatus === 401) return isEn ? 'Invalid email or password.' : 'Email ou mot de passe invalide.';
  return data?.error || (isEn ? 'Something went wrong. Please try again.' : 'Une erreur est survenue. Veuillez réessayer.');
}

export default function LoginForm({ requestedSessionId = '', requestedInviteToken = '' }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const normalizedRequestedSessionId = useMemo(() => String(requestedSessionId || '').trim(), [requestedSessionId]);
  const microsoftLoginEnabled = String(process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED || 'false').toLowerCase() === 'true';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAuthScope, setLastAuthScope] = useState('user');
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState('');
  const [needsVerificationResend, setNeedsVerificationResend] = useState(false);
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [joinSessionCode, setJoinSessionCode] = useState('');
  const [joinFirstName, setJoinFirstName] = useState('');
  const [joinLastName, setJoinLastName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [scannerSupported, setScannerSupported] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const normalizedRequestedInviteToken = useMemo(() => String(requestedInviteToken || '').trim(), [requestedInviteToken]);

  const normalizedIdentifier = useMemo(() => identifier.trim(), [identifier]);
  const identifierIsEmail = useMemo(() => looksLikeEmail(normalizedIdentifier), [normalizedIdentifier]);
  const showIdentifierStatus = identifierTouched && normalizedIdentifier.length > 0;
  const identifierStatusLabel = identifierIsEmail
    ? (isEn ? 'Email format looks valid' : 'Le format de l’email est valide')
    : (isEn ? 'Participant alias login enabled' : 'Connexion participant par identifiant activee');

  useEffect(() => {
    ensureCsrfToken().catch(() => {});
  }, []);

  useEffect(() => {
    const hasScanner = typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && 'mediaDevices' in navigator
      && typeof window.BarcodeDetector !== 'undefined';
    setScannerSupported(Boolean(hasScanner));
  }, []);

  useEffect(() => {
    if (!normalizedRequestedInviteToken) return;
    setJoinMessage(isEn ? 'Secure invitation detected. Complete your participant details to join.' : 'Invitation detectee. Completez vos informations pour rejoindre la session.');
  }, [isEn, normalizedRequestedInviteToken]);

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

    setStoredAuthSession({
      token: oauth.token,
      user: oauth.user,
      targetSessionId: shouldStoreParticipantTargetSession(oauth.user?.role, normalizedRequestedSessionId),
    });

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

    trackProductUserEvent('oauth_login_success', {
      provider: oauth.provider || 'unknown',
      authMethod: 'oauth',
      userId: resolveConnectedUserId(oauth.user),
      sessionId: normalizedRequestedSessionId || undefined,
      surface: 'login',
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

    if (!normalizedIdentifier || !password) {
      setMessage(isEn ? 'Please fill in all fields.' : 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      const allowParticipantFallback = true;
      const { response, data, authScope } = await loginWithFallback(normalizedIdentifier, password, { allowParticipantFallback });
      setLastAuthScope(authScope || 'user');
      if (response.ok) {
        const token = String(data?.token || '').trim();
        const user = data?.user || null;

        if (!token || !user) {
          setMessage(isEn ? 'Invalid login response. Please try again.' : 'Réponse de connexion invalide. Veuillez réessayer.');
          return;
        }

        const connectedUserId = resolveConnectedUserId(user);
        setStoredAuthSession({
          token,
          user,
          targetSessionId: shouldStoreParticipantTargetSession(user.role, normalizedRequestedSessionId),
        });

        const redirect = withLocalePath(getRedirectPath(user.role, normalizedRequestedSessionId, connectedUserId));
        trackProductUserEvent('login_success', {
          authMethod: 'password',
          userId: connectedUserId,
          sessionId: normalizedRequestedSessionId || undefined,
          surface: 'login',
        });
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
    const normalizedEmail = identifier.trim().toLowerCase();
    if (!normalizedEmail || !looksLikeEmail(normalizedEmail)) {
      setResendStatus('error');
      setResendMessage(isEn ? 'Enter a valid email to resend the link.' : 'Saisissez un email valide pour renvoyer le lien.');
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

  async function onJoinInstant(event) {
    event.preventDefault();
    setJoinMessage('');

    const sessionCode = String(joinSessionCode || '').trim();
    const firstName = String(joinFirstName || '').trim();
    const lastName = String(joinLastName || '').trim();
    const email = String(joinEmail || '').trim();
    const inviteToken = normalizedRequestedInviteToken;

    if ((!sessionCode && !inviteToken) || !firstName) {
      setJoinMessage(isEn ? 'Session access and first name are required.' : 'L acces session et le prenom sont requis.');
      return;
    }

    if (email && !looksLikeEmail(email)) {
      setJoinMessage(isEn ? 'Enter a valid email address.' : 'Saisissez une adresse email valide.');
      return;
    }

    setJoinLoading(true);
    try {
      const { res, data } = await joinParticipantInstant({
        sessionCode,
        inviteToken,
        firstName,
        lastName,
        email,
        nickname: firstName,
      });
      if (!res.ok) {
        setJoinMessage(data?.error || (isEn ? 'Unable to join session right now.' : 'Impossible de rejoindre la session pour le moment.'));
        return;
      }

      const token = String(data?.token || '').trim();
      const user = data?.user || null;
      const resolvedSessionId = String(data?.sessionId || '').trim();
      if (!token || !user) {
        setJoinMessage(isEn ? 'Invalid join response. Please try again.' : 'Reponse de connexion invalide. Veuillez reessayer.');
        return;
      }

      setStoredAuthSession({
        token,
        user,
        targetSessionId: shouldStoreParticipantTargetSession('participant', resolvedSessionId),
      });

      const redirect = withLocalePath(getRedirectPath('participant', resolvedSessionId, resolveConnectedUserId(user)));
      window.location.href = redirect;
    } catch {
      setJoinMessage(isEn ? 'Unable to reach the server. Check your connection.' : 'Impossible de contacter le serveur. Verifiez votre connexion.');
    } finally {
      setJoinLoading(false);
    }
  }

  async function startQrScanner() {
    if (!scannerSupported || scannerActive) return;

    setJoinMessage('');
    setScannerActive(true);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        }
      });

      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const stopStream = () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      const maxAttempts = 180;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const codes = await detector.detect(video);
        if (Array.isArray(codes) && codes.length > 0) {
          const rawValue = String(codes[0]?.rawValue || '').trim();
          if (rawValue) {
            const match = rawValue.match(/(?:sessionCode|session_code|code|session)=([A-Za-z0-9_-]+)/i);
            const extracted = String(match?.[1] || rawValue).trim().toUpperCase();
            setJoinSessionCode(extracted);
            setJoinMessage(isEn ? 'QR code detected. Session code pre-filled.' : 'QR detecte. Code session pre-rempli.');
            stopStream();
            setScannerActive(false);
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      stopStream();
      setJoinMessage(isEn ? 'No QR code detected. Please try again.' : 'Aucun QR detecte. Veuillez reessayer.');
    } catch {
      setJoinMessage(isEn ? 'Camera unavailable or permission denied.' : 'Camera indisponible ou permission refusee.');
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setScannerActive(false);
    }
  }

  return (
    <main className="shell auth-page auth-page--split">
      <AuthShowcase
        title={isEn ? 'Launch collaborative challenges in real time.' : 'Lancez des challenges collaboratifs en temps reel.'}
        description={isEn
            ? 'Access your sessions, run your team activities, and keep clear real-time visibility from a focused professional interface.'
            : 'Retrouvez vos sessions, animez vos equipes et gardez une vision claire du realtime depuis une interface professionnelle et concentree.'}
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
          stacked
          googleLabelOverride={isEn ? 'Continue with Google' : 'Continuer avec Google'}
          separatorLabelOverride={isEn ? 'Or continue with your email address' : 'Ou continuer avec votre adresse email'}
          onProviderClick={(provider) => startOAuth(provider)}
        />

        <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
          <AuthField
            id="login-email"
            label={isEn ? 'Email or participant alias' : 'Email ou identifiant participant'}
            icon={<Mail size={18} strokeWidth={1.9} />}
            after={showIdentifierStatus ? (
              <span className={`auth-input-status${identifierIsEmail ? ' is-valid' : ''}`} aria-label={identifierStatusLabel} title={identifierStatusLabel}>
                <CheckCircle2 size={16} strokeWidth={2} />
              </span>
            ) : null}
          >
            <input
              id="login-email"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setIdentifierTouched(true);
              }}
              onBlur={() => setIdentifierTouched(true)}
              required
              placeholder={isEn ? 'you@company.com or sophie' : 'vous@entreprise.com ou sophie'}
              autoComplete="email"
              aria-label={isEn ? 'Email or participant alias' : 'Email ou identifiant participant'}
              aria-invalid={showIdentifierStatus ? String(false) : undefined}
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

          <button type="submit" className="btn-primary wide login-submit-btn" disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <LoaderCircle className="login-submit-spinner" size={18} strokeWidth={2.2} />
                <span>{isEn ? 'Signing in...' : 'Connexion...'}</span>
              </>
            ) : (
              isEn ? 'Log in' : 'Se connecter'
            )}
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

        <form onSubmit={onJoinInstant} className="auth-form" autoComplete="off" style={{ marginTop: '1.25rem' }}>
          <p className="form-help" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            {isEn ? 'Join a session instantly (participants)' : 'Rejoindre une session instantanement (participants)'}
          </p>
          <AuthField id="join-session-code" label={isEn ? 'Session code' : 'Code session'}>
            <input
              id="join-session-code"
              type="text"
              value={joinSessionCode}
              onChange={(e) => setJoinSessionCode(e.target.value.toUpperCase())}
              placeholder={isEn ? 'AB12' : 'AB12'}
              autoComplete="off"
              disabled={Boolean(normalizedRequestedInviteToken)}
            />
          </AuthField>
          {scannerSupported ? (
            <button
              type="button"
              className="btn-secondary wide"
              onClick={startQrScanner}
              disabled={scannerActive}
              aria-busy={scannerActive}
            >
              {scannerActive
                ? (isEn ? 'Scanning QR...' : 'Scan QR en cours...')
                : (isEn ? 'Scan QR with camera' : 'Scanner le QR avec la camera')}
            </button>
          ) : null}
          <AuthField id="join-first-name" label={isEn ? 'First name' : 'Prenom'}>
            <input
              id="join-first-name"
              type="text"
              value={joinFirstName}
              onChange={(e) => setJoinFirstName(e.target.value)}
              placeholder={isEn ? 'Sophie' : 'Sophie'}
              autoComplete="given-name"
            />
          </AuthField>
          <AuthField id="join-last-name" label={isEn ? 'Last name' : 'Nom'}>
            <input
              id="join-last-name"
              type="text"
              value={joinLastName}
              onChange={(e) => setJoinLastName(e.target.value)}
              placeholder={isEn ? 'Martin' : 'Martin'}
              autoComplete="family-name"
            />
          </AuthField>
          <AuthField id="join-email" label={isEn ? 'Email (optional)' : 'Email (optionnel)'}>
            <input
              id="join-email"
              type="email"
              value={joinEmail}
              onChange={(e) => setJoinEmail(e.target.value)}
              placeholder={isEn ? 'sophie@company.com' : 'sophie@entreprise.com'}
              autoComplete="email"
            />
          </AuthField>
          <button type="submit" className="btn-secondary wide" disabled={joinLoading} aria-busy={joinLoading}>
            {joinLoading ? (isEn ? 'Joining...' : 'Connexion...') : (isEn ? 'Join instantly' : 'Rejoindre maintenant')}
          </button>
          {joinMessage ? <p className="form-error">{joinMessage}</p> : null}
        </form>
        </AuthCard>
      </div>
    </main>
  );
}

