"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react';
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
  readOAuthCallbackFromLocation,
  registerUser,
  resolveConnectedUserId,
} from '@/lib/auth';

export default function SignupForm() {
  const microsoftLoginEnabled = String(process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED || 'false').toLowerCase() === 'true';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
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
      posthog.capture('signup_oauth', {
        provider: oauth.provider || 'unknown',
        source: 'frontend',
      });
    } catch {
      // no-op
    }
    trackGtmEvent('signup_oauth', { provider: oauth.provider || 'unknown' });

    const connectedUserId = resolveConnectedUserId(oauth.user);
    const redirect = getRedirectPath(oauth.user.role, '', connectedUserId);
    window.location.href = redirect;
  }, []);

  function startOAuth(provider) {
    const url = getOAuthStartUrl(provider, '/signup');
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

    const f = firstName.trim();
    const l = lastName.trim();
    const e = email.trim().toLowerCase();

    if (!f || !l || !e || !password) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const { res, data, text } = await registerUser({
        email: e,
        password,
        first_name: f,
        last_name: l,
      });

      if (res.status === 201) {
        setDone(true);
        setMessage('Votre compte a bien été créé. Un email de confirmation vous a été envoyé. Cliquez sur le lien dans cet email pour activer votre compte.');
        return;
      }

      if (res.status === 409) {
        setMessage('Cet email est deja utilise.');
        return;
      }

      setMessage(data?.message || data?.error || text || 'Une erreur est survenue. Veuillez réessayer.');
    } catch {
      setMessage('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-page auth-page--split">
      <AuthShowcase
        title="Lancez des challenges collaboratifs en temps reel."
        description="Creez votre espace TeamBlender pour animer des experiences collaboratives, suivre les equipes et centraliser votre facilitation." 
        highlights={[
          { title: 'Setup rapide', text: 'Créez votre compte, configurez vos sessions et commencez sans parcours lourd.' },
          { title: 'Corporate ready', text: 'Une experience sobre, claire et credible pour managers, RH et facilitateurs.' },
          { title: 'Realtime by design', text: 'Des interfaces pensees pour l animation de groupes et la collaboration en direct.' },
        ]}
        stats={[]}
      />

      <AuthCard
        title="Créer un compte TeamBlender"
        brand={<Link href="/" className="auth-card-brand-link" aria-label="Retour a l accueil TeamBlender"><Logo size="compact" /></Link>}
        footer={<span>Déjà un compte ? <Link href="/login">Se connecter</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>{message}</p>
            <Link href="/login" className="btn-secondary wide">Retour à la connexion</Link>
          </div>
        ) : (
          <>
            <AuthSocialButtons
              loading={loading}
              loadingProvider={oauthLoadingProvider}
              microsoftEnabled={microsoftLoginEnabled}
              onProviderClick={(provider) => startOAuth(provider)}
            />

            <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <input type="text" name="fake_signup_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <input type="password" name="fake_signup_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <div className="auth-field-grid">
              <AuthField id="signup-first-name" label="Prenom" icon={<User size={18} strokeWidth={1.9} />}>
                <input id="signup-first-name" type="text" name="signup_first_name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Votre prenom" aria-label="Prenom" />
              </AuthField>

              <AuthField id="signup-last-name" label="Nom" icon={<User size={18} strokeWidth={1.9} />}>
                <input id="signup-last-name" type="text" name="signup_last_name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Votre nom" aria-label="Nom" />
              </AuthField>
            </div>

            <AuthField id="signup-email" label="Email professionnel" icon={<Mail size={18} strokeWidth={1.9} />}>
              <input id="signup-email" type="email" name="signup_email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@entreprise.com" aria-label="Email professionnel" />
            </AuthField>

            <AuthField id="signup-password" label="Mot de passe" icon={<LockKeyhole size={18} strokeWidth={1.9} />} className="auth-field--password">
              <div className="password-input-wrap">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  name="signup_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 caracteres"
                  aria-label="Mot de passe"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-controls="signup-password"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.9} aria-hidden="true" />}
                </button>
              </div>
            </AuthField>

            <button type="submit" className="btn-primary wide" disabled={loading}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            {message ? <p className="form-error">{message}</p> : null}
            </form>
          </>
        )}
      </AuthCard>
    </main>
  );
}

